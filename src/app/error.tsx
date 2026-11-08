'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="reading-page">
      <h1>This page could not load.</h1>
      <p>Try loading the page again. If the problem continues, please come back later.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
