import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommunitySurvey } from '@/features/survey/community-survey';
import { CreatorResults } from '@/features/survey/creator-results';
import { aggregateResponses } from '@/lib/server/plans';
import { survey } from './fixtures';

describe('anonymous community check-in', () => {
  it('submits only choices and displays durable success', async () => {
    const user = userEvent.setup(),
      fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
    vi.stubGlobal('fetch', fetcher);
    render(<CommunitySurvey id="test-plan" />);
    for (const option of ['Yes', 'None', 'Weekend', 'Walk'])
      await user.click(screen.getByRole('radio', { name: option }));
    await user.click(screen.getByRole('button', { name: 'Send anonymous check-in' }));
    expect(
      await screen.findByRole('heading', { name: 'Thank you for checking in.' }),
    ).toBeInTheDocument();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(survey);
  });
  it.each([
    { ok: false, json: async () => ({ error: 'Survey is closed' }) },
    { ok: false, json: async () => ({}) },
  ])('shows server-side failures and preserves choices', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    render(<CommunitySurvey id="test-plan" />);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      response.ok ? '' : /closed|could not be saved/,
    );
  });
  it('handles network failures without claiming a response was saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'));
    render(<CommunitySurvey id="test-plan" />);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Check-in failed');
  });
});
describe('private creator view', () => {
  it('withholds a sparse answer category even when the total exceeds five responses', async () => {
    window.history.replaceState(null, '', '/plans/test/manage');
    const aggregated = aggregateResponses([
      ...Array.from({ length: 5 }, () => survey),
      { ...survey, works: 'No' },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...aggregated, surveyEnabled: true }),
      }),
    );
    render(<CreatorResults id="test" />);
    expect(await screen.findByText('anonymous check-ins')).toBeInTheDocument();
    const question = screen
      .getByRole('heading', { name: aggregated.questions[0].label })
      .closest('section')!;
    expect(within(question).getByText(/Breakdown withheld/)).toBeVisible();
    expect(within(question).queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(3);
  });

  it('retries an initial load failure using the existing private session', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/plans/test/manage');
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ...aggregateResponses([survey]), surveyEnabled: true }),
      });
    vi.stubGlobal('fetch', fetcher);
    render(<CreatorResults id="test" />);
    expect(screen.getByRole('heading', { name: 'Community responses' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
    await user.click(screen.getByRole('button', { name: 'Retry loading responses' }));
    expect(await screen.findByText('anonymous check-ins')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry loading responses' }),
    ).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/plans/test/manage', { cache: 'no-store' });
    expect(screen.getByRole('link', { name: 'Open the public plan' })).toHaveAttribute(
      'href',
      '/plans/test',
    );
  });
  it('exchanges a fragment token, removes it from the URL, refreshes and closes the survey', async () => {
    const user = userEvent.setup(),
      data = {
        ...aggregateResponses(Array.from({ length: 5 }, () => survey)),
        surveyEnabled: true,
      };
    window.history.replaceState(null, '', '/plans/test/manage#token=private');
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetcher);
    render(<CreatorResults id="test" />);
    expect(await screen.findByText('anonymous check-ins')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(fetcher.mock.calls[0][1].body).toBe('{"token":"private"}');
    expect(screen.getAllByRole('table')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Refresh responses' }));
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ surveyEnabled: false }) });
    await user.click(screen.getByRole('button', { name: 'Close community check-in' }));
    expect(
      await screen.findByRole('button', { name: 'Reopen community check-in' }),
    ).toBeInTheDocument();
    fetcher.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Denied' }) });
    await user.click(screen.getByRole('button', { name: 'Reopen community check-in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Denied');
  });
  it('shows suppression and accesses only the authorized private endpoint', async () => {
    window.history.replaceState(null, '', '/plans/test/manage');
    localStorage.setItem('management:test', 'retained-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...aggregateResponses([survey]), surveyEnabled: false }),
      }),
    );
    render(<CreatorResults id="test" />);
    expect(await screen.findAllByText(/Breakdown withheld/)).toHaveLength(4);
    localStorage.removeItem('management:test');
  });
  it.each([
    { ok: false, json: async () => ({ error: 'Private management access required' }) },
    null,
  ])('explains lost access and network failures honestly', async (response) => {
    window.history.replaceState(null, '', '/plans/test/manage');
    const fetcher = vi.fn();
    if (response) fetcher.mockResolvedValue(response);
    else fetcher.mockRejectedValue('offline');
    vi.stubGlobal('fetch', fetcher);
    render(<CreatorResults id="test" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be recovered/);
  });
  it('rejects invalid fragment credentials', async () => {
    window.history.replaceState(null, '', '/plans/test/manage#token=wrong');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<CreatorResults id="test" />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalid'));
  });
});

it('preserves a visible creator error when browser storage is blocked or an empty server error arrives', async () => {
  window.history.replaceState(null, '', '/plans/test/manage');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage blocked');
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
  render(<CreatorResults id="test" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Results could not load');
});

it('keeps creator survey update failures visible for network and unspecified server errors', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/plans/test/manage');
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...aggregateResponses([survey]), surveyEnabled: true }),
  });
  vi.stubGlobal('fetch', fetcher);
  render(<CreatorResults id="test" />);
  await screen.findByText('anonymous check-ins');
  fetcher.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  await user.click(screen.getByRole('button', { name: 'Close community check-in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Survey setting could not save');
  fetcher.mockRejectedValueOnce('offline');
  await user.click(screen.getByRole('button', { name: 'Close community check-in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Survey setting could not save');
});
