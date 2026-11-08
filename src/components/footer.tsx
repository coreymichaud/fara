import Link from 'next/link';
import { product } from '@/config/product';
export function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-sources">{product.sourceCredit}</span>
      <nav aria-label="Footer navigation">
        <Link href="/methodology">Data & methods</Link>
        <Link href="/about">About {product.name}</Link>
      </nav>
    </footer>
  );
}
