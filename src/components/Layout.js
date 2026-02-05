import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import BottomNav from './BottomNav'; 

export default function Layout({ children }) {
  const router = useRouter();
  const { leagueId } = router.query;
  const [league, setLeague] = useState(null);

  const isDraftPage =
    router.pathname === '/draft' || router.asPath.startsWith('/draft');

  const hideLeagueHeader =
    isDraftPage ||
    ['/team', '/leaderboard'].some(path =>
      router.pathname.startsWith(path) || router.asPath.startsWith(path)
    );

  const needsTopSpacing =
    ['/draft'].some(path =>
      router.pathname.startsWith(path) || router.asPath.startsWith(path)
    );

  useEffect(() => {
    if (!leagueId || hideLeagueHeader) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`/api/leagues/${leagueId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setLeague(data.league))
      .catch(() => {});
  }, [leagueId, hideLeagueHeader]);

  const bgImage = isDraftPage
    ? "url('/images/draftbg.png')"
    : "url('/images/bg.jpg')";

  return (
    <>
      <Head>
        <title>Fantasy Fairway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </Head>

      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: bgImage }}
      />

      <div className="relative min-h-screen z-10 flex flex-col">
        {!hideLeagueHeader && league && (
          <header className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-center text-green-600">
              {league.name}
            </h1>
          </header>
        )}

        <main
          className={`w-full max-w-5xl mx-auto px-4 pb-24${
            needsTopSpacing ? ' pt-4' : ''
          }`}
        >
          {children}
        </main>

        <BottomNav />
      </div>
    </>
  );
}