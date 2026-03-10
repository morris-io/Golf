import dbConnect from '../../../lib/dbConnect';
import Golfer from '../../../models/Golfer';
import TournamentResult from '../../../models/TournamentResult';
import auth from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ESPN API returned status: ${response.status}`);
    }

    const data = await response.json();
    const event       = data.events?.[0];
    const competition = event?.competitions?.[0];
    const competitors = competition?.competitors || [];
    const tournament  = event?.tournament;

    if (!event || !tournament) {
      return res.status(400).json({ msg: 'No tournament data available' });
    }

    const statusName = event.status?.type?.name;
    if (statusName !== 'STATUS_FINAL') {
      return res.status(200).json({ msg: 'Tournament not yet final, nothing saved', status: statusName });
    }

    const tournamentId   = event.id;
    const tournamentName = tournament.displayName || event.name;

    const golferBulk = competitors.map(c => {
      const id      = Number(c.athlete.id);
      const country = c.athlete.birthPlace?.countryAbbreviation ?? null;
      const state   = c.athlete.birthPlace?.stateAbbreviation ?? null;

      return {
        updateOne: {
          filter: { golferId: id },
          update: {
            $set:         { displayName: c.athlete.displayName },
            $setOnInsert: { countryAbbreviation: country, stateAbbreviation: state },
          },
          upsert: true,
        },
      };
    });

    if (golferBulk.length > 0) {
      await Golfer.bulkWrite(golferBulk, { ordered: false });
    }

    const resultBulk = competitors.map(c => {
      const golferId   = Number(c.athlete.id);
      const golferName = c.athlete.displayName;
      const position   = c.status?.position?.displayName ?? null;
      const cut        = c.status?.type?.name === 'STATUS_CUT';

      const stat      = c.statistics?.find(s => s.name === 'scoreToPar');
      const scoreToPar = (stat && typeof stat.value === 'number') ? stat.value : null;

      return {
        updateOne: {
          filter: { tournamentId, golferId },
          update: {
            $set: {
              golferName,
              tournamentName,
              position,
              scoreToPar,
              cut,
              savedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (resultBulk.length > 0) {
      await TournamentResult.bulkWrite(resultBulk, { ordered: false });
    }

    return res.status(200).json({
      msg: 'Results saved successfully',
      tournamentId,
      tournamentName,
      golfersProcessed: competitors.length,
    });

  } catch (err) {
    console.error('Save results error:', err);
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
}

export default auth(handler);