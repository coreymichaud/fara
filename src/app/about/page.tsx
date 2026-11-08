import Link from 'next/link';
import { product } from '@/config/product';
import { Footer } from '@/components/footer';
export default function About() {
  return (
    <>
      <main id="main" className="reading-page">
        <div className="eyebrow">ABOUT THE PROTOTYPE</div>
        <h1>
          Make the next decision
          <br />a better question.
        </h1>
        <p className="page-lead">
          {product.name} ({product.fullName}) helps Central Florida food banks, pantries, and
          community program managers turn public food-access signals into a proposal they can test.
        </p>
        <section>
          <h2>Close the decision loop</h2>
          <p>
            A map can point out a pattern. It cannot confirm a venue, know about an unlisted pantry,
            or tell whether Saturday morning works for nearby residents. This prototype connects
            public evidence, a single mobile-pantry scenario, practitioner challenges, a persistent
            decision brief, and an anonymous community check-in.
          </p>
        </section>
        <section>
          <h2>Built for the Beacon challenge</h2>
          <p>
            An independent Orlando DevFest 2026 Data for Good prototype for Challenge 2: Food Access
            & Nutrition Gaps. It uses locally supplied public datasets and Beacon’s April 2026
            design guidelines. It is built outside Beacon and is not an official DataKind product or
            a Beacon integration.
          </p>
        </section>
        <section>
          <h2>Human judgment stays in the loop</h2>
          <p>
            The application uses deterministic calculations, not generative AI or machine learning.
            AI assistance was used to create the software. Operators must verify current data, venue
            permission, safety, accessibility, community demand, and service duplication before any
            real event. No service or food availability is promised here.
          </p>
        </section>
        <Link href="/">Open the planner →</Link>
      </main>
      <Footer />
    </>
  );
}
