import dbConnect from '../../../lib/dbConnect';
import Cache from '../../../models/Cache';
import { getLeaderboard } from '../../../services/sportContentApiFree';

const CACHE_KEY = 'golf_current_field';
const CACHE_TTL = 300000; 

export async function getFieldWithRanks() {
  const overviewRes = await fetch('http://sports.core.api.espn.com/v2/sports/golf/leagues/all/seasons/2026/rankings/1?lang=en&region=us');
  const overviewData = await overviewRes.json();
  
  const latestDateUrl = overviewData.rankings?.[0]?.$ref;
  
  const rankMap = {};
  if (latestDateUrl) {
    const detailRes = await fetch(latestDateUrl);
    const detailData = await detailRes.json();
    
    if (detailData.ranks) {
      detailData.ranks.forEach(item => {
        const idParts = item.athlete.$ref.split('/');
        const id = idParts[idParts.length - 1].split('?')[0];
        rankMap[id] = item.current;
      });
    }
  }

  const lb = await getLeaderboard();
  const event = lb.events?.[0];
  const competitors = event?.competitions?.[0]?.competitors || [];

  const field = competitors.map(c => {
    const athleteId = c.athlete.id.toString();
    return {
      id: athleteId,
      name: c.athlete.displayName,
      rank: rankMap[athleteId] || 999 
    };
  });

  return { 
    field, 
    tournamentName: event?.tournament?.displayName || event?.name || 'PGA Tournament' 
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ msg: 'Method not allowed' });

  await dbConnect();

  try {
    const cached = await Cache.findOne({ key: CACHE_KEY });
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const data = await getFieldWithRanks();

    await Cache.findOneAndUpdate(
      { key: CACHE_KEY },
      { key: CACHE_KEY, data, fetchedAt: new Date() },
      { upsert: true }
    );

    res.status(200).json(data);
  } catch (err) {
    console.error('2026 Rank Fetch Error:', err.message);

    const stale = await Cache.findOne({ key: CACHE_KEY });
    if (stale) return res.status(200).json(stale.data);

    res.status(500).json({ msg: 'Unable to load ranked tournament data' });
  }
}