import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;
  const { golferId, golferName } = req.body;

  try {
    const league = await League.findById(id);
    if (!league) return res.status(404).json({ msg: 'League not found' });

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
        const roundOrder = round % 2 === 0 ? [...memberIds] : [...memberIds].reverse();
        fullOrder = fullOrder.concat(roundOrder);
      }
    
      await League.findOneAndUpdate(
        { _id: league._id, $or: [{ draftOrder: { $exists: false } }, { draftOrder: { $size: 0 } }] },
        { $set: { draftOrder: fullOrder } }
      );
    
      const fresh = await League.findById(league._id);
      league.draftOrder = fresh.draftOrder;
    }

    if (!league.draftStarted) {
      return res.status(403).json({ msg: 'The draft has not been started by the admin yet.' });
    }

    const pickIndex = league.picks.length;
    if (pickIndex >= maxPicks) return res.status(400).json({ msg: 'Draft complete' });

    const currentPickerId = league.draftOrder[pickIndex].toString();
    if (currentPickerId !== req.user.id) {
      return res.status(403).json({ msg: 'Not your turn' });
    }

    if (league.picks.some(p => p.golferId === golferId)) {
      return res.status(400).json({ msg: 'Golfer already picked' });
    }

    league.picks.push({
      user: req.user.id,
      golferId,
      golferName,
      pickNo: pickIndex + 1
    });

    league.lastPickAt = new Date();

    await league.save();

    res.status(200).json({
      picks: league.picks.map(p => ({
        user: p.user.toString(),
        golfer: p.golferId,
        golferName: p.golferName,
        pickNo: p.pickNo
      })),
      draftOrder: league.draftOrder,
      lastPickAt: league.lastPickAt 
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);