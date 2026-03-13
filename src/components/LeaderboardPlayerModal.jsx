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
  if (val < 0) return 'text-green-600';
  if (val === 0) return 'text-gray-600';
  return 'text-red-500';
}

function holeScoreColor(val, par) {
  if (val === null || par === null) return 'bg-gray-100 text-gray-600';
  const diff = val - par;
  if (diff <= -2) return 'bg-blue-600 text-white';
  if (diff === -1) return 'bg-green-500 text-white';
  if (diff === 0) return 'bg-gray-100 text-gray-700';
  if (diff === 1) return 'bg-red-400 text-white';
  return 'bg-red-700 text-white';
}

function holeScoreBorder(val, par) {
  if (val === null || par === null) return '';
  const diff = val - par;
  if (diff <= -2) return 'ring-2 ring-blue-300 rounded-full';
  if (diff === -1) return 'rounded-full';
  if (diff === 1) return 'rounded-sm';
  if (diff >= 2) return 'ring-2 ring-red-900 rounded-sm';
  return 'rounded-sm';
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

function formatTeeTime(raw) {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return raw;
  }
}

function Avatar({ name }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-[#1A6B31] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xl font-bold tracking-wide">{initials}</span>
    </div>
  );
}

export default function LeaderboardPlayerModal({ golferId, golferName, tournamentName, onClose }) {
  const [profile, setProfile]                     = useState(null);
  const [news, setNews]                           = useState([]);
  const [rounds, setRounds]                       = useState([]);
  const [teeTime, setTeeTime]                     = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [visible, setVisible]                     = useState(false);
  const [activeRound, setActiveRound]             = useState(null);
  const [tournamentHistory, setTournamentHistory] = useState([]);
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
      fetch(`${apiUrl}/api/news/golfer/${encodeURIComponent(golferName)}?${newsParams.toString()}`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/api/golfers/linescores/${golferId}`).then(r => r.json()).catch(() => null),
      tournamentName
        ? fetch(`${apiUrl}/api/golfers/tournament-history/${golferId}?tournament=${encodeURIComponent(tournamentName)}`).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ]).then(([profileData, newsData, lsData, histData]) => {
      setProfile(profileData ?? null);
      setNews(newsData?.articles ?? []);
      const fetchedRounds = lsData?.rounds ?? [];
      setRounds(fetchedRounds);
      setTeeTime(lsData?.teeTime ?? null);
      const latestWithHoles = [...fetchedRounds].reverse().find(r => r.holes?.length > 0);
      if (latestWithHoles) setActiveRound(latestWithHoles.period);
      setTournamentHistory(histData?.results ?? []);
    }).finally(() => setLoading(false));
  }, [golferId, golferName, tournamentName]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) handleClose();
  };

  const name     = profile?.displayName || golferName || 'Player';
  const flag     = countryFlag(profile?.countryAbbreviation);
  const location = [
    profile?.stateAbbreviation?.toUpperCase(),
    profile?.countryAbbreviation?.toUpperCase(),
  ].filter(Boolean).join(', ');

  const results  = profile?.results ?? [];
  const made     = results.filter(r => !r.cut);
  const avgScore = made.length
    ? (made.reduce((s, r) => s + (r.scoreToPar ?? 0), 0) / made.length).toFixed(1)
    : null;
  const cutPct = results.length > 0
    ? Math.round((made.length / results.length) * 100)
    : null;

  const currentRoundData = rounds.find(r => r.period === activeRound);

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
              {teeTime && (
                <p className="text-sm font-semibold text-green-700 mt-0.5">
                  ⏰ Tee time: {formatTeeTime(teeTime)}
                </p>
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cuts Made</p>
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
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Round scores + hole by hole */}
              {rounds.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    This Tournament
                  </h3>

                  {/* Round selector tabs */}
                  <div className="flex gap-2 mb-3">
                    {rounds.map(r => (
                      <button
                        key={r.period}
                        onClick={() => setActiveRound(r.period)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                          activeRound === r.period
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="block">R{r.period}</span>
                        <span className={`block text-sm font-bold ${
                          activeRound === r.period
                            ? 'text-white'
                            : r.value === null
                            ? 'text-gray-400'
                            : r.value < 0
                            ? 'text-green-600'
                            : r.value > 0
                            ? 'text-red-500'
                            : 'text-gray-600'
                        }`}>
                          {r.displayValue ?? (r.value !== null ? formatScore(r.value) : '—')}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Hole by hole grid */}
                  {currentRoundData?.holes?.length > 0 ? (
                    <div>
                      <div className="overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div style={{ minWidth: `${currentRoundData.holes.length * 34}px` }}>
                          <div className="flex gap-1 mb-1">
                            <div className="w-8 text-[10px] text-gray-400 font-medium text-center flex-shrink-0">H</div>
                            {currentRoundData.holes.map(h => (
                              <div key={h.number} style={{ width: 28 }} className="text-[10px] text-gray-400 text-center font-medium flex-shrink-0">
                                {h.number}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 mb-0.5">
                            <div className="w-8 text-[10px] text-gray-400 font-medium text-center flex-shrink-0">Par</div>
                            {currentRoundData.holes.map(h => (
                              <div key={h.number} style={{ width: 28 }} className="text-[10px] text-gray-500 text-center flex-shrink-0">
                                {h.par ?? '—'}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <div className="w-8 text-[10px] text-gray-400 font-medium text-center flex-shrink-0">Sc</div>
                            {currentRoundData.holes.map(h => (
                              <div key={h.number} style={{ width: 28 }} className="flex items-center justify-center flex-shrink-0">
                                {h.displayValue != null ? (
                                  <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${holeScoreColor(h.value, h.par)} ${holeScoreBorder(h.value, h.par)}`}>
                                    {h.displayValue}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-300">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Score legend */}
                      <div className="flex gap-3 mt-3 justify-center flex-wrap">
                        {[
                          { label: 'Eagle', cls: 'bg-blue-600 text-white rounded-full' },
                          { label: 'Birdie', cls: 'bg-green-500 text-white rounded-full' },
                          { label: 'Par', cls: 'bg-gray-100 text-gray-700 rounded-sm' },
                          { label: 'Bogey', cls: 'bg-red-400 text-white rounded-sm' },
                          { label: 'Double+', cls: 'bg-red-700 text-white rounded-sm' },
                        ].map(({ label, cls }) => (
                          <div key={label} className="flex items-center gap-1">
                            <span className={`w-4 h-4 inline-flex items-center justify-center text-[9px] font-bold ${cls}`} />
                            <span className="text-[10px] text-gray-500">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-3 italic">
                      No hole data available for this round yet
                    </p>
                  )}
                </div>
              )}
              {/* Latest News */}
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
                          <p className="text-sm font-semibold text-gray-800 leading-snug">{article.title}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {article.source && (
                              <span className="text-[11px] font-medium text-green-700">{article.source}</span>
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

              {/* Past results at this specific tournament */}
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



              {/* Tournament History */}
              {results.length === 0 ? (
                <div className="text-center py-10">
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
                          <p className="text-sm font-semibold text-gray-800 truncate">{r.tournamentName}</p>
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