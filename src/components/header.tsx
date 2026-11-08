'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { product } from '@/config/product';

const navigation = [
  { href: '/', label: 'Planner' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label={`${product.name} home`}>
        {product.name}
      </Link>
      <span className="header-descriptor">{product.fullName}</span>
      <nav aria-label="Main navigation">
        {navigation.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            data-active={pathname === href || (href === '/' && pathname.startsWith('/plans/'))}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
