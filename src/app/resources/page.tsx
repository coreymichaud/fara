import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Footer } from '@/components/footer';
import { PageContents } from '@/components/page-contents';
import { product } from '@/config/product';
import { resourceSections } from '@/config/resources';

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
          <h1>Resources</h1>
        </header>
        <div className="resources-layout">
          <PageContents
            className="resource-topics"
            label="Resource topics"
            items={resourceSections.map((section) => ({ id: section.id, label: section.title }))}
          />
          <div className="resource-sections">
            {resourceSections.map((section, index) => (
              <section className="resource-section" key={section.id} aria-labelledby={section.id}>
                <div className="reference-section-heading">
                  <span className="section-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
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
                            <span>{resource.title}</span>
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
