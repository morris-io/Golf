import Head from 'next/head';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Fantasy Fairway</title>
        <meta name="description" content="The ultimate fantasy golf drafting app" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#22c55e" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;