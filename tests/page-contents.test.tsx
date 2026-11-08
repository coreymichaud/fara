import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageContents, type ContentsItem } from '@/components/page-contents';

const items = [
  { id: 'first', label: 'First topic' },
  { id: 'second', label: 'Second topic' },
  { id: 'third', label: 'Third topic' },
];
let positions: Record<string, number>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

function Fixture({
  topics = items,
  missing = [],
}: {
  topics?: readonly ContentsItem[];
  missing?: string[];
}) {
  return (
    <>
      <PageContents items={topics} label="Page topics" className="test-topics" />
      {topics
        .filter((item) => !missing.includes(item.id))
        .map((item) => (
          <h2 id={item.id} key={item.id}>
            {item.label}
          </h2>
        ))}
    </>
  );
}
function flushFrame() {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  });
}
function current() {
  return screen.getByRole('link', { current: 'location' });
}

beforeEach(() => {
  positions = { first: 400, second: 1200, third: 2200 };
  frames = new Map();
  nextFrame = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return new DOMRect(0, positions[this.id], 200, 30);
  });
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);
  vi.stubGlobal('scrollY', 0);
});

describe('scroll-aware page contents', () => {
  it('preserves native anchors and follows scrolling in both directions, including the activation boundary', () => {
    render(<Fixture />);
    expect(screen.getByRole('navigation', { name: 'Page topics' })).toHaveClass('page-contents');
    expect(current()).toHaveAttribute('href', '#first');
    flushFrame();
    expect(current()).toHaveAttribute('href', '#first');
    for (const item of items)
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', `#${item.id}`);

    positions = { first: -600, second: 120, third: 900 };
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#second');
    expect(
      screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);

    positions.second = 121;
    fireEvent.resize(window);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#first');
    positions.second = 24;
    fireEvent(window, new Event('hashchange'));
    flushFrame();
    expect(current()).toHaveAttribute('href', '#second');
    positions = { first: 400, second: 1200, third: 2200 };
    fireEvent.scroll(window);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#first');
  });

  it('recognizes a restored scroll position and a short final section at the bottom', () => {
    positions = { first: -2000, second: -1000, third: 300 };
    vi.stubGlobal('scrollY', 5000 - window.innerHeight);
    render(<Fixture />);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#third');
  });

  it('ignores absent targets and updates when the table of contents changes', () => {
    const view = render(<Fixture missing={['first']} />);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#second');
    positions.third = 24;
    view.rerender(<Fixture topics={[items[2]]} />);
    flushFrame();
    expect(current()).toHaveAttribute('href', '#third');
  });

  it('does not render an empty navigation and safely handles a page without targets', () => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(0);
    render(<Fixture topics={[]} />);
    flushFrame();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('cancels scheduled work and removes listeners on unmount', () => {
    const view = render(<Fixture />);
    expect(frames.size).toBe(1);
    view.unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(frames.size).toBe(0);
    fireEvent.scroll(window);
    fireEvent.resize(window);
    fireEvent(window, new Event('hashchange'));
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
  });
});
