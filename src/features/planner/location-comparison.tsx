import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import {
  evaluate,
  type ModelResult,
  type ScoredArea,
  type rankCandidates,
} from '@/lib/domain/planner';
import type { Scenario } from '@/lib/domain/schema';
import type { WorkspaceActions } from './workspace-types';

type LocationComparisonProps = Pick<WorkspaceActions, 'update' | 'select'> & {
  selected: ScoredArea;
  scored: ScoredArea[];
  ranked: ReturnType<typeof rankCandidates>;
  scenario: Scenario;
  result: ModelResult;
  sensitivity: { radius: number; top: string | undefined }[];
  weightSensitivity: string[];
};

export function LocationComparison({
  selected,
  scored,
  ranked,
  scenario,
  result,
  sensitivity,
  weightSensitivity,
  update,
  select,
}: LocationComparisonProps) {
  return (
    <>
      <div className="eyebrow">Location comparison</div>
      <h2>Compare locations</h2>
      <p className="panel-intro">
        Current pantry service coverage is unknown. These are proposed-site scenarios, not
        before-and-after results.
      </p>
      <div className="comparison-current">
        <span>Current selection</span>
        <strong>{selected.label}</strong>
        <dl>
          <div>
            <dt>Tract points in radius</dt>
            <dd>{result.areaCount}</dd>
          </div>
          <div>
            <dt>
              Planning value{' '}
              <abbr title="Capacity ceiling × household-weighted mean priority / 100. Abstract index units, not people served.">
                ⓘ
              </abbr>
            </dt>
            <dd>{result.planningValue.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Households in entire included tracts</dt>
            <dd>≈{result.householdsInTracts.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Capacity ceiling · household slots</dt>
            <dd>{result.capacityCeiling.toLocaleString()}</dd>
          </div>
        </dl>
        <p className="fine-print">
          Whole-tract 2020 household totals assigned to representative points. Not a count of
          households inside the circle or expected recipients.
        </p>
      </div>
      <label className="field">
        Add up to two alternatives
        <select
          value=""
          disabled={scenario.comparisons.length >= 2}
          onChange={(e) => {
            if (e.target.value) update({ comparisons: [...scenario.comparisons, e.target.value] });
          }}
        >
          <option value="">Choose a ranked candidate…</option>
          {ranked
            .filter((r) => r.area.id !== selected.id && !scenario.comparisons.includes(r.area.id))
            .slice(0, 20)
            .map((r) => (
              <option value={r.area.id} key={r.area.id}>
                {r.area.label} · {r.area.county}
              </option>
            ))}
        </select>
      </label>
      {scenario.comparisons.map((id) => {
        const a = scored.find((v) => v.id === id)!;
        const alt = evaluate(scored, { ...scenario, coordinates: a.coordinates });
        return (
          <div className="alternative" key={id}>
            <div>
              <strong>{a.label}</strong>
              <span>
                {alt.areaCount} tracts · {alt.planningValue.toFixed(1)} planning value
              </span>
            </div>
            <button
              className="icon-button"
              aria-label={`Remove comparison ${a.label}`}
              onClick={() => update({ comparisons: scenario.comparisons.filter((v) => v !== id) })}
            >
              <X size={16} />
            </button>
            <button onClick={() => select(id)}>
              Use this site <ArrowRight size={14} />
            </button>
          </div>
        );
      })}
      <details className="sensitivity">
        <summary>Radius sensitivity</summary>
        <p>
          The top candidate may change as the catchment changes. This is model sensitivity, not
          statistical confidence.
        </p>
        {sensitivity.map((s) => (
          <div key={s.radius}>
            {s.radius} mi{' '}
            <span>{scored.find((a) => a.id === s.top)?.label ?? 'No eligible candidate'}</span>
          </div>
        ))}
        <p>
          At 25/75 poverty/access weights: {weightSensitivity[0]}. At 75/25: {weightSensitivity[1]}.
        </p>
      </details>
      <Link className="method-link" href="/methodology">
        Read the full method <ArrowRight size={14} />
      </Link>
    </>
  );
}
