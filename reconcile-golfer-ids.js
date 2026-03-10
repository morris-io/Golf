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

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-''.]/g, ' ')
    .replace(/\b(Jr|Sr|II|III|IV)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}


async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI, { bufferCommands: false });
  console.log('Connected.\n');

  console.log('Fetching ESPN leaderboard…');
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard');
  if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
  const data = await res.json();

  const competitors = data.events?.[0]?.competitions?.[0]?.competitors || [];
  if (competitors.length === 0) {
    console.error('No competitors found in ESPN response');
    process.exit(1);
  }

  console.log(`Found ${competitors.length} players in ESPN leaderboard.\n`);

  const espnMap = new Map();
  for (const c of competitors) {
    const espnId      = Number(c.athlete.id);
    const displayName = c.athlete.displayName;
    const country     = c.athlete.birthPlace?.countryAbbreviation ?? null;
    const state       = c.athlete.birthPlace?.stateAbbreviation   ?? null;
    const normalized  = normalizeName(displayName);
    espnMap.set(normalized, { espnId, displayName, country, state });
  }

  const historicalGolfers = await Golfer.find({ golferId: { $gte: 10_000_000 } }).lean();
  console.log(`Found ${historicalGolfers.length} historical golfer records to reconcile.\n`);

  let matched   = 0;
  let unmatched = 0;
  const unmatchedNames = [];

  for (const golfer of historicalGolfers) {
    const normalized = normalizeName(golfer.displayName);
    const espn       = espnMap.get(normalized);

    if (!espn) {
      unmatched++;
      unmatchedNames.push(golfer.displayName);
      continue;
    }

    const oldId = golfer.golferId;
    const newId = espn.espnId;

    if (oldId === newId) continue; 

    const resultUpdate = await TournamentResult.updateMany(
      { golferId: oldId },
      { $set: { golferId: newId, golferName: espn.displayName } }
    );

    await Golfer.findOneAndUpdate(
      { golferId: newId },
      {
        $set:         { displayName: espn.displayName },
        $setOnInsert: {
          golferId:            newId,
          countryAbbreviation: espn.country,
          stateAbbreviation:   espn.state,
        },
      },
      { upsert: true }
    );

    await Golfer.deleteOne({ golferId: oldId });

    matched++;
    console.log(`✓ ${golfer.displayName} → ESPN ID ${newId} (${resultUpdate.modifiedCount} results updated)`);
  }

  console.log(`\n── Summary ──────────────────────────────────`);
  console.log(`  Matched and updated: ${matched}`);
  console.log(`  No ESPN match found: ${unmatched}`);

  if (unmatchedNames.length > 0) {
    console.log(`\n  Unmatched players (retired/not in current field):`);
    unmatchedNames.slice(0, 20).forEach(n => console.log(`    - ${n}`));
    if (unmatchedNames.length > 20) {
      console.log(`    … and ${unmatchedNames.length - 20} more`);
    }
  }

  console.log(`\nReconciliation complete.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});