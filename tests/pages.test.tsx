import { render, screen } from '@testing-library/react';
import Link from 'next/link';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { dataset, scenario, areas } from './fixtures';
import { evaluate, scoreAreas } from '@/lib/domain/planner';
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  get: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('404');
  }),
}));
vi.mock('@/lib/data/load', () => ({ loadDataset: mocks.load }));
vi.mock('@/lib/storage', () => ({ getRepository: () => ({ get: mocks.get }) }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/features/planner/workspace', () => ({ Workspace: () => <div>Planning workspace</div> }));
vi.mock('@/features/survey/community-survey', () => ({
  CommunitySurvey: () => <div>Anonymous check-in form</div>,
}));
vi.mock('@/features/survey/creator-results', () => ({
  CreatorResults: () => <div>Private results</div>,
}));
import Home from '@/app/page';
import About from '@/app/about/page';
import Methodology from '@/app/methodology/page';
import Loading from '@/app/loading';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import RootLayout, { metadata } from '@/app/layout';
import robots from '@/app/robots';
import PlanPage from '@/app/plans/[id]/page';
import Management from '@/app/plans/[id]/manage/page';
import { Button } from '@/components/ui/button';

describe('crawlable pages and meaningful framework states', () => {
  it('renders the working landing page and source methodology', async () => {
    mocks.load.mockResolvedValue(dataset);
    render(await Home());
    expect(screen.getByText('Planning workspace')).toBeInTheDocument();
    render(await Methodology());
    expect(screen.getByRole('heading', { name: /Two signals/ })).toBeInTheDocument();
    expect(screen.getByText(/schema 1.0/)).toBeInTheDocument();
  });
  it('has accurate about, loading, failure, 404, metadata and navigation', async () => {
    render(<About />);
    expect(screen.getByText(/not an official DataKind/)).toBeInTheDocument();
    render(<Loading />);
    expect(screen.getByText('Loading the planning workspace…')).toBeInTheDocument();
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Return to the planner' })).toHaveAttribute(
      'href',
      '/',
    );
    const reset = vi.fn();
    render(<ErrorPage reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(metadata.description).toContain('Central Florida');
    expect(metadata.title).toBe('FARA · Food Access Resource Allocation');
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
    const layout = RootLayout({ children: <p>Page content</p> });
    expect(layout.props.lang).toBe('en');
    render(layout.props.children);
    expect(screen.getByRole('link', { name: 'FARA home' })).toBeInTheDocument();
    expect(screen.getByText('Food Access Resource Allocation')).toBeInTheDocument();
    render(
      <Button asChild>
        <Link href="/">Linked action</Link>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Linked action' })).toHaveClass('button');
  });
  it('renders immutable public snapshots with optional assumptions, challenges and survey gates', async () => {
    const id = 'a'.repeat(24),
      base = {
        id,
        createdAt: '2026-11-07T12:00:00Z',
        scenario,
        result: evaluate(scoreAreas(areas, 50), scenario),
        alternatives: [],
        area: areas[0],
        manifest: dataset.manifest,
        surveyEnabled: true,
        managementHash: 'a'.repeat(64),
        responseCount: 0,
      };
    mocks.get.mockResolvedValue(base);
    const first = render(await PlanPage({ params: Promise.resolve({ id }) }));
    expect(screen.getByText('Illustrative demo data')).toBeInTheDocument();
    expect(screen.getByText('Anonymous check-in form')).toBeInTheDocument();
    first.unmount();
    for (const budgetFeasible of [true, false]) {
      mocks.get.mockResolvedValue({
        ...base,
        manifest: { ...dataset.manifest, mode: 'observed' },
        surveyEnabled: false,
        scenario: {
          ...scenario,
          cost: 10,
          budget: budgetFeasible ? 20 : 5,
          note: 'Verify this venue',
          decisions: [
            { id: areas[1].id, status: 'flagged', reason: 'Venue unavailable' },
            { id: areas[0].id, status: 'shortlisted' },
          ],
          shortlist: budgetFeasible ? [areas[0].id] : [],
        },
        result: { ...base.result, budgetFeasible },
        area: {
          ...areas[0],
          poverty: budgetFeasible ? null : 10,
          povertyMoe: null,
          lowAccess: null,
        },
        alternatives: [{ id: areas[1].id, label: 'Alternative tract', result: base.result }],
      });
      const view = render(await PlanPage({ params: Promise.resolve({ id }) }));
      expect(screen.getByText('Verify this venue')).toBeInTheDocument();
      expect(screen.getByText('Community check-in is closed for this plan.')).toBeInTheDocument();
      expect(screen.getByText('Alternative tract')).toBeInTheDocument();
      view.unmount();
    }
    render(await Management({ params: Promise.resolve({ id }) }));
    expect(screen.getByText('Private results')).toBeInTheDocument();
    mocks.get.mockResolvedValue(null);
    await expect(PlanPage({ params: Promise.resolve({ id }) })).rejects.toThrow('404');
    mocks.get.mockRejectedValue(new Error('Database unavailable'));
    await expect(PlanPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
      'Database unavailable',
    );
  });
});
