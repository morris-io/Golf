const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const GolferSchema = new mongoose.Schema({
  golferId:            { type: Number, required: true, unique: true },
  displayName:         { type: String, required: true },
  countryAbbreviation: { type: String, default: null },
  stateAbbreviation:   { type: String, default: null },
}, { timestamps: true });

const TournamentResultSchema = new mongoose.Schema({
  tournamentId:   { type: String, required: true },
  tournamentName: { type: String, required: true },
  golferId:       { type: Number, required: true },
  golferName:     { type: String, required: true },
  position:       { type: String, default: null },
  scoreToPar:     { type: Number, default: null },
  cut:            { type: Boolean, default: false },
  savedAt:        { type: Date,   default: Date.now },
}, { timestamps: true });

TournamentResultSchema.index({ tournamentId: 1, golferId: 1 }, { unique: true });

const Golfer = mongoose.models.Golfer
  || mongoose.model('Golfer', GolferSchema);

const TournamentResult = mongoose.models.TournamentResult
  || mongoose.model('TournamentResult', TournamentResultSchema);

function makeTournamentId(name, season) {
  const key = `${season}__${name.toLowerCase().replace(/\s+/g, '_')}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return `hist_${hash}`;
}

function makeGolferId(name) {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash) + name.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return hash + 10_000_000;
}

function parseScore(raw) {
  if (!raw || raw === 'CUT' || raw === 'WD' || raw === 'DQ' || raw === '--') return null;
  if (raw === 'E') return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

async function main() {
  const tsvPath = process.argv[2];
  if (!tsvPath) {
    console.error('Usage: node seed-historical.js <path-to-tsv>');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found. Make sure .env.local exists with MONGO_URI set.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI, { bufferCommands: false });
  console.log('Connected.\n');

  const rl = readline.createInterface({
    input: fs.createReadStream(path.resolve(tsvPath)),
    crlfDelay: Infinity,
  });

  let lineNum      = 0;
  let golferBatch  = [];
  let resultBatch  = [];
  const BATCH_SIZE = 500;
  let totalResults = 0;
  const totalGolfers = new Set();
  const seenGolfers  = new Set();

  const flushBatches = async () => {
    if (golferBatch.length > 0) {
      await Golfer.bulkWrite(golferBatch, { ordered: false });
      golferBatch = [];
    }
    if (resultBatch.length > 0) {
      await TournamentResult.bulkWrite(resultBatch, { ordered: false });
      totalResults += resultBatch.length;
      resultBatch = [];
    }
  };

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; 

    const cols = line.split('\t');
    if (cols.length < 8) continue;

    const [season, start, , tournament, , position, name, score] = cols;

    if (!name || !tournament || !season) continue;

    const isCut    = position === 'CUT';
    const golferId = makeGolferId(name);
    const tournamentId = makeTournamentId(tournament, season);
    const scoreToPar   = parseScore(score);

    if (!seenGolfers.has(golferId)) {
      seenGolfers.add(golferId);
      totalGolfers.add(golferId);
      golferBatch.push({
        updateOne: {
          filter: { golferId },
          update: {
            $setOnInsert: {
              golferId,
              displayName:         name,
              countryAbbreviation: null,
              stateAbbreviation:   null,
            },
          },
          upsert: true,
        },
      });
    }

    resultBatch.push({
      updateOne: {
        filter: { tournamentId, golferId },
        update: {
          $set: {
            golferName:     name,
            tournamentName: tournament,
            position:       position || null,
            scoreToPar,
            cut:            isCut,
            savedAt:        new Date(start || Date.now()),
          },
        },
        upsert: true,
      },
    });

    if (resultBatch.length >= BATCH_SIZE) {
      await flushBatches();
      process.stdout.write(`\rProcessed ${lineNum.toLocaleString()} rows…`);
    }
  }

  await flushBatches();

  console.log(`\n\nDone!`);
  console.log(`  Rows processed:     ${(lineNum - 1).toLocaleString()}`);
  console.log(`  Unique golfers:     ${totalGolfers.size.toLocaleString()}`);
  console.log(`  Tournament results: ${totalResults.toLocaleString()}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});