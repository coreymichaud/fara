import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { loadDataset } from '@/lib/data/load';
import { loadStudyMap } from '@/lib/data/study-map';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ manifest }, boundaries] = await Promise.all([loadDataset(), loadStudyMap()]);
  return (
    <>
      <main id="main" className="home-page">
        <section className="home-hero" aria-labelledby="home-title">
          <p className="eyebrow">Central Florida · Pantry Planning</p>
          <h1 id="home-title">
            Put your next pantry
            <br />
            <span>on the map.</span>
          </h1>
          <p className="hero-description">
            Explore local food-access data. Compare locations. Make a mobile pantry plan with room
            for local knowledge.
          </p>
          <div className="hero-actions">
            <Button variant="accent" asChild>
              <Link href="/planner">Go to planner</Link>
            </Button>
            <Link className="home-text-link" href="/methodology">
              Our approach
            </Link>
          </div>
        </section>
        <figure className="home-atlas" aria-labelledby="atlas-caption">
          <div className="atlas-heading">
            <span>The study area</span>
            <span aria-hidden="true">N ↑</span>
          </div>
          <svg
            viewBox="0 0 760 1050"
            role="img"
            aria-label="Census boundaries of the Central Florida study area"
          >
            {boundaries.map(({ id, path }) => (
              <path key={id} d={path} fillRule="evenodd" />
            ))}
            <g className="atlas-labels" aria-hidden="true">
              <text x="200" y="300">
                Lake
              </text>
              <text x="445" y="480">
                Orange
              </text>
              <text x="450" y="750">
                Osceola
              </text>
              <text x="480" y="365">
                Seminole
              </text>
            </g>
          </svg>
          <figcaption id="atlas-caption">
            <ul className="atlas-counties" aria-label="Counties in the study area">
              {manifest.geography.map((county) => (
                <li key={county}>{county}</li>
              ))}
            </ul>
            <span className="atlas-meta">
              {manifest.areaCount.toLocaleString('en-US')} Census tracts ·{' '}
              {manifest.mode === 'illustrative' ? 'Illustrative test data' : '2020 boundaries'}
            </span>
          </figcaption>
        </figure>
      </main>
      <Footer />
    </>
  );
}
