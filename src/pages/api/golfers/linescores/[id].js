export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ msg: 'Method not allowed' });
  
    const { id } = req.query;
  
    try {
      const lbRes = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard',
        { signal: AbortSignal.timeout(5000) }
      );
      if (!lbRes.ok) throw new Error('Failed to fetch leaderboard');
      const lbData = await lbRes.json();
  
      const event = lbData.events?.[0];
      const eventId = event?.id;
      if (!eventId) return res.status(200).json({ rounds: [], teeTime: null });
  
      const competitors = event?.competitions?.[0]?.competitors || [];
      const competitor = competitors.find(
        c => c.athlete?.id?.toString() === id.toString()
      );
  
      if (!competitor) return res.status(200).json({ rounds: [], teeTime: null });
  
      const teeTime = competitor?.status?.teeTime ?? null;
      const competitorId = competitor.id;
  
      const lsRes = await fetch(
        `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eventId}/competitions/${eventId}/competitors/${competitorId}/linescores`,
        { signal: AbortSignal.timeout(5000) }
      );
  
      if (!lsRes.ok) return res.status(200).json({ rounds: [], teeTime });
  
      const lsData = await lsRes.json();
      const items = lsData.items || [];
  
      const rounds = items.map(round => ({
        period: round.period,
        value: round.value ?? null,
        displayValue: round.displayValue ?? null,
        holes: (round.linescores || []).map(hole => ({
          number: hole.period,
          value: hole.value ?? null,
          displayValue: hole.displayValue ?? null,
          par: hole.par ?? null,
        })),
      }));
  
      return res.status(200).json({ rounds, teeTime });
    } catch (err) {
      console.error('Linescores error:', err.message);
      return res.status(200).json({ rounds: [], teeTime: null });
    }
  }