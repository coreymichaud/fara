import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Footer } from '@/components/footer';
import { product } from '@/config/product';
import { resourceSections, resourcesReviewedOn } from '@/config/resources';

export const metadata: Metadata = {
  title: `Resources | ${product.name}`,
  description:
    'Pantry operating guidance, benefits and referral tools, and Central Florida organizations for nonprofit teams working on food access.',
};

export default function Resources() {
  return (
    <>
      <main id="main" className="editorial-page resources-page">
        <header className="editorial-heading">
          <div>
            <p className="eyebrow">For nonprofit teams</p>
            <h1>Resources</h1>
          </div>
          <p className="page-lead">
            Practical guidance for running a food program, making a thoughtful referral, and finding
            other organizations working nearby.
          </p>
        </header>
        <div className="resources-layout">
          <nav className="resource-topics" aria-label="Resource topics">
            <p className="eyebrow">On this page</p>
            {resourceSections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="resource-sections">
            <p className="resources-reviewed">
              Links reviewed <time dateTime={resourcesReviewedOn}>November 7, 2026</time>. Provider
              websites open in a new tab.
            </p>
            {resourceSections.map((section) => (
              <section className="resource-section" key={section.id} aria-labelledby={section.id}>
                <div className="resource-section-heading">
                  <h2 id={section.id}>{section.title}</h2>
                  <p>{section.summary}</p>
                </div>
                <ul className="resource-list">
                  {section.resources.map((resource) => (
                    <li className="resource-entry" key={resource.href}>
                      <div className="resource-owner">
                        <span>{resource.organization}</span>
                        <span>{resource.coverage}</span>
                      </div>
                      <div className="resource-description">
                        <h3>
                          <a href={resource.href} target="_blank" rel="noopener noreferrer">
                            {resource.title}
                            <ArrowUpRight size={18} aria-hidden="true" />
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        </h3>
                        <p>{resource.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <aside className="resource-note" aria-label="Before making a referral">
              <h2>Before making a referral</h2>
              <p>
                Confirm current services, costs, eligibility, and access arrangements with the
                organization. These links are a starting point, not a guarantee of assistance or an
                endorsement. They do not establish existing service coverage on the planning map.
              </p>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
