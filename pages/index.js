import Head from 'next/head';
import VideoCall from '../components/VideoCall';

export default function Home() {
  return (
    <div>
      <Head>
        <title>WASAA Video Call System</title>
        <meta name="description" content="WASAA Video Call testing environment" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <VideoCall />
      </main>
    </div>
  );
}