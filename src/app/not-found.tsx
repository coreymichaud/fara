import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="reading-page">
      <h1>We couldn’t find that plan.</h1>
      <p>
        Check that you have the full share link, or return to the planner to start a new proposal.
      </p>
      <Link href="/">Return to the planner</Link>
    </main>
  );
}
