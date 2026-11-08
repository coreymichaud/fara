'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { surveyQuestions } from '@/lib/domain/schema';
export function CommunitySurvey({ id }: { id: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const response = await fetch(`/api/plans/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Check-in could not be saved');
      setStatus('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
      setStatus('idle');
    }
  }
  if (status === 'saved')
    return (
      <div className="survey-success" role="status">
        <h3>Thank you for checking in.</h3>
        <p>
          Your anonymous response has been saved. It will help the planner question this proposal.
        </p>
      </div>
    );
  return (
    <form className="community-survey" onSubmit={submit}>
      {surveyQuestions.map((question) => (
        <fieldset key={question.key}>
          <legend>{question.label}</legend>
          {question.options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={question.key}
                value={option}
                required
                checked={answers[question.key] === option}
                onChange={() => setAnswers((a) => ({ ...a, [question.key]: option }))}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <p className="fine-print">
        Only these four choices are saved. We do not collect names, contact details, addresses,
        precise location, fingerprints, or raw IPs. Hosting providers may retain standard request
        logs. One barrier per response keeps this short. Anonymous submissions cannot guarantee one
        response per person.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="accent" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving your check-in…' : 'Send anonymous check-in'}
      </Button>
    </form>
  );
}
