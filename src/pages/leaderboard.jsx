import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Layout from '../components/Layout';

export default function Leaderboard() {
  const router = useRouter();
  const { leagueId } = router.query;

  const [standings, setStandings] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [openUser, setOpenUser]   = useState(null);
  const [leagues, setLeagues]     = useState([]); 

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const myId = localStorage.getItem('userId');
      if (myId) {
        setOpenUser(myId);
      }
    }
  }, []);

  const fetchLeagues = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues`, { headers });
      const data = await res.json();
      if (res.ok) {
        setLeagues(data.leagues || []);
      }
    } catch (err) {
      console.error('Failed to fetch leagues:', err);
    }
  };

  const refreshLeaderboard = async () => {
    if (!leagueId) return;
    setLoading(true);
    setError('');
    try {
      const resScores = await fetch(`${apiUrl}/api/scores/${leagueId}`, { headers });
      if (!resScores.ok) throw new Error('Failed to refresh scores');

      const resBoard = await fetch(
        `${apiUrl}/api/leagues/${leagueId}/leaderboard`,
        { headers }
      );
      if (!resBoard.ok) {
        const data = await resBoard.json();
        throw new Error(data.msg || 'Failed to load leaderboard');
      }
      const { standings: sb } = await resBoard.json();
      setStandings(sb);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLeagues();
  }, [token]);

  useEffect(() => {
    if (!leagueId) return;
    let pollId;

    const startPolling = () => {
      if (!pollId) {
        pollId = setInterval(refreshLeaderboard, 2 * 60 * 1000);
      }
    };

    const stopPolling = () => {
      clearInterval(pollId);
      pollId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    refreshLeaderboard();
    document.addEventListener('visibilitychange', handleVisibility);
    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [leagueId]);

  const toggle = (uid) => setOpenUser(openUser === uid ? null : uid);

  const currentLeague = leagues.find(l => l._id === leagueId);

  if (!leagueId) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-lg rounded-2xl">
          <div className="flex flex-col items-center mb-6">
             <img
                src="/images/leagueslogo.png"
                alt="Fantasy Fairway"
                className="h-20 w-46 mb-2"
              />
            <h2 className="text-xl font-bold text-gray-800">Select a League</h2>
            <p className="text-gray-500 text-sm mt-1">
              Choose a leaderboard to view
            </p>
          </div>

          <div className="space-y-3">
            {leagues.length > 0 ? (
              leagues.map((lg) => (
                <button
                  key={lg._id}
                  onClick={() => router.push(`/leaderboard?leagueId=${lg._id}`)}
                  className="w-full flex justify-between items-center px-4 py-4 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-xl transition-all duration-200 group text-left"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-700 group-hover:text-green-700">
                      {lg.name}
                    </span>
                    {lg.tournamentName && (
                      <span className="text-xs text-gray-500 group-hover:text-green-600">
                        {lg.tournamentName}
                      </span>
                    )}
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                </button>
              ))
            ) : (
               <div className="text-center py-6">
                 <p className="text-gray-500 mb-4">You haven't joined any leagues yet.</p>
                 <button
                    onClick={() => router.push('/league-selector')}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                 >
                   Join or Create a League
                 </button>
               </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-green-600 relative flex items-center justify-center">
          <button
            onClick={() => router.push('/leaderboard')}
            className="absolute left-4 text-green-100 hover:text-white transition p-1 rounded-full hover:bg-green-700"
            aria-label="Back to Leagues"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-white text-xl font-semibold">
              {currentLeague?.name || 'Leaderboard'}
            </h1>
            <p className="text-green-200 text-xs uppercase tracking-wider mt-0.5">
              Live Standings
            </p>
          </div>
        </div>

        <div className="p-6">
          {loading && <p className="text-center py-4 text-gray-500">Loading scores…</p>}
          {error && (
            <p className="text-red-500 text-center py-4">Error: {error}</p>
          )}

          {!loading && !error && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((s, i) => (
                  <React.Fragment key={s.userId}>
                    <tr
                      onClick={() => toggle(s.userId)}
                      className="cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3 flex items-center justify-between text-gray-800 font-medium">
                        <span>{s.username}</span>
                        {openUser === s.userId ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {s.totalStrokes}
                      </td>
                    </tr>

                    {openUser === s.userId && (
                      <tr>
                        <td colSpan={3} className="bg-gray-50 px-4 py-3 shadow-inner">
                          <ul className="divide-y divide-gray-200">
                            {s.picks.map((p) => (
                              <li
                                key={p.golferId}
                                className="flex justify-between py-2 text-sm"
                              >
                                <span className="text-gray-600">{p.name}</span>
                                <span className={`font-mono font-medium ${p.strokes < 0 ? 'text-red-600' : p.strokes > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {p.strokes > 0 ? `+${p.strokes}` : p.strokes}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}