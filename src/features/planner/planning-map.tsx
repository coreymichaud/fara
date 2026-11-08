import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapView } from '@/features/map/map-view';
import type { ModelResult, ScoredArea } from '@/lib/domain/planner';
import type { Scenario } from '@/lib/domain/schema';
import type { WorkspaceActions } from './workspace-types';

type PlanningMapProps = Pick<WorkspaceActions, 'update' | 'select'> & {
  scenario: Scenario;
  scored: ScoredArea[];
  selected: ScoredArea;
  result: ModelResult;
  showDetails: () => void;
};

export function PlanningMap({
  scenario,
  scored,
  selected,
  result,
  update,
  select,
  showDetails,
}: PlanningMapProps) {
  const [showProposal, setShowProposal] = useState(true);
  const [retailers, setRetailers] = useState(false);

  return (
    <section className="map-workspace" aria-label="Planning map">
      <div className="map-toolbar">
        <span>
          <MapPin size={16} /> Study map
        </span>
        <label className="overlay-toggle">
          <input
            type="checkbox"
            checked={showProposal}
            onChange={(e) => setShowProposal(e.target.checked)}
          />
          Show event overlay
        </label>
      </div>
      <div className="map-stage">
        <MapView
          areas={scored}
          scenario={scenario}
          included={result.areaIds}
          showProposal={showProposal}
          showRetailers={retailers}
          onSelect={(id) => select(id, false)}
          onMove={(coordinates) => update({ coordinates })}
        />
      </div>
      <div className="map-legend">
        <div>
          <strong>Planning priority</strong>
          <span>
            Lower <i />
            <i />
            <i />
            <i /> Higher
          </span>
        </div>
        <span className="legend-missing">
          <b />
          Insufficient data
        </span>
        <label>
          <input
            type="checkbox"
            checked={retailers}
            onChange={(e) => setRetailers(e.target.checked)}
          />{' '}
          SNAP retailer points
        </label>
      </div>
      <div className="selected-area-summary" aria-label="Selected map area">
        <div>
          <span>Selected area</span>
          <strong>
            {selected.label.replace('Census ', '')} · {selected.county} County
          </strong>
        </div>
        <Button variant="secondary" className="mobile-area-details" onClick={showDetails}>
          View area details
        </Button>
      </div>
      <dl className="map-summary" aria-label="Event assumptions">
        <div>
          <dt>Straight-line radius</dt>
          <dd>
            {scenario.radius.toFixed(1)} <span>mi</span>
          </dd>
        </div>
        <div>
          <dt>Household slots</dt>
          <dd>{scenario.capacity.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Tract points in radius</dt>
          <dd>{result.areaCount}</dd>
        </div>
      </dl>
      <div className="map-context">
        <p>Existing pantry locations are unavailable.</p>
        <p>Capacity is entered by the planner, not predicted attendance.</p>
      </div>
    </section>
  );
}
