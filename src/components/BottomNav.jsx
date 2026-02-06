import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function BottomNav() {
  const router = useRouter();
  const { leagueId } = router.query;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recentLeagueId, setRecentLeagueId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const storedLeague = localStorage.getItem('recentLeagueId');
    if (storedLeague) {
      setRecentLeagueId(storedLeague);
    }
  }, []);

  useEffect(() => {
    if (leagueId) {
      localStorage.setItem('recentLeagueId', leagueId);
      setRecentLeagueId(leagueId);
    }
  }, [leagueId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('recentLeagueId'); 
    router.push('/auth');
    setTimeout(() => window.location.reload(), 50);
  };


  const leaderboardHref = !isLoggedIn
    ? '/auth'
    : recentLeagueId
      ? `/leaderboard?leagueId=${recentLeagueId}`
      : '/leaderboard';


  const leaguesHref = !isLoggedIn ? '/auth' : '/league-selector';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-50 flex justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      
      <Link 
        href={leaguesHref}
        className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-green-600 active:text-green-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <span className="text-[10px] mt-1 font-medium">Leagues</span>
      </Link>

      <Link 
        href={leaderboardHref}
        className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-green-600 active:text-green-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
        <span className="text-[10px] mt-1 font-medium">Leaderboard</span>
      </Link>

      {isLoggedIn ? (
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-red-500 active:text-red-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="text-[10px] mt-1 font-medium">Sign Out</span>
        </button>
      ) : (
        <Link 
          href="/auth"
          className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-green-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <span className="text-[10px] mt-1 font-medium">Sign In</span>
        </Link>
      )}

    </div>
  );
}