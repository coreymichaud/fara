'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="reading-page">
      <h1>The workspace could not load.</h1>
      <p>
        Check that processed data exists and passes <code>npm run data:validate</code>. Saved plans
        also require a configured persistence service.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
