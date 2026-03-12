import dbConnect from '../../../lib/dbConnect';
import Cache from '../../../models/Cache';
import { getLeaderboard } from '../../../services/sportContentApiFree';

const CACHE_KEY = 'golf_current_field';
const CACHE_TTL = 60 * 60 * 1000; 

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const cached = await Cache.findOne({ key: CACHE_KEY });
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const lb = await getLeaderboard();
    const event = lb.events?.[0];
    const tournamentName = event?.tournament?.displayName || event?.name || 'PGA Tournament';
    const competitors = event?.competitions?.[0]?.competitors || [];

    const WITHDRAWN_STATUSES = ['STATUS_WITHDRAWN', 'STATUS_DISQUALIFIED'];
    const field = competitors
      .filter(c => !WITHDRAWN_STATUSES.includes(c.status?.type?.name))
      .map(c => ({
        id:   c.athlete.id.toString(),
        name: c.athlete.displayName || c.athlete.shortName || c.athlete.fullName,
      }));

    const data = { field, tournamentName };

    await Cache.findOneAndUpdate(
      { key: CACHE_KEY },
      { key: CACHE_KEY, data, fetchedAt: new Date() },
      { upsert: true }
    );

    res.status(200).json(data);
  } catch (err) {
    console.error('ESPN fetch failed:', err.message);

    const stale = await Cache.findOne({ key: CACHE_KEY });
    if (stale) return res.status(200).json(stale.data);

    res.status(500).json({ msg: 'Unable to load tournament data' });
  }
}