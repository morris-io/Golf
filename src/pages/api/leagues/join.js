import dbConnect from '../../../lib/dbConnect';
import League from '../../../models/League';
import auth from '../../../lib/auth';
import mongoose from 'mongoose';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  await dbConnect();

  const { leagueId } = req.body; 

  if (!leagueId) {
    return res.status(400).json({ msg: 'Please provide a League Code or ID' });
  }

  try {
    let league;

    if (mongoose.Types.ObjectId.isValid(leagueId)) {
      league = await League.findById(leagueId);
    }

    // 2. If not found, try to find by Code
    if (!league) {
      league = await League.findOne({ code: leagueId.toUpperCase() });
    }

    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    if (league.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'You are already in this league' });
    }

    league.members.push(req.user.id);
    await league.save();

    res.json({ league });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

export default auth(handler);