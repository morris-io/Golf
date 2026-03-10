import dbConnect from '../../../lib/dbConnect';
import Golfer from '../../../models/Golfer';
import TournamentResult from '../../../models/TournamentResult';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    const golfer = await Golfer.findOne({ golferId: Number(id) }).lean();

    const results = await TournamentResult.find({ golferId: Number(id) })
      .sort({ savedAt: -1 })
      .lean();

    const displayName = golfer?.displayName
      || results[0]?.golferName
      || 'Unknown Player';

    return res.status(200).json({
      golferId:            Number(id),
      displayName,
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
