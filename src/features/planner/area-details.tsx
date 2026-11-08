import { ArrowRight, Flag, Info, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScoredArea } from '@/lib/domain/planner';
import { reasons, type Area, type Decision, type Scenario } from '@/lib/domain/schema';
import { EvidenceChart } from './evidence-chart';
import type { WorkspaceActions } from './workspace-types';

type AreaDetailsProps = Pick<WorkspaceActions, 'decision'> & {
  selected: ScoredArea;
  areas: Area[];
  scenario: Scenario;
  onPlan: () => void;
};

export function AreaDetails({ selected, areas, scenario, decision, onPlan }: AreaDetailsProps) {
  const pct = (value: number | null) => (value === null ? 'Not available' : `${value.toFixed(1)}%`);

  return (
    <>
      <div className="eyebrow">Selected census tract</div>
      <div className="area-heading">
        <div>
          <h2>{selected.label.replace('Census ', '')}</h2>
          <p>{selected.county} County, Florida</p>
        </div>
        <span className="priority-badge">
          {selected.priority === null ? '—' : selected.priority.toFixed(0)}
          <small>priority / 100</small>
        </span>
      </div>
      <p className="evidence-lead">
        {selected.priority === null
          ? 'Some indicators are missing or this tract has no occupied households. It is excluded from recommendations.'
          : `${pct(selected.poverty)} of residents with determined poverty status are below the poverty threshold. ${pct(selected.lowAccess)} of the 2020 population lived more than 1 straight-line mile from a 2025 SNAP retailer.`}
      </p>
      <EvidenceChart area={selected} areas={areas} />
      <dl className="indicator-list">
        <div>
          <dt>
            Poverty rate{' '}
            <small>
              ACS 2020–2024 · 90% MOE{' '}
              {selected.povertyMoe === null
                ? 'unavailable'
                : `±${selected.povertyMoe.toFixed(1)} pp`}
            </small>
          </dt>
          <dd>{pct(selected.poverty)}</dd>
        </div>
        <div>
          <dt>
            Over 1 mile from a SNAP retailer{' '}
            <small>USDA SRAM · 2025 retail / 2020 population</small>
          </dt>
          <dd>{pct(selected.lowAccess)}</dd>
        </div>
        <div>
          <dt>
            Households receiving SNAP <small>ACS 2020–2024 · context, not scored</small>
          </dt>
          <dd>{pct(selected.snap)}</dd>
        </div>
      </dl>
      <div className="insight-note">
        <Info size={16} />
        <p>
          Higher index values suggest an area to investigate. A tract point does not establish a
          suitable venue.
        </p>
      </div>
      <div className="section-heading">
        <h3>Local review</h3>
        <Flag size={16} />
      </div>
      <p className="fine-print">
        Decisions stay with the saved plan. Don’t enter personal or sensitive information.
      </p>
      <div className="challenge-actions">
        <Button
          variant="secondary"
          onClick={() => decision(selected.id, 'shortlisted')}
          disabled={scenario.shortlist.includes(selected.id)}
        >
          <Star size={15} />
          {scenario.shortlist.includes(selected.id) ? 'Shortlisted' : 'Shortlist'}
        </Button>
        <Button variant="ghost" onClick={() => decision(selected.id, 'dismissed')}>
          <X size={15} />
          Dismiss
        </Button>
      </div>
      <label className="field">
        Flag as unsuitable
        <select
          value={
            scenario.decisions.find((d) => d.id === selected.id && d.status === 'flagged')
              ?.reason ?? ''
          }
          onChange={(e) => {
            if (e.target.value)
              decision(selected.id, 'flagged', e.target.value as Decision['reason']);
          }}
        >
          <option value="">Choose a reason…</option>
          {reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <Button className="full-width" onClick={onPlan} disabled={selected.priority === null}>
        Plan a pop-up here <ArrowRight size={16} />
      </Button>
    </>
  );
}
