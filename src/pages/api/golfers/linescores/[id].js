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

    const competitorId = competitor.id;

    const lsRes = await fetch(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eventId}/competitions/${eventId}/competitors/${competitorId}/linescores`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!lsRes.ok) return res.status(200).json({ rounds: [], teeTime: null });

    const lsData = await lsRes.json();
    const items = lsData.items || [];

    // Tee time strategy:
    // 1. Prefer an upcoming empty round (future placeholder with no score/holes yet)
    // 2. Fall back to the teeTime on the highest-period round that has one
    //    (covers mid-round where the current round has a teeTime but no future placeholder exists yet)
    const futureRound = items.find(round =>
      round.value === undefined &&
      (!round.linescores || round.linescores.length === 0) &&
      round.teeTime
    );

    const latestRoundWithTeeTime = [...items]
      .reverse()
      .find(round => round.teeTime);

    const teeTime = futureRound?.teeTime ?? latestRoundWithTeeTime?.teeTime ?? null;

    // Filter to only rounds with actual scoring data
    const rounds = items
      .filter(round =>
        round.value !== undefined ||
        (round.linescores && round.linescores.length > 0)
      )
      .map(round => ({
        period: round.period,
        value: round.value ?? null,
        displayValue: round.displayValue ?? null,
        teeTime: round.teeTime ?? null,
        holes: (round.linescores || [])
          .map(hole => ({
            number: hole.period,
            value: hole.value ?? null,
            displayValue: hole.displayValue ?? null,
            par: hole.par ?? null,
          }))
          .sort((a, b) => a.number - b.number),
      }));

    return res.status(200).json({ rounds, teeTime });
  } catch (err) {
    console.error('Linescores error:', err.message);
    return res.status(200).json({ rounds: [], teeTime: null });
  }
}