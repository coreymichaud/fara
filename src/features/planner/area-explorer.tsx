import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, Info, Layers, Plus, Star } from 'lucide-react';
import { evaluate, type ScoredArea, type rankCandidates } from '@/lib/domain/planner';
import type { Dataset, Scenario } from '@/lib/domain/schema';
import type { WorkspaceActions } from './workspace-types';

type AreaExplorerProps = WorkspaceActions & {
  data: Dataset;
  scenario: Scenario;
  scored: ScoredArea[];
  selected: ScoredArea;
  ranked: ReturnType<typeof rankCandidates>;
};

export function AreaExplorer({
  data,
  scenario,
  scored,
  selected,
  ranked,
  update,
  select,
  decision,
  reorder,
}: AreaExplorerProps) {
  const [availability, setAvailability] = useState('comparable');
  const list =
    availability === 'missing'
      ? scored
          .filter(
            (area) =>
              (scenario.county === 'all' || area.county === scenario.county) &&
              area.priority === null,
          )
          .map((area) => ({
            area,
            result: evaluate(scored, { ...scenario, coordinates: area.coordinates }),
          }))
      : ranked.slice(0, 5);
  const shortlist = scenario.shortlist.map((id) => scored.find((area) => area.id === id)!);

  return (
    <aside className="analysis-rail" aria-label="Area explorer">
      <div className="rail-heading">
        <h2>Suggested areas</h2>
      </div>
      <label className="field">
        Study area
        <select
          value={scenario.county}
          onChange={(e) => {
            const county = e.target.value;
            const next =
              ranked.find((r) => county === 'all' || r.area.county === county)?.area ??
              scored.find((a) => a.county === county && a.priority !== null);
            update({
              county,
              ...(next ? { candidateId: next.id, coordinates: next.coordinates } : {}),
            });
          }}
        >
          <option value="all">All four counties</option>
          {data.manifest.geography.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <details className="index-settings">
        <summary>
          <Layers size={15} /> Priority index weights
        </summary>
        <p>
          Higher poverty and a larger share living over 1 mile from a SNAP retailer increase
          relative priority. SNAP participation is context only.
        </p>
        <label className="range-label" htmlFor="weight">
          <span>Poverty</span>
          <strong>{scenario.povertyWeight}%</strong>
        </label>
        <input
          id="weight"
          type="range"
          min="0"
          max="100"
          step="5"
          value={scenario.povertyWeight}
          onChange={(e) => update({ povertyWeight: Number(e.target.value) })}
        />
        <div className="range-label">
          <span>Retail distance</span>
          <strong>{100 - scenario.povertyWeight}%</strong>
        </div>
        <Link href="/methodology">How the index works</Link>
      </details>
      <div className="section-heading">
        <h3>Candidates</h3>
        <span>{ranked.length} eligible</span>
      </div>
      <label className="sr-only" htmlFor="availability">
        Data availability
      </label>
      <select
        id="availability"
        className="availability"
        value={availability}
        onChange={(e) => setAvailability(e.target.value)}
      >
        <option value="comparable">Comparable indicators</option>
        <option value="missing">Missing indicators</option>
      </select>
      <p className="rail-note">
        Ordered by planning value for your radius and capacity. Candidate areas are not confirmed
        venues.
      </p>
      <ol className="candidate-list">
        {list.map(({ area, result: potential }, i) => (
          <li key={area.id} className={area.id === selected.id ? 'selected' : ''}>
            <button
              className="candidate-main"
              onClick={() => select(area.id)}
              aria-pressed={area.id === selected.id}
            >
              <span className="candidate-rank">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <strong>{area.label.replace('Census ', '')}</strong>
                <small>{area.county} County</small>
              </span>
              <span className="candidate-value">
                {area.priority === null ? '—' : potential.planningValue.toFixed(0)}
                <small>plan value</small>
              </span>
            </button>
            <div className="candidate-meta">
              <span>Tract points in radius: {potential.areaCount}</span>
              <button
                className="icon-button"
                aria-label={`Shortlist ${area.label}`}
                onClick={() => decision(area.id, 'shortlisted')}
                disabled={scenario.shortlist.includes(area.id)}
              >
                {scenario.shortlist.includes(area.id) ? <Check size={15} /> : <Plus size={15} />}
              </button>
            </div>
          </li>
        ))}
      </ol>
      {list.length === 0 && (
        <p className="empty-state">
          No areas match this filter. Try another county or restore a challenged candidate.
        </p>
      )}
      {shortlist.length > 0 && (
        <section className="shortlist">
          <div className="section-heading">
            <h3>
              <Star size={14} /> Your shortlist
            </h3>
            <span>{shortlist.length}/10</span>
          </div>
          {shortlist.map((a, i) => (
            <div className="shortlist-row" key={a.id}>
              <button onClick={() => select(a.id)}>
                {i + 1}. {a.label.replace('Census ', '')}
              </button>
              <button
                className="icon-button"
                disabled={i === 0}
                aria-label={`Move ${a.label} up`}
                onClick={() => reorder(i, -1)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-button"
                disabled={i === shortlist.length - 1}
                aria-label={`Move ${a.label} down`}
                onClick={() => reorder(i, 1)}
              >
                <ArrowDown size={14} />
              </button>
            </div>
          ))}
        </section>
      )}
      {scenario.decisions.some((d) => d.status !== 'shortlisted') && (
        <details className="challenge-history">
          <summary>
            Challenged candidates (
            {scenario.decisions.filter((d) => d.status !== 'shortlisted').length})
          </summary>
          {scenario.decisions
            .filter((d) => d.status !== 'shortlisted')
            .map((d) => (
              <div key={d.id}>
                <span>
                  {scored.find((a) => a.id === d.id)?.label}: {d.reason ?? d.status}
                </span>
                <button
                  onClick={() =>
                    update({ decisions: scenario.decisions.filter((v) => v.id !== d.id) })
                  }
                >
                  Restore
                </button>
              </div>
            ))}
        </details>
      )}
      <div className="rail-bottom">
        <Info size={15} />
        <span>Relative priority is a planning signal, not a probability of food insecurity.</span>
      </div>
    </aside>
  );
}
