import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { product } from '@/config/product';
import { loadDataset } from '@/lib/data/load';
import { loadStudyMap } from '@/lib/data/study-map';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ manifest }, boundaries] = await Promise.all([loadDataset(), loadStudyMap()]);
  return (
    <>
      <main id="main" className="home-page">
        <section className="home-hero" aria-labelledby="home-title">
          <p className="eyebrow">{product.fullName}</p>
          <h1 id="home-title">
            Put your next pantry
            <br />
            on the map.
          </h1>
          <p className="hero-description">
            A place to work out where a mobile pantry could go. Explore local data, compare
            locations, and share a proposal with your community.
          </p>
          <div className="hero-actions">
            <Button variant="accent" asChild>
              <Link href="/planner">Go to planner</Link>
            </Button>
            <a className="home-text-link" href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className="hero-caption">
            Built for food banks and nonprofit teams in Central Florida.
          </p>
        </section>

        <figure className="study-preview" aria-labelledby="study-caption">
          <div className="study-preview-bar">
            <span>{product.name} / Study area</span>
            <span>Central Florida</span>
          </div>
          <div className="study-preview-content">
            <div className="study-preview-copy">
              <p className="eyebrow">A local starting point</p>
              <h2>
                Four counties.
                <br /> A closer look.
              </h2>
              <p>See the places behind the numbers, then bring your local knowledge to the plan.</p>
              <ul className="study-counties" aria-label="Counties in the study area">
                {manifest.geography.map((county) => (
                  <li key={county}>
                    {county}
                    <span>County</span>
                  </li>
                ))}
              </ul>
              <Link href="/planner" className="home-text-link">
                Explore the study area
              </Link>
            </div>
            <div className="study-map">
              <svg
                viewBox="0 0 760 1050"
                role="img"
                aria-label="Census boundaries of the Central Florida study area"
              >
                {boundaries.map(({ id, path }) => (
                  <path key={id} d={path} fillRule="evenodd" />
                ))}
              </svg>
              <span className="study-map-north" aria-hidden="true">
                N ↑
              </span>
            </div>
          </div>
          <figcaption id="study-caption">
            <span>
              {manifest.areaCount.toLocaleString('en-US')} Census tracts ·{' '}
              {manifest.retailerCount.toLocaleString('en-US')} SNAP retailer locations
            </span>
            <span>
              {manifest.mode === 'illustrative'
                ? 'Illustrative test data'
                : 'Study area preview · 2020 Census boundaries'}
            </span>
          </figcaption>
        </figure>

        <section className="home-workflow" id="how-it-works" aria-labelledby="workflow-title">
          <div className="home-section-heading">
            <p className="eyebrow">From a question to a proposal</p>
            <h2 id="workflow-title">
              Room for the data.
              <br />
              Room for what you know.
            </h2>
            <p>
              Public indicators are a starting point. A useful plan also needs the people who know
              the place.
            </p>
          </div>
          <div className="workflow-list">
            <article>
              <span className="workflow-number">01</span>
              <div>
                <h3>Find a place to investigate</h3>
                <p>
                  Explore poverty and retail-distance indicators by Census tract. Adjust their
                  weight and compare areas across the four counties.
                </p>
              </div>
            </article>
            <article>
              <span className="workflow-number">02</span>
              <div>
                <h3>Work through the details</h3>
                <p>
                  Place a proposed event, set a radius and capacity, and compare alternatives.
                  Record venue concerns before saving your proposal.
                </p>
              </div>
            </article>
            <article>
              <span className="workflow-number">03</span>
              <div>
                <h3>Bring the community in</h3>
                <p>
                  Share a saved plan and invite an anonymous check-in on location, time, and
                  barriers. Responses stay separate from the public plan.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="home-library" aria-labelledby="library-title">
          <div className="home-section-heading">
            <p className="eyebrow">Keep a few good references close</p>
            <h2 id="library-title">More than a map.</h2>
          </div>
          <div className="home-library-links">
            <Link href="/resources">
              <span className="eyebrow">For nonprofit teams</span>
              <h3>Resources</h3>
              <p>
                Food program guidance, referral tools, and organizations working in Central Florida.
              </p>
              <span className="home-link-label">Browse resources</span>
            </Link>
            <Link href="/methodology">
              <span className="eyebrow">Know the numbers</span>
              <h3>Data & methods</h3>
              <p>
                Where the data comes from, how calculations work, and what the map cannot tell you.
              </p>
              <span className="home-link-label">Read the methodology</span>
            </Link>
            <Link href="/about">
              <span className="eyebrow">The thinking behind it</span>
              <h3>About {product.name}</h3>
              <p>
                A planning tool for food banks and pantry operators, built around public data and
                local judgment.
              </p>
              <span className="home-link-label">Get to know {product.name}</span>
            </Link>
          </div>
        </section>
        <section className="home-start" aria-labelledby="start-title">
          <div>
            <p className="eyebrow">Start with a place</p>
            <h2 id="start-title">Where could your next pantry go?</h2>
            <p>Open the map and take a closer look.</p>
          </div>
          <Button variant="accent" asChild>
            <Link href="/planner">Go to planner</Link>
          </Button>
        </section>
        <p className="home-limitation">
          A planning proposal is not a confirmed event. FARA does not predict attendance or show
          current pantry coverage.
        </p>
      </main>
      <Footer />
    </>
  );
}
