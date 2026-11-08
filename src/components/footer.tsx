import Link from 'next/link';
import { product } from '@/config/product';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-branding">
        <span>
          © {new Date().getUTCFullYear()} {product.name}
        </span>
        <span className="footer-note">{product.footerNote}</span>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/resources">Resources</Link>
        <Link href="/methodology">Data &amp; Methods</Link>
        <Link href="/about">About {product.name}</Link>
      </nav>
    </footer>
  );
}
