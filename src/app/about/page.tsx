import Link from 'next/link';
import { product } from '@/config/product';
import { Footer } from '@/components/footer';
export default function About() {
  return (
    <>
      <main id="main" className="reading-page">
        <div className="eyebrow">{product.fullName}</div>
        <h1>About {product.name}</h1>
        <p className="page-lead">
          {product.name} helps food banks and pantry operators plan mobile distribution events in
          Lake, Orange, Osceola, and Seminole counties.
        </p>
        <section>
          <h2>Planning an event</h2>
          <p>
            Select an area, review its poverty and retail-distance indicators, and set a proposed
            location, radius, schedule, and capacity. Compare alternatives and record venue concerns
            before saving a plan. The public plan can include a short anonymous check-in about the
            location and time.
          </p>
        </section>
        <section>
          <h2>What needs a local check</h2>
          <p>
            Public indicators cannot confirm venue permission, safety, accessibility, current pantry
            services, or demand. The map uses straight-line distances and tract representative
            points. It does not predict attendance, travel time, or people served. A saved proposal
            is not a confirmed event or a promise of food availability.
          </p>
        </section>
        <section>
          <h2>Data and project background</h2>
          <p>
            {product.name} uses public U.S. Census and USDA datasets supplied through Beacon, with
            Beacon’s April 2026 design guidelines. It is independently built and is not an official
            DataKind product or a Beacon integration. Source years, definitions, and model
            limitations are described in <Link href="/methodology">Data & methods</Link>.
          </p>
        </section>
        <section>
          <h2>Calculations and development</h2>
          <p>
            Scoring and proximity calculations are deterministic. The application does not use
            generative AI or machine learning. AI assistance was used during software development.
          </p>
        </section>
        <Link href="/">Open the planner</Link>
      </main>
      <Footer />
    </>
  );
}
