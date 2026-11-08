import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { product } from '@/config/product';
import { CommunitySurvey } from '@/features/survey/community-survey';
import { loadPublicPlan } from '@/lib/server/load-public-plan';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: 'Community check-in | FARA',
  description: 'Share anonymous feedback on a proposed mobile pantry location and time.',
};

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scenario, area, manifest, surveyEnabled } = await loadPublicPlan(id);
  return (
    <main id="main" className="reading-page participant-page">
      <div className="participant-brand">
        <span>{product.name}</span>
        <span>Community check-in</span>
      </div>
      <h1>Would this work for you?</h1>
      <p className="page-lead">
        Help the organizer understand whether this proposed pantry location and time work for your
        community. The check-in is voluntary and anonymous.
      </p>
      {manifest.mode === 'illustrative' && (
        <div className="illustrative">Illustrative test data</div>
      )}
      <section className="participant-event" aria-labelledby="proposal-heading">
        <p className="eyebrow">The proposal</p>
        <h2 id="proposal-heading">{scenario.title}</h2>
        <dl>
          <div>
            <dt>Proposed location</dt>
            <dd>
              {area.label} · {area.county} County
            </dd>
            <dd>
              <a
                className="inline-arrow"
                href={`https://www.openstreetmap.org/?mlat=${scenario.coordinates[1]}&mlon=${scenario.coordinates[0]}#map=14/${scenario.coordinates[1]}/${scenario.coordinates[0]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View proposed location on map <ArrowUpRight size={16} aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </dd>
          </div>
          <div>
            <dt>Proposed time</dt>
            <dd>
              {scenario.day}, {scenario.start}–{scenario.end}
            </dd>
            <dd className="participant-timezone">Eastern time · America/New_York</dd>
          </div>
        </dl>
        <p className="participant-notice">
          This is a proposed event, not a confirmed service or registration. Your check-in does not
          reserve food or a place.
        </p>
      </section>
      {surveyEnabled ? (
        <CommunitySurvey id={id} />
      ) : (
        <p className="callout" role="status">
          Community check-in is closed for this plan.
        </p>
      )}
      <Link className="participant-plan-link" href={`/plans/${id}`}>
        View the full proposal and planning details
      </Link>
    </main>
  );
}
