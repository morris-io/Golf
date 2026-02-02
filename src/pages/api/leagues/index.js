import dbConnect from '../../../lib/dbConnect';
import League from '../../../models/League';
import User from '../../../models/User'; 
import auth from '../../../lib/auth';

async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const leagues = await League.find({ members: req.user.id })
          .sort({ createdAt: -1 }); // Newest first
        
        res.status(200).json({ leagues });
      } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server Error' });
      }
      break;

    case 'POST':
      try {
        const { name, teamCount, cutHandling } = req.body;

        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const newLeague = new League({
          name,
          teamCount,
          cutHandling,
          code,
          admin: req.user.id,
          members: [req.user.id] // Admin is automatically a member
        });

        const league = await newLeague.save();
        res.status(200).json({ league });
      } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server Error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default auth(handler);