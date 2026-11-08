import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { product } from '@/config/product';
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label={`${product.name} home`}>
        {product.name}
        <span className="wordmark-dot" />
      </Link>
      <span className="header-descriptor">{product.fullName}</span>
      <nav aria-label="Main navigation">
        <Link href="/">Planner</Link>
        <Link href="/methodology">Methodology</Link>
        <Link href="/about">
          About <ArrowUpRight size={14} />
        </Link>
      </nav>
      <span className="prototype-tag">Central Florida · Prototype</span>
    </header>
  );
}
