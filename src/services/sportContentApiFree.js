const LB_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';
const CACHE_TTL = 3 * 60 * 60 * 1000; 

let cache = {
  data: null,
  fetchedAt: 0,
  tournamentId: null,
};

export async function getLeaderboard() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const res = await fetch(LB_URL);
  if (!res.ok) {
    throw new Error('Failed to fetch ESPN data');
  }
  
  const data = await res.json();

  if (!data.events?.length) {
    throw new Error('ESPN: no events in leaderboard response');
  }

  cache = {
    data,
    fetchedAt: now,
    tournamentId: data.events[0].id
  };
  
  return cache.data;
}

export function currentTournamentId() {
  return cache.tournamentId;
}