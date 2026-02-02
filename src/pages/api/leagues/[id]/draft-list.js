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
    const league = await League.findById(id)
      .populate('picks.user', 'username') // Populate user details in picks
      .lean();

    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }


    const memberIds = league.members.map(m => m.toString());
    const totalPicks = memberIds.length * 4;

    let draftOrder = [];
    if (Array.isArray(league.draftOrder) && league.draftOrder.length === totalPicks) {
      draftOrder = league.draftOrder.map(uid => uid.toString());
    } else {
      draftOrder = Array.from({ length: totalPicks }, (_, i) => 
        memberIds[i % memberIds.length]
      );
    }

    const picks = (league.picks || []).map(p => ({
      user: p.user?._id?.toString() || p.user?.toString(), 
      golfer: p.golferId, 
      golferName: p.golferName || null,
      pickNo: p.pickNo
    }));

    // 3. Return data
    res.status(200).json({ 
      available: [], 
      picks, 
      draftOrder 
    });

  } catch (err) {
    console.error('Draft List Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);