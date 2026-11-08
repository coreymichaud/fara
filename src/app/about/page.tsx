import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { product } from '@/config/product';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: `About | ${product.name}`,
  description:
    'How FARA helps Central Florida food banks and pantry operators plan mobile distribution events.',
};
export default function About() {
  return (
    <>
      <main id="main" className="editorial-page about-page">
        <header className="editorial-heading">
          <h1>About {product.name}</h1>
        </header>
        <section className="about-opening" aria-labelledby="planning-heading">
          <div>
            <p className="eyebrow">Public data. Local judgment.</p>
            <h2 id="planning-heading">Planning an event</h2>
            <Button variant="accent" asChild>
              <Link href="/planner">Go to planner</Link>
            </Button>
          </div>
          <div>
            <p>
              {product.name} helps food banks and pantry operators plan mobile distribution events
              in Lake, Orange, Osceola, and Seminole counties.
            </p>
            <p>
              Select an area, review its poverty and retail-distance indicators, and set a proposed
              location, radius, schedule, and capacity. Compare alternatives and record venue
              concerns before saving a plan.
            </p>
            <p>
              A shared plan can include a short anonymous check-in about the location and time. It
              gives people a way to question the proposal before an event is confirmed.
            </p>
          </div>
        </section>
        <section className="about-local" aria-labelledby="local-heading">
          <h2 id="local-heading">What needs a local check</h2>
          <div>
            <ul className="local-checks" aria-label="Checks to make locally">
              <li>Venue permission</li>
              <li>Safety</li>
              <li>Accessibility</li>
              <li>Current pantry services</li>
              <li>Community demand</li>
            </ul>
            <p>Public indicators cannot confirm any of these.</p>
            <p>
              The map uses straight-line distances and tract representative points. It does not
              predict attendance, travel time, or people served. A saved proposal is not a confirmed
              event or a promise of food availability.
            </p>
          </div>
        </section>
        <div className="about-background">
          <section>
            <p className="eyebrow">The sources</p>
            <h2>Data and project background</h2>
            <p>
              {product.name} uses public U.S. Census and USDA datasets supplied through Beacon, with
              Beacon’s April 2026 design guidelines. It is independently built and is not an
              official DataKind product or a Beacon integration.
            </p>
            <Link className="editorial-link" href="/methodology">
              Explore Data &amp; Methods
            </Link>
          </section>
          <section>
            <p className="eyebrow">The software</p>
            <h2>Calculations and development</h2>
            <p>
              Scoring and proximity calculations are deterministic. The application does not use
              generative AI or machine learning. AI assistance was used during software development.
            </p>
            <Link className="editorial-link" href="/resources">
              Resources for nonprofit teams
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
