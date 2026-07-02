import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function BottomNav() {
  const router = useRouter();
  const { leagueId } = router.query;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recentLeagueId, setRecentLeagueId] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <>
      <div className="hidden md:block fixed top-6 left-6 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-3 bg-white text-green-600 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 focus:outline-none transition-transform active:scale-95"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute left-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
            <Link 
              href={leaguesHref}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
            >
              <span className="mr-3"></span> Leagues
            </Link>

            <Link 
              href={leaderboardHref}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
            >
              <span className="mr-3"></span> Leaderboard
            </Link>

            {isLoggedIn ? (
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50 mt-1"
              >
                <span className="mr-3"></span> Sign Out
              </button>
            ) : (
              <Link 
                href="/auth"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors border-t border-gray-50 mt-1"
              >
                <span className="mr-3"></span> Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-50 flex justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
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
    </>
  );
}