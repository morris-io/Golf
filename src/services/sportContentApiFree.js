const LB_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';

export async function getLeaderboard() {
  const res = await fetch(LB_URL);
  if (!res.ok) throw new Error('Failed to fetch ESPN data');

  const data = await res.json();
  if (!data.events?.length) throw new Error('ESPN: no events in leaderboard response');

  return data;
}