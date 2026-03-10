import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    const league = await League.findById(id).populate('picks.user', 'username');

    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const maxPicks = league.members.length * 4;
    const isLeagueFull = league.members.length >= (league.teamCount || 0);

    if (isLeagueFull && (!league.draftOrder || league.draftOrder.length < maxPicks)) {
      let memberIds = league.members.map(m => m.toString());

      for (let i = memberIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [memberIds[i], memberIds[j]] = [memberIds[j], memberIds[i]];
      }

      let fullOrder = [];
      for (let round = 0; round < 4; round++) {
        const roundOrder = (round % 2 === 0) ? [...memberIds] : [...memberIds].reverse();
        fullOrder = fullOrder.concat(roundOrder);
      }

      league.draftOrder = fullOrder;
      await league.save(); 
    }

    const draftOrder = (league.draftOrder || []).map(uid => uid.toString());
    const picks = (league.picks || []).map(p => ({
      user: p.user?._id?.toString() || p.user?.toString(),
      golfer: p.golferId,
      golferName: p.golferName || null,
      pickNo: p.pickNo
    }));

    res.status(200).json({ 
      picks, 
      draftOrder 
    });

  } catch (err) {
    console.error('Draft List Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);