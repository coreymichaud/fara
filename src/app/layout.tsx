import type { Metadata } from 'next';
import { product } from '@/config/product';
import { Header } from '@/components/header';
import './globals.css';
export const metadata: Metadata = {
  title: product.title,
  description: product.description,
  robots: { index: false, follow: false },
  openGraph: { title: product.title, description: product.description, type: 'website' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
      </body>
    </html>
  );
}
