import { render, screen, within } from '@testing-library/react';
import Link from 'next/link';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dataset, scenario, areas } from './fixtures';
import { evaluate, scoreAreas } from '@/lib/domain/planner';
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  boundaries: vi.fn(),
  get: vi.fn(),
  pathname: vi.fn(() => '/'),
  notFound: vi.fn(() => {
    throw new Error('404');
  }),
}));
vi.mock('@/lib/data/load', () => ({ loadDataset: mocks.load }));
vi.mock('@/lib/data/study-map', () => ({ loadStudyMap: mocks.boundaries }));
vi.mock('@/lib/storage', () => ({ getRepository: () => ({ get: mocks.get }) }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, usePathname: mocks.pathname }));
vi.mock('@/features/planner/workspace', () => ({ Workspace: () => <div>Planning workspace</div> }));
vi.mock('@/features/survey/community-survey', () => ({
  CommunitySurvey: () => <div>Anonymous check-in form</div>,
}));
vi.mock('@/features/survey/creator-results', () => ({
  CreatorResults: () => <div>Private results</div>,
}));
import Home from '@/app/page';
import Planner from '@/app/planner/page';
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
import { Header } from '@/components/header';

beforeEach(() => {
  mocks.pathname.mockReturnValue('/');
});

describe('crawlable pages and meaningful framework states', () => {
  it('connects the homepage to the planner and source methodology using published data', async () => {
    mocks.load.mockResolvedValue(dataset);
    mocks.boundaries.mockResolvedValue([{ id: '12095', path: 'M0,0 L10,0 L0,10Z' }]);
    const home = render(await Home());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Put your next pantryon the map.',
    );
    for (const link of screen.getAllByRole('link', { name: 'Go to planner' })) {
      expect(link).toHaveAttribute('href', '/planner');
    }
    expect(screen.getByRole('link', { name: 'Our approach' })).toHaveAttribute(
      'href',
      '/methodology',
    );
    expect(screen.getByText('3 Census tracts · Illustrative test data')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Census boundaries/ }).querySelectorAll('path'),
    ).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Counties in the study area' })).toHaveTextContent(
      'LakeOrange',
    );
    for (const [href, name] of [
      ['/resources', 'Resources'],
      ['/methodology', 'Data & methods'],
      ['/about', 'About FARA'],
    ]) {
      expect(
        within(screen.getByRole('contentinfo')).getByRole('link', {
          name,
        }),
      ).toHaveAttribute('href', href);
    }
    home.unmount();
    mocks.load.mockResolvedValue({
      ...dataset,
      manifest: { ...dataset.manifest, mode: 'observed' },
    });
    const observed = render(await Home());
    expect(screen.getByText('3 Census tracts · 2020 Census boundaries')).toBeInTheDocument();
    expect(screen.queryByText(/Illustrative test data/)).not.toBeInTheDocument();
    observed.unmount();
    render(await Planner());
    expect(screen.getByText('Planning workspace')).toBeInTheDocument();
    render(await Methodology());
    expect(screen.getByRole('heading', { level: 1, name: 'Data & methods' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Two signals/ })).toBeInTheDocument();
    expect(screen.getByText(/schema 1.0/)).toBeInTheDocument();
  });
  it('has accurate about, loading, failure, 404, metadata and navigation', async () => {
    const about = render(<About />);
    expect(screen.getByRole('heading', { level: 1, name: 'About FARA' })).toBeInTheDocument();
    expect(screen.getByText(/not an official DataKind/)).toBeInTheDocument();
    const footer = within(screen.getByRole('contentinfo'));
    expect(footer.getByText('U.S. Census · USDA ERS')).toBeInTheDocument();
    expect(footer.getByRole('link', { name: 'Data & methods' })).toHaveAttribute(
      'href',
      '/methodology',
    );
    expect(footer.getByRole('link', { name: 'About FARA' })).toHaveAttribute('href', '/about');
    expect(footer.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources');
    expect(screen.queryByText(/hackathon/i)).not.toBeInTheDocument();
    about.unmount();
    render(<Loading />);
    expect(screen.getByText('Loading FARA…')).toBeInTheDocument();
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Return to the planner' })).toHaveAttribute(
      'href',
      '/planner',
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
    expect(screen.getByText('Illustrative test data')).toBeInTheDocument();
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

describe('main navigation', () => {
  it('returns to the homepage from the planner and identifies the home wordmark', () => {
    mocks.pathname.mockReturnValue('/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'FARA home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'FARA home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Go to planner' })).toHaveAttribute('href', '/planner');
  });
  it.each([
    ['/planner', 'Go to planner'],
    ['/resources', 'Resources'],
    ['/methodology', 'Methodology'],
    ['/about', 'About'],
  ])('identifies %s as the current page', (pathname, label) => {
    mocks.pathname.mockReturnValue(pathname);
    render(<Header />);
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    const current = nav.getByRole('link', { name: label });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('data-active', 'true');
    expect(nav.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toEqual([
      current,
    ]);
    const about = nav.getByRole('link', { name: 'About' });
    expect(about).toHaveAttribute('href', '/about');
    expect(about).not.toHaveAttribute('target');
    expect(about.querySelector('svg')).toBeNull();
    expect(screen.getByRole('link', { name: 'FARA home' })).toHaveTextContent(/^FARA$/);
    expect(screen.queryByText('Central Florida · Prototype')).not.toBeInTheDocument();
  });
  it.each(['/plans/example', '/plans/example/manage'])(
    'keeps Planner section-active on %s without marking the link as the current page',
    (pathname) => {
      mocks.pathname.mockReturnValue(pathname);
      render(<Header />);
      const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
      expect(nav.getByRole('link', { name: 'Go to planner' })).toHaveAttribute(
        'data-active',
        'true',
      );
      for (const link of nav.getAllByRole('link')) {
        expect(link).not.toHaveAttribute('aria-current');
      }
    },
  );
  it('does not mark unrelated routes as part of the planning section', () => {
    mocks.pathname.mockReturnValue('/unavailable');
    render(<Header />);
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    for (const link of nav.getAllByRole('link')) {
      expect(link).toHaveAttribute('data-active', 'false');
      expect(link).not.toHaveAttribute('aria-current');
    }
  });
  it('opens and closes the menu and closes it after choosing a destination or the wordmark', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(toggle).toHaveAttribute('aria-controls', navigation.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(navigation).toHaveAttribute('data-open', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(navigation).toHaveAttribute('data-open', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const resources = within(navigation).getByRole('link', { name: 'Resources' });
    resources.addEventListener('click', (event) => event.preventDefault());
    await user.click(resources);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const home = screen.getByRole('link', { name: 'FARA home' });
    home.addEventListener('click', (event) => event.preventDefault());
    await user.click(home);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
  it('closes an open menu with Escape and returns focus without consuming other keys', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    const resources = within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole(
      'link',
      { name: 'Resources' },
    );
    await user.click(toggle);
    resources.focus();
    await user.keyboard('{ArrowDown}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(resources).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    resources.focus();
    await user.keyboard('{Escape}');
    expect(resources).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
