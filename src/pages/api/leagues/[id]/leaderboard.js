import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import Score from '../../../../models/Score';
import User from '../../../../models/User';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    const league = await League.findById(id)
      .populate('members', 'username')
      .populate('picks.user', 'username')
      .lean();

    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const userMap = {};
    if (league.members) {
      league.members.forEach(u => {
        if (u && u._id) {
          userMap[u._id.toString()] = u.username;
        }
      });
    }

    const picksByUser = {};
    if (league.picks) {
      league.picks.forEach(pick => {
        const uid = pick.user?._id?.toString() || pick.user?.toString();
        if (!uid) return;

        if (!picksByUser[uid]) picksByUser[uid] = [];
        picksByUser[uid].push({
          golferId: pick.golferId,
          name:     pick.golferName
        });
      });
    }

    const allGolferIds = (league.picks || []).map(p => p.golferId);

    let scoreDocs = [];
    if (allGolferIds.length > 0) {
      scoreDocs = await Score.find({
        league: id,
        golferId: { $in: allGolferIds }
      }).lean();
    }

    const scoreMap = scoreDocs.reduce((map, doc) => {
      map[doc.golferId] = { strokes: doc.strokes, status: doc.status, capped: doc.capped };
      return map;
    }, {});

    const standings = Object.entries(picksByUser).map(([uid, picks]) => {
      const totalStrokes = picks.reduce((sum, p) => {
        const data = scoreMap[p.golferId];
        const s = data ? data.strokes : 0;
        return sum + (typeof s === 'number' ? s : 0);
      }, 0);

      return {
        userId:       uid,
        username:     userMap[uid] || 'Unknown',
        totalStrokes,
        picks: picks.map(p => {
          const data = scoreMap[p.golferId];
          return {
            golferId: p.golferId,
            name:     p.name,
            strokes:  data?.strokes ?? '—',
            status:   data?.status,
            capped:   data?.capped ?? false,
          };
        })
      };
    })
    .sort((a, b) => a.totalStrokes - b.totalStrokes);

    res.status(200).json({ standings });
  } catch (err) {
    console.error('Leaderboard Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);