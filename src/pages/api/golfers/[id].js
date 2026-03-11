import dbConnect from '../../../lib/dbConnect';
import Golfer from '../../../models/Golfer';
import TournamentResult from '../../../models/TournamentResult';

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-'.]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;
  const numericId = Number(id);

  try {
    let golfer = await Golfer.findOne({ golferId: numericId }).lean();
    let espnDisplayName = null;
    if (!golfer) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(
          'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard',
          { signal: ctrl.signal }
        );
        clearTimeout(t);
        if (r.ok) {
          const data = await r.json();
          const competitors = data.events?.[0]?.competitions?.[0]?.competitors || [];
          const match = competitors.find(
            c => c.athlete?.id?.toString() === id.toString()
          );
          if (match) {
            espnDisplayName = match.athlete.displayName;
            const country = match.athlete.birthPlace?.countryAbbreviation ?? null;
            const state   = match.athlete.birthPlace?.stateAbbreviation   ?? null;

            await Golfer.findOneAndUpdate(
              { golferId: numericId },
              {
                $set:         { displayName: espnDisplayName },
                $setOnInsert: { countryAbbreviation: country, stateAbbreviation: state },
              },
              { upsert: true, new: true }
            );

            golfer = { golferId: numericId, displayName: espnDisplayName, countryAbbreviation: country, stateAbbreviation: state };
          }
        }
      } catch {
      }
    }

    const displayName = golfer?.displayName || espnDisplayName;

    let results = await TournamentResult.find({ golferId: numericId })
      .sort({ savedAt: -1 })
      .lean();

    if (results.length === 0 && displayName) {
      const normalized = normalizeName(displayName);

      const lastName = displayName.split(' ').slice(-1)[0];
      const candidates = await TournamentResult.find({
        golferName: { $regex: lastName, $options: 'i' },
      }).lean();

      const matched = candidates.filter(
        r => normalizeName(r.golferName) === normalized
      );

      if (matched.length > 0) {
        const oldGolferId = matched[0].golferId;
        if (oldGolferId !== numericId) {
          await TournamentResult.updateMany(
            { golferId: oldGolferId, golferName: matched[0].golferName },
            { $set: { golferId: numericId } }
          );
          await Golfer.deleteOne({ golferId: oldGolferId });
        }
        results = matched.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      }
    }

    const finalName =
      displayName ||
      results[0]?.golferName ||
      'Unknown Player';

    return res.status(200).json({
      golferId:            numericId,
      displayName:         finalName,
      countryAbbreviation: golfer?.countryAbbreviation ?? null,
      stateAbbreviation:   golfer?.stateAbbreviation   ?? null,
      results: results.map(r => ({
        tournamentName: r.tournamentName,
        position:       r.position,
        scoreToPar:     r.scoreToPar,
        cut:            r.cut,
        savedAt:        r.savedAt,
      })),
    });
  } catch (err) {
    console.error('Golfer profile error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}