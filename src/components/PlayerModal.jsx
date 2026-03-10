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

// Avatar: initials in a green circle
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

export default function PlayerModal({ golferId, golferName, onClose }) {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [visible, setVisible]   = useState(false);
  const backdropRef             = useRef(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!golferId) return;
    setLoading(true);
    fetch(`${apiUrl}/api/golfers/${golferId}`)
      .then(r => r.json())
      .then(data => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [golferId]);

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

  const results     = profile?.results ?? [];
  const made        = results.filter(r => !r.cut);
  const avgScore    = made.length
    ? (made.reduce((s, r) => s + (r.scoreToPar ?? 0), 0) / made.length).toFixed(1)
    : null;
  const bestResult  = made.reduce((best, r) => {
    if (r.scoreToPar === null) return best;
    if (best === null || r.scoreToPar < best) return r.scoreToPar;
    return best;
  }, null);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      {/* Sheet */}
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
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Quick stats bar */}
          {results.length > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Events</p>
                <p className="text-lg font-bold text-gray-800">{results.length}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cuts Made</p>
                <p className="text-lg font-bold text-gray-800">{made.length}</p>
              </div>
              {avgScore !== null && (
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Score</p>
                  <p className={`text-lg font-bold ${parseFloat(avgScore) < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {parseFloat(avgScore) > 0 ? `+${avgScore}` : avgScore}
                  </p>
                </div>
              )}
              {bestResult !== null && (
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Best</p>
                  <p className="text-lg font-bold text-green-600">{formatScore(bestResult)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">⛳</p>
              <p className="text-gray-500 font-medium">No tournament history yet</p>
              <p className="text-gray-400 text-sm mt-1">Results will appear after tournaments complete</p>
            </div>
          )}

          {!loading && results.length > 0 && (
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
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          Missed Cut
                        </span>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">{r.position ?? '—'}</p>
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

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
