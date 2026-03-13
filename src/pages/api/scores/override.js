import dbConnect from '../../../lib/dbConnect';
import Score from '../../../models/Score';
import auth from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ msg: 'Method not allowed' });

  await dbConnect();

  const { leagueId, golferId, strokes, clear } = req.body;

  if (!leagueId || !golferId) {
    return res.status(400).json({ msg: 'leagueId and golferId are required' });
  }

  try {
    if (clear) {
      // Remove the override — ESPN will take over again on next poll
      await Score.findOneAndUpdate(
        { league: leagueId, golferId: Number(golferId) },
        { $set: { manualOverride: false } }
      );
      return res.status(200).json({ msg: 'Override cleared' });
    }

    if (typeof strokes !== 'number') {
      return res.status(400).json({ msg: 'strokes must be a number' });
    }

    await Score.findOneAndUpdate(
      { league: leagueId, golferId: Number(golferId) },
      { $set: { strokes, manualOverride: true, lastUpdated: new Date() } },
      { upsert: true }
    );

    return res.status(200).json({ msg: 'Override set', golferId, strokes });
  } catch (err) {
    console.error('Override error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);