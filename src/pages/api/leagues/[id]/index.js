import dbConnect from '../../../../lib/dbConnect';
import League from '../../../../models/League';
import User from '../../../../models/User'; 
import auth from '../../../../lib/auth';

async function handler(req, res) {
  const { method } = req;
  const { id } = req.query; 

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const league = await League.findById(id)
          .populate('members', 'username')     // Get usernames of members
          .populate('draftOrder', 'username')  // Get usernames for draft list
          .populate('picks.user', 'username'); // Get usernames for picks

        if (!league) {
          return res.status(404).json({ msg: 'League not found' });
        }

        res.status(200).json({ league });
      } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server Error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default auth(handler);