import { getLeaderboard } from '../../../services/sportContentApiFree';

let cacheData = null;
let cacheAt = 0;
const CACHE_TTL = 60 * 60 * 1000; 

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    
    if (cacheData && now - cacheAt < CACHE_TTL) {
       return res.status(200).json(cacheData);
    }

    const lb = await getLeaderboard();
    const event = lb.events?.[0];
    
    const tournamentName = event?.tournament?.displayName || event?.name || 'PGA Tournament';
    
    const competitors = event?.competitions?.[0]?.competitors || [];

    const field = competitors.map(c => ({
      id: c.athlete.id.toString(),
      name: c.athlete.displayName || c.athlete.shortName || c.athlete.fullName,
    }));

    cacheData = { field, tournamentName };
    cacheAt = now;

    res.status(200).json(cacheData);
  } catch (err) {
    console.error('ESPN fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament data' });
  }
}