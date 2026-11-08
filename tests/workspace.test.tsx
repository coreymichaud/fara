import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Workspace } from '@/features/planner/workspace';
import { areas, dataset } from './fixtures';
vi.mock('@/features/map/map-view', () => ({
  MapView: ({
    onSelect,
    onMove,
    showProposal,
  }: {
    onSelect: (id: string) => void;
    onMove: (c: [number, number]) => void;
    showProposal: boolean;
  }) => (
    <div aria-label="Map test boundary" data-event-overlay={showProposal}>
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
  it('returns mobile section changes to navigation while preserving map selection position', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...window.matchMedia('(max-width: 700px)'),
      matches: true,
    });
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const view = render(<Workspace data={dataset} />);
    const navigation = screen.getByLabelText('Workspace sections');
    const workspace = view.container.querySelector('.workspace-grid');

    await user.click(screen.getByRole('button', { name: 'Areas' }));
    expect(workspace).toHaveAttribute('data-mobile', 'areas');
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'start' });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(navigation);
    await user.click(screen.getByRole('button', { name: /03.*Tract 3/ }));
    expect(workspace).toHaveAttribute('data-mobile', 'plan');
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(navigation);

    await user.click(screen.getByRole('button', { name: 'Map' }));
    scrollIntoView.mockClear();
    await user.click(screen.getByText('Select map tract'));
    expect(workspace).toHaveAttribute('data-mobile', 'map');
    expect(scrollIntoView).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'View area details' }));
    expect(workspace).toHaveAttribute('data-mobile', 'plan');
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(navigation);
  });

  it('starts inspector tabs at the top without forcing the desktop page to scroll', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...window.matchMedia('(max-width: 700px)'),
      matches: false,
    });
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const view = render(<Workspace data={dataset} />);
    const inspector = view.container.querySelector<HTMLElement>('.detail-tabs-root')!;

    inspector.scrollTop = 420;
    await user.click(screen.getByRole('tab', { name: 'Event settings' }));
    expect(inspector.scrollTop).toBe(0);
    expect(screen.getByLabelText('Plan title')).toBeInTheDocument();
    inspector.scrollTop = 300;
    await user.click(screen.getByRole('tab', { name: 'Compare locations' }));
    expect(inspector.scrollTop).toBe(0);
    expect(screen.getByLabelText('Add up to two alternatives')).toBeInTheDocument();
    inspector.scrollTop = 250;
    await user.click(screen.getByRole('button', { name: /03.*Tract 3/ }));
    expect(inspector.scrollTop).toBe(0);
    expect(screen.getByRole('heading', { name: 'Tract 3' })).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('opens selected areas from the list and keeps map selection available without changing panes', async () => {
    const user = userEvent.setup();
    const view = render(<Workspace data={dataset} />);
    const workspace = view.container.querySelector('.workspace-grid');
    expect(screen.getByRole('heading', { name: 'Pantry planner' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Planning flow')).not.toBeInTheDocument();
    expect(workspace).toHaveAttribute('data-mobile', 'map');
    await user.click(screen.getByRole('button', { name: 'Areas' }));
    expect(workspace).toHaveAttribute('data-mobile', 'areas');
    await user.click(screen.getByRole('button', { name: /03.*Tract 3/ }));
    expect(workspace).toHaveAttribute('data-mobile', 'plan');
    expect(screen.getByRole('heading', { name: 'Tract 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Area details' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Map' }));
    await user.click(screen.getByText('Select map tract'));
    expect(workspace).toHaveAttribute('data-mobile', 'map');
    expect(screen.getByRole('heading', { name: 'Tract 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View area details' }));
    expect(workspace).toHaveAttribute('data-mobile', 'plan');
    expect(screen.getByRole('tab', { name: 'Area details' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
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
    await user.click(screen.getByRole('tab', { name: 'Event settings' }));
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
    await user.click(screen.getByRole('button', { name: 'Compare locations' }));
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
    expect(screen.getByText('Existing pantry locations are unavailable.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Show event overlay' }));
    expect(screen.getByLabelText('Map test boundary')).toHaveAttribute(
      'data-event-overlay',
      'false',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Show event overlay' }));
    expect(screen.getByLabelText('Map test boundary')).toHaveAttribute(
      'data-event-overlay',
      'true',
    );
    await user.click(screen.getByLabelText('SNAP retailer points'));
    await user.click(screen.getByText('Move site marker'));
    await user.click(screen.getByRole('button', { name: 'Plan a pop-up here' }));
    await user.click(screen.getByRole('button', { name: 'Plan' }));
    await user.click(screen.getByRole('button', { name: 'Areas' }));
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
    await user.click(screen.getByRole('tab', { name: 'Event settings' }));
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
    expect(screen.getByText(/Illustrative demo data/)).toBeInTheDocument();
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
  expect(screen.getByText(/Observed public indicators/)).toBeInTheDocument();
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
  await user.click(screen.getByRole('tab', { name: 'Compare locations' }));
  fireEvent.change(screen.getByLabelText('Add up to two alternatives'), { target: { value: '' } });
  view.unmount();
  render(<Workspace data={{ ...dataset, areas: areas.map((a) => ({ ...a, poverty: null })) }} />);
  await user.selectOptions(screen.getByLabelText('Study area'), 'Lake');
  await user.selectOptions(screen.getByLabelText('Data availability'), 'missing');
  await user.click(screen.getByRole('tab', { name: 'Compare locations' }));
  await user.click(screen.getByText('Radius sensitivity'));
  expect(screen.getAllByText('No eligible candidate')).toHaveLength(3);
});
