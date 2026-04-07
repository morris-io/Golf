import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function getRankedField() {
  try {
    const overviewRes = await fetch('https://sports.core.api.espn.com/v2/sports/golf/leagues/all/seasons/2026/rankings/1?lang=en&region=us');
    const overviewData = await overviewRes.json();
    const latestDateUrl = overviewData.rankings?.[0]?.$ref?.replace('http://', 'https://');

    const rankMap = {};
    if (latestDateUrl) {
      const dRes = await fetch(latestDateUrl);
      const dData = await dRes.json();
      dData.ranks?.forEach(item => {
        const id = item.athlete.$ref.split('/').pop().split('?')[0];
        rankMap[id] = item.current;
      });
    }

    const lbRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard');
    const lb = await lbRes.json();
    const competitors = lb.events?.[0]?.competitions?.[0]?.competitors || [];

    return competitors.map(c => ({
      id: c.athlete.id.toString(),
      name: c.athlete.displayName,
      rank: rankMap[c.athlete.id.toString()] || 999
    }));
  } catch (err) {
    console.error('--- AUTO-PICK FIELD FETCH FAILED ---', err.message);
    return [];
  }
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ msg: 'Method not allowed' });
  await dbConnect();
  const { id } = req.query;

  try {
    let league = await League.findById(id).populate('picks.user', 'username');
    if (!league) return res.status(404).json({ msg: 'League not found' });

    const maxPicks = (league.members?.length || 0) * 4;
    const isLeagueFull = league.members?.length >= (league.teamCount || 0);

    if (isLeagueFull && (!league.draftOrder || league.draftOrder.length < maxPicks)) {
      let memberIds = league.members.map(m => m.toString());
      for (let i = memberIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [memberIds[i], memberIds[j]] = [memberIds[j], memberIds[i]];
      }
      let fullOrder = [];
      for (let round = 0; round < 4; round++) {
        const roundOrder = round % 2 === 0 ? [...memberIds] : [...memberIds].reverse();
        fullOrder = fullOrder.concat(roundOrder);
      }
      
      await League.updateOne(
        { _id: league._id, $or: [{ draftOrder: { $exists: false } }, { draftOrder: { $size: 0 } }] },
        { $set: { draftOrder: fullOrder } }
      );
      league = await League.findById(id).populate('picks.user', 'username');
    }

    if (league.draftStarted && league.lastPickAt && league.picks.length < (league.draftOrder?.length || 0)) {
      const now = Date.now();
      const lastPickTime = new Date(league.lastPickAt).getTime();
      const secondsElapsed = Math.floor((now - lastPickTime) / 1000);

      if (secondsElapsed >= 179) {
        const currentPickIndex = league.picks.length; 
        const field = await getRankedField();
        const pickedIds = new Set(league.picks.map(p => p.golferId.toString()));
        
        const bestAvailable = field
          .filter(g => !pickedIds.has(g.id))
          .sort((a, b) => (a.rank || 999) - (b.rank || 999))[0];

        if (bestAvailable) {
          const currentPickerId = league.draftOrder[currentPickIndex];
          
          const newPick = {
            user: currentPickerId,
            golferId: Number(bestAvailable.id),
            golferName: bestAvailable.name,
            pickNo: currentPickIndex + 1
          };

          const result = await League.findOneAndUpdate(
            { 
              _id: id, 
              picks: { $size: currentPickIndex }, 
              "picks.golferId": { $ne: newPick.golferId } 
            },
            { 
              $push: { picks: newPick },
              $set: { lastPickAt: new Date() }
            },
            { new: true }
          ).populate('picks.user', 'username');

          if (result) {
            console.log(`[Success] Atomic Auto-pick: ${bestAvailable.name} for slot ${currentPickIndex + 1}`);
            league = result;
          } else {
            console.log(`[Blocked] Race condition prevented duplicate pick for slot ${currentPickIndex + 1}`);
            league = await League.findById(id).populate('picks.user', 'username');
          }
        }
      }
    }

    const picks = (league.picks || []).map(p => ({
      user: p.user?._id?.toString() || p.user?.toString(),
      golfer: p.golferId,
      golferName: p.golferName || null,
      pickNo: p.pickNo
    }));

    res.status(200).json({ 
      picks, 
      draftOrder: (league.draftOrder || []).map(uid => uid.toString()),
      draftStarted: league.draftStarted,
      lastPickAt: league.lastPickAt 
    });

  } catch (err) {
    console.error('Draft List Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);