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
    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const maxPicks = league.members.length * 4;
    if (!league.draftOrder || league.draftOrder.length < maxPicks) {
      // 1. Get the list of member IDs
      let memberIds = league.members.map(m => m.toString());

      // 2. Randomize the initial order (Fisher-Yates Shuffle)
      for (let i = memberIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [memberIds[i], memberIds[j]] = [memberIds[j], memberIds[i]];
      }

      // 3. Create the serpentine (snake) order
      const rounds = 4; 
      let fullOrder = [];

      for (let round = 0; round < rounds; round++) {
        // Even rounds (0, 2) go forward; Odd rounds (1, 3) go backward
        const roundOrder = (round % 2 === 0) 
          ? [...memberIds] 
          : [...memberIds].reverse();
          
        fullOrder = fullOrder.concat(roundOrder);
      }

      league.draftOrder = fullOrder;
    }

    const pickIndex = league.picks.length;
    
    if (pickIndex >= maxPicks) {
      return res.status(400).json({ msg: 'Draft is complete' });
    }

    const currentPickerId = league.draftOrder[pickIndex].toString();
    const requestingUserId = req.user.id;

    if (currentPickerId !== requestingUserId) {
      return res.status(403).json({ msg: 'Not your turn' });
    }

    const isTaken = league.picks.some(p => p.golferId === golferId);
    if (isTaken) {
      return res.status(400).json({ msg: 'Golfer already picked' });
    }
    
    const newPick = {
      user: req.user.id,
      golferId: golferId,
      golferName: golferName,
      pickNo: pickIndex + 1
    };

    league.picks.push(newPick);
    await league.save();
    
    const responsePicks = league.picks.map(p => ({
      user: p.user.toString(),
      golfer: p.golferId,
      golferName: p.golferName,
      pickNo: p.pickNo
    }));

    res.status(200).json({
      picks: responsePicks,
      draftOrder: league.draftOrder
    });

  } catch (err) {
    console.error('Make Pick Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

export default auth(handler);