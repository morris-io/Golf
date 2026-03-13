import dbConnect from '../../../../lib/dbConnect';
import TournamentResult from '../../../../models/TournamentResult';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ msg: 'Method not allowed' });

  const { id, tournament } = req.query;
  if (!id || !tournament) return res.status(400).json({ results: [] });

  await dbConnect();

  try {
    // Extract core name — strip year and common suffixes for fuzzy matching
    const coreName = tournament
      .replace(/\d{4}/g, '')
      .replace(/presented by.*/i, '')
      .replace(/sponsored by.*/i, '')
      .trim();

    const results = await TournamentResult.find({
      golferId: Number(id),
      tournamentName: { $regex: coreName, $options: 'i' },
    })
      .sort({ savedAt: -1 })
      .lean();

    return res.status(200).json({
      results: results.map(r => ({
        tournamentName: r.tournamentName,
        position: r.position,
        scoreToPar: r.scoreToPar,
        cut: r.cut,
        savedAt: r.savedAt,
      })),
    });
  } catch (err) {
    console.error('Tournament history error:', err);
    return res.status(200).json({ results: [] });
  }
}