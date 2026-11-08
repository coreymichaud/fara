'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { product } from '@/config/product';

const navigation = [
  { href: '/resources', label: 'Resources' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
  { href: '/planner', label: 'Go to planner' },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          event.preventDefault();
          setMenuOpen(false);
          menuButton.current!.focus();
        }
      }}
    >
      <Link
        href="/"
        className="wordmark"
        aria-label={`${product.name} home`}
        aria-current={pathname === '/' ? 'page' : undefined}
        onClick={() => setMenuOpen(false)}
      >
        {product.name}
      </Link>
      <span className="header-descriptor">{product.fullName}</span>
      <button
        ref={menuButton}
        type="button"
        className="menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        Menu
      </button>
      <nav id="main-navigation" aria-label="Main navigation" data-open={menuOpen}>
        {navigation.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={href === '/planner' ? 'nav-planner' : undefined}
            aria-current={pathname === href ? 'page' : undefined}
            data-active={
              pathname === href || (href === '/planner' && pathname.startsWith('/plans/'))
            }
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
