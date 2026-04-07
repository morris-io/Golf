const BDL_URL = 'https://api.balldontlie.io/v1/pga/players';

export async function fetchGolferRank(name) {
  try {
    const res = await fetch(`${BDL_URL}?search=${encodeURIComponent(name)}`, {
      headers: { 'Authorization': process.env.BALLDONTLIE_API_KEY }
    });
    const json = await res.json();
    
    // BallDontLie returns an array of players; we take the first match
    const player = json.data?.[0];
    // Use 'standing' or 'rank' based on their current API response structure
    return player?.rank || 999;
  } catch (err) {
    console.error(`BDL Error for ${name}:`, err);
    return 999;
  }
}