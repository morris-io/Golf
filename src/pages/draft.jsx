import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import PlayerModal from '../components/PlayerModal';

function Skeleton({ className }) {
  return <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />;
}

function DraftSkeleton() {
  return (
    <div className="max-w-md mx-auto mt-4 p-6 bg-white shadow-lg rounded-2xl">
      <div className="flex flex-col items-center mb-6 mt-0 space-y-4">
        <Skeleton className="h-16 w-44" />
        <Skeleton className="h-4 w-52" />
        <div className="flex gap-3 w-full pt-1">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-16" />
        <div className="flex space-x-3 overflow-hidden">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 min-w-[10rem] flex-shrink-0" />)}
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex space-x-3 overflow-hidden">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-24 flex-shrink-0" />)}
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-full mb-4" />
      <div className="space-y-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-5 py-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Draft() {
  const router = useRouter();
  const { leagueId } = router.query;

  const [field,          setField]          = useState([]);
  const [loadingField,   setLoadingField]   = useState(true);
  const [fieldError,     setFieldError]     = useState('');
  
  const [tournamentName, setTournamentName] = useState('');

  const [picks,         setPicks]         = useState([]);
  const [order,         setOrder]         = useState([]);
  const [leagueDetails, setLeagueDetails] = useState(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [joining,       setJoining]       = useState(false);
  const [loadingPick,   setLoadingPick]   = useState(false);
  const [error,         setError]         = useState('');
  const [selectedGolfer, setSelectedGolfer] = useState(null);
  const [ready,         setReady]         = useState(false);
  
  const [timeLeft,      setTimeLeft]      = useState(180); 

  const pollRef = useRef(null);

  const token   = typeof window !== 'undefined' && localStorage.getItem('token');
  const userId  = typeof window !== 'undefined' && localStorage.getItem('userId');
  const apiUrl  = process.env.NEXT_PUBLIC_API_URL;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const leagueReady = leagueDetails?.members?.length >= leagueDetails?.teamCount;
  const isComplete  = picks.length >= (order.length || 0) && order.length > 0;

  const userMap = useMemo(
    () =>
      (leagueDetails?.members || []).reduce((map, u) => {
        map[(u._id || u).toString()] = u.username || u;
        return map;
      }, {}),
    [leagueDetails]
  );

  const upcoming = useMemo(() => {
    if (!order.length) return [];
    const start = picks.length;
    const cnt   = leagueDetails?.teamCount || 0;
    return order.slice(start, start + cnt);
  }, [order, picks, leagueDetails]);

  const available = useMemo(() => {
    const picked = new Set(picks.map(p => String(p.golfer)));
    return field
    .filter(g => !picked.has(g.id))
    .sort((a, b) => {
      const rankA = a.rank || 999;
      const rankB = b.rank || 999;
      return rankA - rankB;
    });
  }, [field, picks]);

  const filtered = useMemo(
    () =>
      searchTerm
        ? available.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : available,
    [available, searchTerm]
  );

  const copyLink = async () => {
    const url = `${window.location.origin}/auth?redirect=${encodeURIComponent(
      `/draft?leagueId=${leagueId}`
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      alert('Invite link copied!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';   
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('Invite link copied!');
      } catch {
        alert('Could not copy link—please copy it manually.');
      }
      document.body.removeChild(ta);
    }
  };

  const fetchLeague = async () => {
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/${leagueId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Fetch league failed');
      setLeagueDetails(data.league);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDraft = async () => {
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/${leagueId}/draft-list`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Fetch draft failed');
      setPicks(data.picks);
      setOrder(data.draftOrder);
      if (data.draftOrder.length && !leagueDetails?.draftOrder?.length) fetchLeague();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchField = async () => {
    setLoadingField(true);
    try {
      const res  = await fetch(`${apiUrl}/api/golfers/current`);
      const data = await res.json();
      if (!res.ok) throw new Error('Could not load golfer list.');
      setField(data.field || []);
      
      if (data.tournamentName) {
        setTournamentName(data.tournamentName);
      }
    } catch (err) {
      setFieldError(err.message);
    } finally {
      setLoadingField(false);
    }
  };

  const makePick = async (golferId, golferName) => {
    if (loadingPick) return;
    setLoadingPick(true);
    try {
      const res  = await fetch(
        `${apiUrl}/api/leagues/${leagueId}/picks`,
        { method: 'POST', headers, body: JSON.stringify({ golferId, golferName }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Pick failed');
      setPicks(data.picks);
      setOrder(data.draftOrder);
      setTimeLeft(180);
      fetchLeague(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPick(false);
    }
  };

  const startDraft = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}/start-draft`, { 
        method: 'POST', 
        headers 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to start draft');
      fetchLeague();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!leagueDetails?.draftStarted || isComplete || !leagueDetails?.lastPickAt) return;

    const timer = setInterval(() => {
      const start = new Date(leagueDetails.lastPickAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, 180 - elapsed);
      
      setTimeLeft(remaining);
      if (remaining === 0) {
        fetchDraft(); 
        fetchLeague();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [leagueDetails?.lastPickAt, leagueDetails?.draftStarted, picks.length, available, order, userId, loadingPick]);

  useEffect(() => {
    if (!leagueId) return;

    setReady(false);
    Promise.all([fetchLeague(), fetchDraft(), fetchField()])
      .finally(() => setReady(true));

    const startPolling = () => {
      if (!pollRef.current) pollRef.current = setInterval(() => {
        fetchDraft();
        fetchLeague();
      }, 10_000);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const visHandler = () => (document.hidden ? stopPolling() : startPolling());

    startPolling();
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [leagueId]);

  useEffect(() => {
    if (
      leagueDetails?.members &&
      userId &&
      !joining &&
      !leagueDetails.members.some(m => (m._id || m).toString() === userId)
    ) {
      setJoining(true);
      fetch(`${apiUrl}/api/leagues/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leagueId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.league) {
            setLeagueDetails(d.league);
            fetchDraft();
          }
        })
        .finally(() => setJoining(false));
    }
  }, [leagueDetails, leagueId, joining, userId]);

  const buttonBaseStyle = {
    display: 'inline-block',
    background: '#fff',
    border: '1px solid #d1d5db',
    color: '#374151',
    fontSize: '0.9rem',
    fontWeight: 600,
    padding: '0.7rem 1rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    marginTop: '1rem', 
    cursor: 'pointer',
    flex: 1
  };

  const disabledStyle = {
    ...buttonBaseStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f3f4f6', 
  };

  if (fieldError)
    return (
      <Layout>
        <p className="text-center mt-8 text-red-500">{fieldError}</p>
      </Layout>
    );

  return (
    <Layout>
      {!ready ? (
        <DraftSkeleton />
      ) : (
        <div className="max-w-md mx-auto mt-4 p-6 bg-white shadow-lg rounded-2xl">
          <div className="flex flex-col items-center mb-6 mt-0">
            <img
              src="/images/draftroomlogo.png"
              alt="Fantasy Fairway"
              className="h- w-44 mb-6 pt-7 "
            />
            {tournamentName && (
              <p className="text-green-800 font-bold text-sm uppercase tracking-wider mb-2">
                {tournamentName}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3 w-full">
              <button
                onClick={isComplete ? null : copyLink}
                disabled={isComplete}
                style={isComplete ? disabledStyle : buttonBaseStyle}
              >
                {joining ? 'Joining…' : 'Copy Invite Link'}
              </button>

              <button
                onClick={() => {
                  if (isComplete) router.push(`/leaderboard?leagueId=${leagueId}`);
                }}
                disabled={!isComplete}
                style={!isComplete ? disabledStyle : buttonBaseStyle}
              >
                View My Team
              </button>
            </div>
          </div>

          {/* Admin Start Button & Timer UI */}
          <div className="mb-6">
            {userId === String(leagueDetails?.admin) && !leagueDetails?.draftStarted && (
              <button 
                onClick={startDraft} 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
              >
                START DRAFT
              </button>
            )}

            {leagueDetails?.draftStarted && !isComplete && (
              <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Pick Timer</p>
                <p className={`text-4xl font-mono font-black ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Automatically picks best available at 0:00</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-med font-semibold mb-2">Results</h2>
            {picks.length === 0 ? (
              <p className="text-gray-500 text-center">No picks yet.</p>
            ) : (
              <ul className="flex space-x-3 overflow-x-auto px-1">
                {picks
                  .slice()
                  .reverse()
                  .map((p, idx) => (
                    <li
                      key={idx}
                      className="min-w-[10rem] bg-gray-50 rounded-lg p-3 shadow text-center"
                    >
                      <span className="block text-sm font-medium mb-1">
                        {p.golferName}
                      </span>
                      <span className="block text-xs text-gray-600 overflow-hidden whitespace-nowrap">
                        Pick {p.pickNo} • {userMap[p.user] || p.user}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-med font-semibold mb-2 mt-2">Upcoming Picks</h2>
            <ul className="flex space-x-3 overflow-x-auto px-1">
              {upcoming.map((uid, idx) => (
            <li
              key={idx}
              className={`min-w-[4rem] max-w-[6rem] py-2 px-3 text-center rounded-lg ${
                idx === 0 ? 'bg-green-200 ring-green-500' : 'bg-gray-100'
              }`}
            >
              <span className="block overflow-hidden whitespace-nowrap text-sm font-bold">{userMap[uid] || uid}</span>
            </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h2 className="text-med font-semibold mb-2 mt-2">Available Golfers</h2>

            <input
              type="text"
              placeholder="Search golfers…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full mb-4 px-3 py-1 rounded-full border-2 border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
            />

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No golfers found.</p>
            ) : (
              <ul className="space-y-4">
                {filtered.map(g => (
                  <li
                    key={g.id}
                    className="flex justify-between items-center bg-gray-50 rounded-xl px-5 py-3 shadow border-l-2 border-green-500"
                  >
                    <button
                      onClick={() => setSelectedGolfer({ id: g.id, name: g.name })}
                      className="font-medium text-gray-800 text-left hover:text-green-700 transition-colors flex items-center"
                    >
                      <span className="text-xs text-gray-400 font-mono mr-3">#{g.rank || 'NR'}</span>
                      {g.name}
                    </button>

                    <button
                      onClick={() => makePick(g.id, g.name)}
                      disabled={
                        !leagueReady || 
                        !leagueDetails?.draftStarted ||
                        loadingPick || 
                        String(order[picks.length]) !== String(userId) 
                      }
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                        leagueReady && leagueDetails?.draftStarted && String(order[picks.length]) === String(userId)
                          ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {loadingPick ? 'Picking…' : 'Pick'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedGolfer && (
        <PlayerModal
          golferId={selectedGolfer.id}
          golferName={selectedGolfer.name}
          tournamentName={tournamentName}
          onClose={() => setSelectedGolfer(null)}
        />
      )}
    </Layout>
  );
}