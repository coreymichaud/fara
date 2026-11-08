'use client';

import { useEffect, useState } from 'react';

export type ContentsItem = { id: string; label: string };

export function PageContents({
  items,
  label,
  className,
}: {
  items: readonly ContentsItem[];
  label: string;
  className: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const targets = items.flatMap((item) => {
      const element = document.getElementById(item.id);
      return element ? [{ id: item.id, element }] : [];
    });
    let frame: number | null = null;
    const update = () => {
      frame = null;
      let current = targets[0]?.id ?? '';
      // Keep a topic active through any unlisted subsections that follow it.
      for (const target of targets) {
        if (target.element.getBoundingClientRect().top <= 120) current = target.id;
      }
      // A short final section may never reach the top of the viewport.
      if (Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight) {
        current = targets.at(-1)?.id ?? '';
      }
      setActive(current);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [items]);

  if (!items.length) return null;
  return (
    <nav className={`page-contents ${className}`} aria-label={label}>
      <p className="eyebrow">On this page</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? 'location' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
