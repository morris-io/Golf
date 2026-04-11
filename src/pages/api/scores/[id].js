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
    let scores = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ESPN API returned status: ${response.status}`);
      }

      const data = await response.json();
      const event        = data.events?.[0];
      const competition  = event?.competitions?.[0];
      const comps        = competition?.competitors || [];
      const tournament   = event?.tournament;

      const rawCut = tournament?.cutScore;

      scores = golferIds.map(gid => {
        const c = comps.find(cmp => cmp.athlete.id.toString() === gid.toString());

        const stat = c?.statistics?.find(s => s.name === 'scoreToPar');
        let toPar = null;
        if (stat && typeof stat.value === 'number') {
          toPar = stat.value;
        } else if (c?.score?.displayValue) {
          if (c.score.displayValue === 'E') {
            toPar = 0;
          } else {
            const val = parseInt(c.score.displayValue, 10);
            if (!isNaN(val)) toPar = val;
          }
        }

        const statusName = c?.status?.type?.name;

        let finalStrokes = toPar;
        let capped = false;

        if (typeof rawCut === 'number') {
          const missedCutOrWd = statusName === 'STATUS_CUT' || statusName === 'STATUS_WD';

<<<<<<< HEAD
          // Cap the score at the cutline if they missed the cut/WD, 
          // OR if they made the cut but are currently shooting worse than the cutline.
          if (missedCutOrWd || (toPar !== null && toPar > rawCut)) {
=======
          if (missedCutOrWd && toPar !== null && toPar > rawCut) {
>>>>>>> 1a19f3112fb6e317808ad35924b71b52da9da96e
            finalStrokes = rawCut;
            capped = true;
          } else {
            finalStrokes = toPar;
            capped = false;
          }
        }

        return { golferId: gid, strokes: finalStrokes, status: statusName, capped };
      });
    

      if (event?.status?.type?.name === 'STATUS_FINAL') {
        const host     = req.headers.host;
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        fetch(`${protocol}://${host}/api/tournaments/save-results`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': req.headers.authorization,
          },
        }).catch(err => {
          console.warn('save-results background call failed:', err.message);
        });
      }

    } catch (fetchError) {
      console.warn('Warning: Skipped score update due to external API error:', fetchError.message);
    }

    if (scores.length > 0) {
      const overrides = await Score.find(
        { league: id, manualOverride: true },
        { golferId: 1 }
      ).lean();
      const overriddenIds = new Set(overrides.map(o => o.golferId));
    
      const bulk = scores
        .filter(s => !overriddenIds.has(s.golferId))
        .map(s => ({
          updateOne: {
            filter: { golferId: s.golferId, league: id },
            update: {
              $set: {
                strokes: s.strokes,
                status:  s.status,
                capped:  s.capped,
                lastUpdated: new Date()
              }
            },
            upsert: true,
          },
        }));
    
      if (bulk.length > 0) await Score.bulkWrite(bulk);
    }

    res.status(200).json({ scores });
  } catch (err) {
    console.error('Scores Critical Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);