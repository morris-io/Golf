import React, { useEffect, useState, useRef } from 'react';

function formatScore(val) {
  if (val === null || val === undefined) return '—';
  if (val === 0) return 'E';
  return val > 0 ? `+${val}` : `${val}`;
}

function scoreColor(val, cut) {
  if (cut) return 'text-red-500';
  if (val === null || val === undefined) return 'text-gray-400';
  if (val <= -5) return 'text-blue-600';
  if (val < 0)  return 'text-green-600';
  if (val === 0) return 'text-gray-600';
  return 'text-red-500';
}

function countryFlag(abbr) {
  if (!abbr) return null;
  const map = {
    usa: '🇺🇸', can: '🇨🇦', eng: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', sco: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', aus: '🇦🇺',
    zaf: '🇿🇦', irl: '🇮🇪', esp: '🇪🇸', kor: '🇰🇷', jpn: '🇯🇵',
    swe: '🇸🇪', nor: '🇳🇴', den: '🇩🇰', ger: '🇩🇪', fra: '🇫🇷',
    arg: '🇦🇷', col: '🇨🇴', mex: '🇲🇽', ven: '🇻🇪', chl: '🇨🇱',
    nzl: '🇳🇿', ita: '🇮🇹', chn: '🇨🇳', tha: '🇹🇭', fij: '🇫🇯',
  };
  return map[abbr.toLowerCase()] ?? null;
}

function oddsKey(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '');
}

function findOdds(golferName, oddsMap) {
  if (!golferName || !oddsMap) return null;
  const key = oddsKey(golferName);
  if (oddsMap[key] !== undefined) return oddsMap[key];
  const lastName = oddsKey(golferName.split(' ').slice(-1)[0]);
  const match = Object.entries(oddsMap).find(([k]) => k.endsWith(lastName));
  return match ? match[1] : null;
}

function formatOdds(price) {
  if (price === null || price === undefined) return null;
  return price > 0 ? `+${price}` : `${price}`;
}

function oddsColor(price) {
  if (price === null || price === undefined) return 'text-gray-500';
  if (price <= -200) return 'text-yellow-600';
  if (price <= 500)  return 'text-green-700';
  if (price <= 2000) return 'text-blue-600';
  return 'text-purple-600';
}

function Avatar({ name }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-16 h-16 rounded-full bg-[#1A6B31] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xl font-bold tracking-wide">{initials}</span>
    </div>
  );
}

export default function PlayerModal({ golferId, golferName, tournamentName, onClose }) {
  const [profile, setProfile]                     = useState(null);
  const [tournamentHistory, setTournamentHistory] = useState([]); 
  const [odds, setOdds]                           = useState(null);
  const [oddsBook, setOddsBook]                   = useState(null);
  const [news, setNews]                           = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [visible, setVisible]                     = useState(false);
  const backdropRef                               = useRef(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!golferId) return;
    setLoading(true);

    const newsParams = new URLSearchParams();
    if (tournamentName) newsParams.set('tournament', tournamentName);

    Promise.all([
      fetch(`${apiUrl}/api/golfers/${golferId}`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/api/odds/golf`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/api/news/golfer/${encodeURIComponent(golferName)}?${newsParams.toString()}`).then(r => r.json()).catch(() => null),
      tournamentName
        ? fetch(`${apiUrl}/api/golfers/tournament-history/${golferId}?tournament=${encodeURIComponent(tournamentName)}`).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]).then(([profileData, oddsData, newsData, histData]) => {
      setProfile(profileData ?? null);
      setTournamentHistory(histData?.results ?? []); 
      if (oddsData?.odds) {
        setOdds(findOdds(golferName, oddsData.odds));
        setOddsBook(oddsData.bookmaker ?? null);
      }
      setNews(newsData?.articles ?? []);
    }).finally(() => setLoading(false));
  }, [golferId, golferName, tournamentName]);
  
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) handleClose();
  };

  const name = profile?.displayName || golferName || 'Player';
  const flag = countryFlag(profile?.countryAbbreviation);
  const location = [
    profile?.stateAbbreviation?.toUpperCase(),
    profile?.countryAbbreviation?.toUpperCase(),
  ].filter(Boolean).join(', ');

  const results    = profile?.results ?? [];
  const made       = results.filter(r => !r.cut);
  const avgScore   = made.length
    ? (made.reduce((s, r) => s + (r.scoreToPar ?? 0), 0) / made.length).toFixed(1)
    : null;
    const cutPct = results.length > 0
    ? Math.round((made.length / results.length) * 100)
    : null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="w-full bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: '88vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Avatar name={name} />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{name}</h2>
              {location && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {flag && <span className="mr-1">{flag}</span>}
                  {location}
                </p>
              )}
              {odds !== null && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-sm font-bold ${oddsColor(odds)}`}>
                    {formatOdds(odds)}
                  </span>
                  <span className="text-xs text-gray-400">
                    to win{oddsBook ? ` · ${oddsBook}` : ''}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {results.length > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Events</p>
                <p className="text-lg font-bold text-gray-800">{results.length}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cuts Made</p>
                <p className="text-lg font-bold text-gray-800">{made.length}</p>
              </div>
              {cutPct !== null && (
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">% CUTS MADE</p>
                  <p className={`text-lg font-bold ${cutPct >= 60 ? 'text-green-600' : cutPct >= 40 ? 'text-gray-700' : 'text-red-500'}`}>
                    {cutPct}%
                  </p>
                </div>
              )}
              {avgScore !== null && (
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Score</p>
                  <p className={`text-lg font-bold ${parseFloat(avgScore) < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {parseFloat(avgScore) > 0 ? `+${avgScore}` : avgScore}
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {news.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Latest News
                  </h3>
                  <ul className="space-y-2">
                    {news.map((article, i) => (
                      <li key={i}>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-800 leading-snug">
                            {article.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {article.source && (
                              <span className="text-[11px] font-medium text-green-700">
                                {article.source}
                              </span>
                            )}
                            {article.pubDate && (
                              <span className="text-[11px] text-gray-400">{article.pubDate}</span>
                            )}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course History Section - Matches Leaderboard reference */}
              {tournamentHistory.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Course History 
                  </h3>
                  <ul className="space-y-2">
                    {tournamentHistory.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-semibold text-gray-800 truncate">{r.tournamentName}</p>
                          {r.cut ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                Missed Cut
                              </span>
                              {r.savedAt && (
                                <span className="text-[10px] text-gray-400">{new Date(r.savedAt).getFullYear()}</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">
                              {r.position ?? '—'}
                              {r.savedAt && (
                                <span className="ml-1.5">{new Date(r.savedAt).getFullYear()}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className={`text-base font-bold font-mono ${scoreColor(r.scoreToPar, r.cut)}`}>
                          {formatScore(r.scoreToPar)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">⛳</p>
                  <p className="text-gray-500 font-medium">No tournament history yet</p>
                  <p className="text-gray-400 text-sm mt-1">Results will appear after tournaments complete</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Tournament History
                  </h3>
                  <ul className="space-y-2">
                    {results.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {r.tournamentName}
                          </p>
                          {r.cut ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                Missed Cut
                              </span>
                              {r.savedAt && (
                                <span className="text-[10px] text-gray-400">{new Date(r.savedAt).getFullYear()}</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {r.position ?? '—'}
                              {r.savedAt && (
                                <span className="ml-1.5">{new Date(r.savedAt).getFullYear()}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className={`text-base font-bold font-mono ${scoreColor(r.scoreToPar, r.cut)}`}>
                          {formatScore(r.scoreToPar)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}