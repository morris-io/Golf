import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

function Skeleton({ className }) {
  return <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />;
}

function LeagueSelectorSkeleton() {
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-lg rounded-2xl">
      <div className="flex flex-col items-center mb-6 mt-4 space-y-10">
        <Skeleton className="h-14 w-48" />
        <Skeleton className="h-12 w-64" />
      </div>

      <Skeleton className="h-5 w-36 mb-10" />
      <Skeleton className="h-12 w-full mb-4" />
      <Skeleton className="h-12 w-full mb-16" />

      <Skeleton className="h-5 w-28 mb-10" />
      <div className="flex gap-2 mb-10">
        <Skeleton className="h-10 flex-1" />
      </div>

      <Skeleton className="h-5 w-28 mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-50 p-4 rounded-lg shadow space-y-3">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeagueSelector() {
  const router = useRouter();
  const [leagues, setLeagues]               = useState([]);
  const [leagueName, setLeagueName]         = useState('');
  const [teamCount, setTeamCount]           = useState(1);
  const [cutHandling, setCutHandling]       = useState('standard');
  const [joinId, setJoinId]                 = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [ready, setReady]                   = useState(false);

  const token  = typeof window !== 'undefined' && localStorage.getItem('token');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchLeagues = async () => {
    setError('');
    const res  = await fetch(`${apiUrl}/api/leagues`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Could not load leagues');
    setLeagues(data.leagues);
  };

  const fetchTournamentInfo = async () => {
    const res  = await fetch(`${apiUrl}/api/golfers/current`);
    const data = await res.json();
    if (res.ok && data.tournamentName) setTournamentName(data.tournamentName);
  };

  useEffect(() => {
    Promise.all([
      fetchLeagues().catch(() => {}),
      fetchTournamentInfo().catch(() => {}),
    ]).finally(() => setReady(true));
  }, []);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const finalName = leagueName.trim() || 'My League';
      const res  = await fetch(`${apiUrl}/api/leagues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: finalName, teamCount, cutHandling, tournamentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error creating league');
      router.push(`/draft?leagueId=${data.league._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leagueId: joinId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error joining league');
      router.push(`/draft?leagueId=${data.league._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async id => {
    if (!confirm('Are you sure you want to leave this league?')) return;
    setError('');
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/${id}/leave`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error leaving league');
      setLeagues(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!ready) return <Layout><LeagueSelectorSkeleton /></Layout>;

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-lg rounded-2xl">
        <div className="flex flex-col items-center mb-6 mt-0">
          <img
            src="/images/leagueslogo.png"
            alt="Fantasy Fairway"
            className="h- w-44 mb-8 pt-4"
          />
          {tournamentName && (
            <p className="text-lg text-center font-semibold text-gray-700">
              Draft now for the <span className="text-[#1A6B31]">{tournamentName}</span>
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <label className="block text-lg font-semibold mb-7">Create a league</label>
        <div className="mb-6 border-b border-gray-200 pb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition mb-4"
          >
            <span>League Settings</span>
            <span>{showCreateForm ? '▲' : '▼'}</span>
          </button>

          {showCreateForm && (
            <div className="mb-4 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">League Name</label>
                <input
                  type="text"
                  placeholder="Enter league name"
                  value={leagueName}
                  onChange={e => setLeagueName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Teams</label>
                <select
                  value={teamCount}
                  onChange={e => setTeamCount(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => (
                    <option key={n} value={n}>{n === 1 ? 'Demo (1 Team)' : `${n} Teams`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cut Handling</label>
                <select
                  value={cutHandling}
                  onChange={e => setCutHandling(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="standard">Standard Scoring</option>
                  <option value="cap">Cap at Cut Score</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 mb-2 mt-1 bg-[#1A6B31] hover:bg-green-950 text-white rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Working…' : 'Enter Draft Room'}
          </button>
        </div>

        <label className="block text-lg font-semibold mb-7">Join a league</label>
        <form onSubmit={handleJoin} className="flex space-x-2 mb-10">
          <input
            type="text"
            placeholder="League ID or Code"
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            className="flex-grow min-w-0 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-800 hover:bg-purple-950 text-white rounded-lg font-semibold flex-shrink-0 transition disabled:opacity-50"
          >
            {loading ? '…' : 'Join'}
          </button>
        </form>

        <h2 className="text-lg font-semibold mb-4">Past Leagues</h2>
        <ul className="space-y-4">
          {leagues.map(lg => (
            <li key={lg._id} className="bg-gray-50 p-4 rounded-lg shadow flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{lg.name}</h3>
                  {lg.tournamentName && (
                    <p className="text-xs text-[#1A6B31] font-medium">{lg.tournamentName}</p>
                  )}
                </div>
                <button onClick={() => handleLeave(lg._id)} className="text-red-600 hover:underline text-sm">
                  Leave
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/draft?leagueId=${lg._id}`)}
                  className="flex-1 py-2 bg-purple-800 hover:bg-purple-950 text-white rounded-lg text-center"
                >
                  Draft
                </button>
                <button
                  onClick={() => router.push(`/leaderboard?leagueId=${lg._id}`)}
                  className="flex-1 py-2 bg-[#1A6B31] hover:bg-green-700 text-white rounded-lg text-center"
                >
                  Leaderboard
                </button>
              </div>
            </li>
          ))}
          {leagues.length === 0 && (
            <p className="text-gray-500 text-center">No leagues yet.</p>
          )}
        </ul>
      </div>
    </Layout>
  );
}
