import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { loadDataset } from '@/lib/data/load';
import { StudyAtlas } from '@/features/home/study-atlas';
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
        <StudyAtlas boundaries={boundaries} {...manifest} />
      </main>
      <Footer />
    </>
  );
}
