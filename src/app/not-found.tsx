import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="reading-page">
      <h1>We couldn’t find that plan.</h1>
      <p>Check the full share link. A public link does not include a management token.</p>
      <Link href="/">Return to the planner</Link>
    </main>
  );
}
