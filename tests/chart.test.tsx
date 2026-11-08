import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EvidenceChart } from '@/features/planner/evidence-chart';
import { areas } from './fixtures';
it('provides a textual data alternative without size warnings when the panel is hidden', () => {
  const warn = vi.spyOn(console, 'warn');
  const view = render(<EvidenceChart area={areas[0]} areas={areas} />);
  expect(screen.getByText(/county mean 20.0 percent/)).toBeInTheDocument();
  view.rerender(
    <EvidenceChart area={{ ...areas[0], poverty: null, lowAccess: null }} areas={[]} />,
  );
  expect(
    screen.getByText(/Selected tract poverty: missing percent; county mean unavailable/),
  ).toBeInTheDocument();
  expect(warn).not.toHaveBeenCalled();
});
it('renders percent axes and formats an accessible keyboard tooltip', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 360,
    height: 125,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 360,
    bottom: 125,
    toJSON: () => ({}),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 360, height: 125 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
  const view = render(<EvidenceChart area={areas[0]} areas={areas} />);
  expect(await screen.findByText('100%')).toBeInTheDocument();
  const chart = view.container.querySelector('svg[role="application"]')!;
  fireEvent.focus(chart);
  fireEvent.keyDown(chart, { key: 'ArrowRight' });
  await waitFor(() => expect(screen.getByText('10.0%')).toBeInTheDocument());
});
