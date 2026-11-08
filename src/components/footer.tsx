import Link from 'next/link';
import { product } from '@/config/product';
export function Footer() {
  return (
    <footer className="site-footer">
      <span>{product.footer}</span>
      <Link href="/methodology">Sources & assumptions ↗</Link>
    </footer>
  );
}
