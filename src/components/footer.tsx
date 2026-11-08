import Link from 'next/link';
import { product } from '@/config/product';
export function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-note">{product.footerNote}</span>
      <nav aria-label="Footer navigation">
        <Link href="/resources">Resources</Link>
        <Link href="/methodology">Data &amp; Methods</Link>
        <Link href="/about">About {product.name}</Link>
      </nav>
    </footer>
  );
}
