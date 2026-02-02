import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import auth from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    const league = await League.findById(id);

    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const initialLength = league.members.length;
    league.members = league.members.filter(
      (memberId) => memberId.toString() !== req.user.id
    );

    if (league.members.length === initialLength) {
      return res.status(400).json({ msg: 'User not in this league' });
    }

    if (league.members.length === 0) {
      await League.findByIdAndDelete(id);
      return res.json({ msg: 'League deleted (empty)' });
    }

    await league.save();
    res.json({ msg: 'Left league successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

export default auth(handler);