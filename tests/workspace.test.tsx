import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Workspace } from '@/features/planner/workspace';
import { areas, dataset } from './fixtures';
vi.mock('@/features/map/map-view', () => ({
  MapView: ({
    onSelect,
    onMove,
  }: {
    onSelect: (id: string) => void;
    onMove: (c: [number, number]) => void;
  }) => (
    <div aria-label="Map test boundary">
      <button onClick={() => onSelect('12095000200')}>Select map tract</button>
      <button onClick={() => onSelect('unknown')}>Unknown map feature</button>
      <button onClick={() => onMove([-81.42, 28.51])}>Move site marker</button>
    </div>
  ),
}));
vi.mock('@/features/planner/evidence-chart', () => ({
  EvidenceChart: () => <div>Indicator chart</div>,
}));

describe('working planning controls', () => {
  it('selects, configures, compares, challenges and reorders candidates', async () => {
    const user = userEvent.setup();
    render(<Workspace data={dataset} />);
    expect(screen.getByText('3 eligible')).toBeInTheDocument();
    await user.click(screen.getByText('Select map tract'));
    expect(screen.getByRole('heading', { name: 'Tract 2' })).toBeInTheDocument();
    await user.click(screen.getByText('Unknown map feature'));
    await user.click(screen.getByRole('button', { name: 'Shortlist Census Tract 2' }));
    await user.click(screen.getByRole('button', { name: 'Shortlist Census Tract 1' }));
    await user.click(screen.getByRole('button', { name: 'Move Census Tract 1 up' }));
    const shortlist = screen.getByText('Your shortlist').closest('section')!;
    expect(within(shortlist).getAllByRole('button')[0]).toHaveTextContent('Tract 1');
    await user.click(screen.getByRole('button', { name: 'Move Census Tract 1 down' }));
    await user.click(screen.getByText('Priority index weights'));
    fireEvent.change(screen.getByLabelText(/Poverty/), { target: { value: '75' } });
    expect(screen.getByText('75%')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Study area'), 'Lake');
    expect(screen.getByRole('heading', { name: 'Tract 3' })).toBeInTheDocument();
    await user.click(screen.getByText('Select map tract'));
    expect(screen.getByLabelText('Study area')).toHaveValue('Orange');
    await user.click(screen.getByRole('tab', { name: 'Your event' }));
    fireEvent.change(screen.getByLabelText(/Reach radius/), { target: { value: '5' } });
    expect(screen.getByText('5.0 mi')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Event capacity · household slots'), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-81.41' } });
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '28.52' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-100' } });
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '100' } });
    await user.selectOptions(screen.getByLabelText('Operating day'), 'Monday');
    fireEvent.change(screen.getByLabelText('Start · local time'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('End · local time'), { target: { value: '13:00' } });
    await user.click(screen.getByText('Optional event cost & budget'));
    await user.type(screen.getByLabelText('Cost per event · USD'), '200');
    await user.type(screen.getByLabelText('Available budget · USD'), '100');
    expect(screen.getByText(/Above the entered budget/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Available budget · USD'));
    await user.type(screen.getByLabelText('Available budget · USD'), '300');
    expect(screen.getByText('Within the entered budget.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Cost per event · USD'));
    await user.click(screen.getByRole('button', { name: 'Compare the potential' }));
    const select = screen.getByLabelText('Add up to two alternatives');
    await user.selectOptions(select, areas[0].id);
    expect(
      screen.getByRole('button', { name: 'Remove comparison Census Tract 1' }),
    ).toBeInTheDocument();
    await user.click(screen.getByText('Radius sensitivity'));
    expect(screen.getByText(/model sensitivity, not statistical confidence/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove comparison Census Tract 1' }));
    await user.selectOptions(select, areas[0].id);
    await user.click(screen.getByRole('button', { name: 'Use this site' }));
    expect(screen.getByRole('heading', { name: 'Tract 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await user.click(screen.getByText('Challenged candidates (1)'));
    expect(screen.getByText(/Census Tract 1: dismissed/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await user.selectOptions(screen.getByLabelText('Flag as unsuitable'), 'Venue unavailable');
    expect(screen.getByText('Challenged candidates (1)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Current network' }));
    expect(screen.getByText('Current pantry network unknown')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Proposed site' }));
    await user.click(screen.getByLabelText('SNAP retailer points'));
    await user.click(screen.getByText('Move site marker'));
    await user.click(screen.getByRole('button', { name: 'Plan a pop-up here' }));
    await user.click(screen.getByRole('button', { name: 'Your plan' }));
    await user.click(screen.getByRole('button', { name: 'Explore areas' }));
    await user.click(screen.getByRole('button', { name: 'Map' }));
  });
  it('saves edited snapshots, separates public/private links and handles failures visibly', async () => {
    const user = userEvent.setup(),
      fetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'plan-id', token: 'private-token' }),
      });
    vi.stubGlobal('fetch', fetcher);
    render(<Workspace data={dataset} />);
    await user.click(screen.getByRole('tab', { name: 'Your event' }));
    await user.clear(screen.getByLabelText('Plan title'));
    await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Too small/);
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Plan title'), 'Community proposal');
    await user.type(screen.getByLabelText(/Operator note/), 'Verify venue');
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
    expect(await screen.findByText('Plan saved persistently')).toBeInTheDocument();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      title: 'Community proposal',
      note: 'Verify venue',
      surveyEnabled: false,
    });
    expect(screen.getByLabelText('Public read-only link')).toHaveValue(
      'http://localhost:3000/plans/plan-id',
    );
    expect(screen.getByRole('link', { name: 'Open private results' })).toHaveAttribute(
      'href',
      expect.stringContaining('#token=private-token'),
    );
    fireEvent.focus(screen.getByLabelText('Public read-only link'));
    await user.click(screen.getByText('Private creator link · keep this safe'));
    await user.click(screen.getByRole('button', { name: 'Copy share link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
    await user.click(screen.getByRole('button', { name: 'Copy private link' }));
    fetcher.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Firestore unavailable' }),
    });
    await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Firestore unavailable');
    fetcher.mockRejectedValueOnce('network');
    await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Save failed');
  });
  it('discloses missing data and illustrative mode, and offers an honest empty state', async () => {
    const user = userEvent.setup();
    render(
      <Workspace
        data={{
          ...dataset,
          areas: [{ ...areas[0], poverty: null, povertyMoe: null, lowAccess: null, snap: null }],
        }}
      />,
    );
    expect(screen.getByText('Illustrative demo data')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Data availability'), 'missing');
    expect(screen.getByText(/Some indicators are missing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & share this plan' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Data availability'), 'comparable');
    expect(screen.getByText(/No areas match/)).toBeInTheDocument();
  });
});

it('keeps saved access recoverable when browser storage or clipboard is unavailable', async () => {
  const user = userEvent.setup();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage blocked');
  });
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'saved-plan', token: 'private-token' }),
  });
  vi.stubGlobal('fetch', fetcher);
  render(<Workspace data={{ ...dataset, manifest: { ...dataset.manifest, mode: 'observed' } }} />);
  expect(screen.getByText('Observed public indicators')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Browser storage is unavailable');
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('clipboard blocked'));
  await user.click(screen.getByRole('button', { name: 'Copy share link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Clipboard unavailable');
  fetcher.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  await user.click(screen.getByRole('button', { name: 'Save & share this plan' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Plan could not be saved');
});

it('supports direct list and shortlist selection and empty or challenged county filters', async () => {
  const user = userEvent.setup();
  const view = render(<Workspace data={dataset} />);
  await user.click(screen.getByRole('button', { name: /03.*Tract 3/ }));
  expect(screen.getByRole('heading', { name: 'Tract 3' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Shortlist' }));
  await user.click(screen.getByRole('button', { name: '1. Tract 3' }));
  await user.click(screen.getByRole('button', { name: 'Dismiss' }));
  await user.selectOptions(screen.getByLabelText('Study area'), 'Lake');
  expect(screen.getByRole('heading', { name: 'Tract 3' })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Data availability'), 'missing');
  expect(screen.getByText(/No areas match/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Study area'), 'all');
  await user.selectOptions(screen.getByLabelText('Data availability'), 'comparable');
  await user.selectOptions(screen.getByLabelText('Flag as unsuitable'), 'Hours conflict');
  fireEvent.change(screen.getByLabelText('Flag as unsuitable'), { target: { value: '' } });
  await user.click(screen.getByRole('tab', { name: 'Compare' }));
  fireEvent.change(screen.getByLabelText('Add up to two alternatives'), { target: { value: '' } });
  view.unmount();
  render(<Workspace data={{ ...dataset, areas: areas.map((a) => ({ ...a, poverty: null })) }} />);
  await user.selectOptions(screen.getByLabelText('Study area'), 'Lake');
  await user.selectOptions(screen.getByLabelText('Data availability'), 'missing');
  await user.click(screen.getByRole('tab', { name: 'Compare' }));
  await user.click(screen.getByText('Radius sensitivity'));
  expect(screen.getAllByText('No eligible candidate')).toHaveLength(3);
});
