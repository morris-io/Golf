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

      const cutRound       = tournament?.cutRound ?? 2;
      const currentPeriod  = competition?.status?.period ?? 1;
      const cutHasHappened = currentPeriod > cutRound;

      const useCutCap = league.cutHandling === 'cap'
        && typeof rawCut === 'number'
        && cutHasHappened;

      const cutScore = useCutCap ? rawCut : null;

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

        if (useCutCap && toPar !== null) {
          if (statusName !== 'STATUS_CUT' && toPar > cutScore) {
            finalStrokes = cutScore;
            capped = true;
          }
        }

        return { golferId: gid, strokes: finalStrokes, status: statusName, capped };
      });

    } catch (fetchError) {
      console.warn('Warning: Skipped score update due to external API error:', fetchError.message);
    }

    if (scores.length > 0) {
      const bulk = scores.map(s => ({
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
      await Score.bulkWrite(bulk);
    }

    res.status(200).json({ scores });
  } catch (err) {
    console.error('Scores Critical Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);