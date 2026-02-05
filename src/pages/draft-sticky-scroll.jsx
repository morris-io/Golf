import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

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
  const [isMyTurn,      setIsMyTurn]      = useState(false);
  const [joining,       setJoining]       = useState(false);
  const [loadingPick,   setLoadingPick]   = useState(false);
  const [error,         setError]         = useState('');

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
    return field.filter(g => !picked.has(g.id));
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
      setIsMyTurn(data.draftOrder[data.picks.length] === userId);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPick(false);
    }
  };

  useEffect(() => {
    if (!leagueId) return;

    fetchLeague();
    fetchDraft();
    fetchField();

    const startPolling = () => {
      if (!pollRef.current) pollRef.current = setInterval(fetchDraft, 10_000);
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
  };

  const disabledStyle = {
    ...buttonBaseStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f3f4f6', 
  };

  if (loadingField)
    return (
      <Layout>
        <p className="text-center mt-8">Loading golfers…</p>
      </Layout>
    );
  if (fieldError)
    return (
      <Layout>
        <p className="text-center mt-8 text-red-500">{fieldError}</p>
      </Layout>
    );

  return (
    <Layout>
      <div className="bg-white md:rounded-xl shadow-lg max-w-lg mx-auto min-h-screen flex flex-col">
        <div className="flex flex-col items-center py-4 px-6 bg-white rounded-t-xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Draft Room</h1>

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
                if (isComplete) router.push(`/team?leagueId=${leagueId}`);
              }}
              disabled={!isComplete}
              style={!isComplete ? disabledStyle : buttonBaseStyle}
            >
              View My Team
            </button>
          </div>
        </div>

        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 pt-2 pb-3 space-y-3">
          
          {tournamentName && (
            <div className="text-center">
               <span className="text-xs font-bold uppercase text-green-600 tracking-wider">
                {tournamentName}
              </span>
            </div>
          )}

          <div>
            {picks.length === 0 ? (
               <p className="text-xs text-gray-400 text-center italic">Waiting for first pick...</p>
            ) : (
              <ul className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                {picks
                  .slice()
                  .reverse()
                  .map((p, idx) => (
                    <li
                      key={idx}
                      className="min-w-[8rem] bg-gray-50 border border-gray-100 rounded p-2 text-center flex-shrink-0"
                    >
                      <span className="block text-xs font-bold text-gray-800 truncate">
                        {p.golferName}
                      </span>
                      <span className="block text-[10px] text-gray-500 truncate">
                        #{p.pickNo} • {userMap[p.user] || p.user}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {upcoming.length > 0 && (
             <div>
               <ul className="flex space-x-2 overflow-x-auto no-scrollbar">
                 {upcoming.map((uid, idx) => (
                   <li
                     key={idx}
                     className={`min-w-[5rem] py-1 px-2 text-center rounded text-xs font-medium flex-shrink-0 ${
                       idx === 0 
                         ? 'bg-green-100 text-green-800 border border-green-200' 
                         : 'bg-gray-50 text-gray-500 border border-gray-100'
                     }`}
                   >
                     <span className="truncate block">
                       {userMap[uid] || uid}
                     </span>
                   </li>
                 ))}
               </ul>
             </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Search golfers…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 text-sm rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50"
            />
          </div>
        </div>

        <div className="flex-1 p-4 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Available Golfers
          </h2>
          
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No golfers found.</p>
          ) : (
            <ul className="space-y-3 pb-20">
              {filtered.map(g => (
                <li
                  key={g.id}
                  className="flex justify-between items-center bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100"
                >
                  <span className="font-medium text-gray-800 text-sm">{g.name}</span>
                  <button
                    onClick={() => makePick(g.id, g.name)}
                    disabled={
                      !leagueReady || order[picks.length] !== userId || loadingPick
                    }
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition ${
                      leagueReady && order[picks.length] === userId
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {loadingPick ? '...' : 'Pick'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}