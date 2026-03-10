const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').trim();
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title  = stripHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const link   = stripHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]  || '');
    const source = stripHtml(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '');
    const pubDate = stripHtml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '');

    if (title && link) {
      items.push({
        title,
        link,
        source,
        pubDate: pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      });
    }
  }

  return items.slice(0, 2);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ msg: 'Method not allowed' });
  }

  const { name, tournament } = req.query;
  if (!name) return res.status(400).json({ msg: 'Missing player name' });

  const cacheKey = `${name}__${tournament || ''}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].fetchedAt < CACHE_TTL) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    const q = tournament
      ? `${name} ${tournament} golf`
      : `${name} golf`;

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

    const xml = await response.text();
    const articles = parseRSS(xml);

    const data = { articles };
    cache[cacheKey] = { data, fetchedAt: now };

    res.status(200).json(data);
  } catch (err) {
    console.error('[News] Error:', err.message);
    if (cache[cacheKey]) return res.status(200).json(cache[cacheKey].data);
    res.status(200).json({ articles: [] });
  }
}