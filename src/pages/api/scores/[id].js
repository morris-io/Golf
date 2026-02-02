import dbConnect from '../../../lib/dbConnect';
import League from '../../../models/League';
import Score from '../../../models/Score';
import auth from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    const league = await League.findById(id).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });

    const golferIds = (league.picks || []).map(p => p.golferId);

    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard');
    if (!response.ok) throw new Error('Failed to fetch ESPN data');
    
    const data = await response.json();
    const event = data.events?.[0];
    const comps = event?.competitions?.[0]?.competitors || [];
    const tournament = event?.tournament;

    const rawCut = tournament?.cutScore;
    const cutActive =
      league.cutHandling === 'cap' &&
      typeof rawCut === 'number' &&
      rawCut > 0 &&
      Boolean(tournament?.cutComplete);
    const cutScore = cutActive ? rawCut : null;

    const scores = golferIds.map(gid => {
      const c = comps.find(cmp => cmp.athlete.id.toString() === gid.toString());
      
      const stat = c?.statistics?.find(s => s.name === 'scoreToPar');
      
      let toPar = null;
      if (stat && typeof stat.value === 'number') {
        toPar = stat.value;
      } else if (c?.score?.displayValue) {
        const val = parseInt(c.score.displayValue, 10);
        if (!isNaN(val)) toPar = val;
        if (c.score.displayValue === 'E') toPar = 0;
      }

      let finalStrokes = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        finalStrokes = cutScore;
      }

      return { golferId: gid, strokes: finalStrokes };
    });

    if (scores.length > 0) {
      const bulk = scores.map(s => ({
        updateOne: {
          filter: { golferId: s.golferId, league: id }, 
          update: { 
            $set: { 
              strokes: s.strokes, 
              lastUpdated: new Date() 
            } 
          },
          upsert: true,
        },
      }));
      await Score.bulkWrite(bulk);
    }

    res.status(200).json({ scores });
  } catch (err) {
    console.error('Scores Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);