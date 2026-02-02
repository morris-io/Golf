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
    const league = await League.findById(id).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });

    const myPicks = (league.picks || []).filter(p =>
      p.user.toString() === req.user.id
    );

    const golferIds = myPicks.map(p => p.golferId);
    
    const scoreDocs = await Score.find({ golferId: { $in: golferIds } }).lean();

    const team = myPicks.map(pick => {
      const doc = scoreDocs.find(s => s.golferId === pick.golferId);
      return {
        golferId:   pick.golferId,
        golferName: pick.golferName,
        pickNo:     pick.pickNo,
        strokes:    doc?.strokes ?? null
      };
    });

    const userDoc = await User.findById(req.user.id).select('username');

    res.status(200).json({ 
      user: userDoc ? userDoc.username : 'User', 
      team 
    });
  } catch (err) {
    console.error('Team Fetch Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);