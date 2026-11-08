import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/footer';
import { getRepository } from '@/lib/storage';
import { ApiError, publicPlan, requirePlan } from '@/lib/server/plans';
import { CommunitySurvey } from '@/features/survey/community-survey';
import { product } from '@/config/product';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await requirePlan(getRepository(), id)
    .then(publicPlan)
    .catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    });
  const { scenario, result, area, manifest } = plan;
  return (
    <>
      <main id="main" className="reading-page public-plan">
        <div className="eyebrow">{product.name} · Saved plan</div>
        {manifest.mode === 'illustrative' && (
          <div className="illustrative">Illustrative test data</div>
        )}
        <h1>{scenario.title}</h1>
        <p className="public-subtitle">
          Proposed mobile pantry event. This saved plan is read-only.
        </p>
        <div className="plan-location">
          <span>Proposed location</span>
          <h2>
            {area.label} · {area.county} County
          </h2>
          <p>
            {scenario.coordinates[1].toFixed(6)}, {scenario.coordinates[0].toFixed(6)} ·{' '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${scenario.coordinates[1]}&mlon=${scenario.coordinates[0]}#map=14/${scenario.coordinates[1]}/${scenario.coordinates[0]}`}
              target="_blank"
              rel="noreferrer"
            >
              View location on OpenStreetMap ↗
            </a>
          </p>
          <p>
            {scenario.day}, {scenario.start}–{scenario.end} · America/New_York
          </p>
          <div className="public-kpis">
            <div>
              <strong>{scenario.radius} mi</strong>
              <span>straight-line radius</span>
            </div>
            <div>
              <strong>{result.areaCount}</strong>
              <span>tract points in radius</span>
            </div>
            <div>
              <strong>{scenario.capacity}</strong>
              <span>household slots · entered capacity</span>
            </div>
          </div>
        </div>
        <section>
          <h2>Planning estimate</h2>
          <p>
            The planning value is {result.planningValue.toFixed(1)} abstract index units.
            Approximately {result.householdsInTracts.toLocaleString()} occupied housing units were
            recorded in 2020 across the entire tracts whose representative points fall within this
            radius. These are whole-tract totals, not a count of households inside the circle. The
            modeled capacity ceiling is {result.capacityCeiling} household slots.
          </p>
          <p className="callout">
            Current pantry service coverage is unknown. This is potential reach of a proposed site,
            not measured improvement, predicted attendance, or people served. Venue suitability and
            access must be verified locally.
          </p>
          {result.budgetFeasible !== null && (
            <p>
              Operator-entered event cost: ${scenario.cost?.toLocaleString()}; available budget: $
              {scenario.budget?.toLocaleString()}.{' '}
              {result.budgetFeasible ? 'Within the entered budget.' : 'Above the entered budget.'}
            </p>
          )}
        </section>
        <section>
          <h2>Area indicators</h2>
          <p>
            Poverty: {area.poverty ?? 'not available'}% (ACS 2020–2024; 90% margin of error ±
            {area.povertyMoe ?? 'unknown'} percentage points). Population over 1 straight-line mile
            from a SNAP retailer: {area.lowAccess ?? 'not available'}% (2025 retail locations / 2020
            population). Poverty weight {scenario.povertyWeight}%; retail distance weight{' '}
            {100 - scenario.povertyWeight}%. SNAP participation is context, not an unmet-need
            measure.
          </p>
        </section>
        {scenario.note && (
          <section>
            <h2>Operator note</h2>
            <p className="operator-note">{scenario.note}</p>
          </section>
        )}
        {plan.alternatives.length > 0 && (
          <section>
            <h2>Alternatives considered</h2>
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Tract points</th>
                  <th>Planning value</th>
                </tr>
              </thead>
              <tbody>
                {plan.alternatives.map((a) => (
                  <tr key={a.id}>
                    <td>{a.label}</td>
                    <td>{a.result.areaCount}</td>
                    <td>{a.result.planningValue.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {scenario.decisions.length > 0 && (
          <section>
            <h2>Location decisions</h2>
            <ul>
              {scenario.decisions.map((d) => (
                <li key={d.id}>
                  Tract {d.id}: {d.status}
                  {d.reason ? ` · ${d.reason}` : ''}
                </li>
              ))}
            </ul>
            <p>
              Shortlist order:{' '}
              {scenario.shortlist.length
                ? scenario.shortlist.join(' → ')
                : 'No candidates shortlisted'}
              .
            </p>
          </section>
        )}
        <section className="community-section">
          <div className="eyebrow">Community check-in</div>
          <h2>Would this work for you?</h2>
          <p>
            This is a proposed event, not a confirmed service or registration. Your check-in does
            not reserve food or a place.
          </p>
          {plan.surveyEnabled ? (
            <CommunitySurvey id={id} />
          ) : (
            <p className="callout">Community check-in is closed for this plan.</p>
          )}
        </section>
        <section className="provenance">
          <h2>Sources & assumptions</h2>
          <p>
            Saved{' '}
            {new Date(plan.createdAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
            . Data version <code>{manifest.datasetVersion}</code>. Method{' '}
            <code>{manifest.methodVersion}</code>. Data mode: {manifest.mode}. Source vintages:
            Census 2020, ACS 2020–2024, USDA SRAM 2025. Retailer snapshot capture date unknown.
            Source hashes and units are retained in this immutable snapshot.
          </p>
          <Link href="/methodology">Read data sources, methods, and limitations</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
