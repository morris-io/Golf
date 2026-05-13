import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ msg: 'Method not allowed' });
  await dbConnect();

  try {
    const league = await League.findById(req.query.id);
    if (!league) return res.status(404).json({ msg: 'League not found' });
    if (req.user.id !== league.admin.toString())
      return res.status(403).json({ msg: 'Admin only' });

    const { scheduledDraftTime } = req.body;
    league.scheduledDraftTime = scheduledDraftTime ? new Date(scheduledDraftTime) : null;
    await league.save();

    res.status(200).json({ scheduledDraftTime: league.scheduledDraftTime });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);