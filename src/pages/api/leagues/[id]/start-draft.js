import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ msg: 'Method not allowed' });
  await dbConnect();

  try {
    const league = await League.findById(req.query.id);
    if (!league) return res.status(404).json({ msg: 'League not found' });
    if (req.user.id !== league.admin.toString()) return res.status(403).json({ msg: 'Admin only' });

    if (!league.draftOrder || league.draftOrder.length === 0) {
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
      league.draftOrder = fullOrder;
    }

    league.draftStarted = true;
    league.lastPickAt = new Date(); 
    await league.save();

    res.status(200).json({ msg: 'Draft started', league });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}
export default auth(handler);