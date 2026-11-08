'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { aggregateResponses } from '@/lib/server/plans';
type Results = ReturnType<typeof aggregateResponses> & { surveyEnabled: boolean };
export function CreatorResults({ id }: { id: string }) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      let token = fragment.get('token');
      window.history.replaceState(null, '', window.location.pathname);
      if (!token) {
        try {
          token = localStorage.getItem(`management:${id}`);
        } catch {
          token = null;
        }
      }
      if (token) {
        const auth = await fetch(`/api/plans/${id}/manage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!auth.ok)
          throw new Error(
            'The private management token is invalid. Use the original private link.',
          );
      }
      const response = await fetch(`/api/plans/${id}/manage`, { cache: 'no-store' });
      const data = (await response.json()) as Results & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Results could not load');
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Results could not load');
    } finally {
      setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  async function toggle(current: Results) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/plans/${id}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current.surveyEnabled }),
      });
      const data = (await response.json()) as { surveyEnabled: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Survey setting could not save');
      setResults({ ...current, surveyEnabled: data.surveyEnabled });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Survey setting could not save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="reading-page creator-page">
      <div className="eyebrow">PRIVATE CREATOR VIEW</div>
      <h1>A community check, not a verdict.</h1>
      <p>
        Only the private management link or this browser’s creator session grants access. Public
        plan readers cannot see these results.
      </p>
      {error && (
        <div role="alert" className="error-box">
          {error}
          <p>
            If the token and browser session are lost, access cannot be recovered. Create a new
            plan; the public link does not restore management privileges.
          </p>
        </div>
      )}
      {results && (
        <>
          <div className="creator-summary">
            <div>
              <strong>{results.n}</strong>
              <span>anonymous check-ins</span>
            </div>
            <p>{results.warning}</p>
          </div>
          <div className="creator-actions">
            <Button variant="secondary" onClick={() => void refresh()} disabled={busy}>
              Refresh responses
            </Button>
            <Button variant="secondary" onClick={() => void toggle(results)} disabled={busy}>
              {results.surveyEnabled ? 'Close community check-in' : 'Reopen community check-in'}
            </Button>
          </div>
          {results.questions.map((q) => (
            <section className="aggregate-question" key={q.key}>
              <h2>{q.label}</h2>
              {q.suppressed ? (
                <p>
                  Breakdown withheld: fewer than 5 total responses or at least one nonzero cell has
                  fewer than 5. Whole-question suppression prevents deriving small cells.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Choice</th>
                      <th>Count</th>
                      <th>Share of responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.cells.map((c) => (
                      <tr key={c.option}>
                        <td>{c.option}</td>
                        <td>{c.count}</td>
                        <td>{c.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </>
      )}
      {!results && !error && <p role="status">Checking private access…</p>}
      <Link href={`/plans/${id}`}>Open the public plan ↗</Link>
    </main>
  );
}
