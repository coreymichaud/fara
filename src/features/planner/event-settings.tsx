import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ModelResult, ScoredArea } from '@/lib/domain/planner';
import type { Scenario } from '@/lib/domain/schema';
import type { WorkspaceActions } from './workspace-types';

type EventSettingsProps = Pick<WorkspaceActions, 'update'> & {
  selected: ScoredArea;
  scenario: Scenario;
  result: ModelResult;
  onCompare: () => void;
};

export function EventSettings({
  selected,
  scenario,
  result,
  update,
  onCompare,
}: EventSettingsProps) {
  return (
    <>
      <div className="eyebrow">Proposed event</div>
      <h2>Event settings</h2>
      <p className="panel-intro">
        {selected.label} · {selected.county} County
      </p>
      <label className="field">
        Plan title
        <input
          maxLength={80}
          value={scenario.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>
      <label className="range-label" htmlFor="radius">
        <span>Reach radius</span>
        <strong>{scenario.radius.toFixed(1)} mi</strong>
      </label>
      <input
        id="radius"
        type="range"
        min="0.5"
        max="10"
        step="0.5"
        value={scenario.radius}
        onChange={(e) => update({ radius: Number(e.target.value) })}
      />
      <p className="fine-print">Straight-line proximity. No road, transit, or walking times.</p>
      <label className="field">
        Event capacity · household slots
        <input
          type="number"
          min="1"
          max="5000"
          value={scenario.capacity}
          onChange={(e) => update({ capacity: Number(e.target.value) })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          Longitude
          <input
            type="number"
            step="0.000001"
            min="-83"
            max="-80"
            value={scenario.coordinates[0]}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= -83 && v <= -80) update({ coordinates: [v, scenario.coordinates[1]] });
            }}
          />
        </label>
        <label className="field">
          Latitude
          <input
            type="number"
            step="0.000001"
            min="27"
            max="30"
            value={scenario.coordinates[1]}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 27 && v <= 30) update({ coordinates: [scenario.coordinates[0], v] });
            }}
          />
        </label>
      </div>
      <label className="field">
        Operating day
        <select
          value={scenario.day}
          onChange={(e) => update({ day: e.target.value as Scenario['day'] })}
        >
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            (d) => (
              <option key={d}>{d}</option>
            ),
          )}
        </select>
      </label>
      <div className="field-row">
        <label className="field">
          Start · local time
          <input
            type="time"
            value={scenario.start}
            onChange={(e) => update({ start: e.target.value })}
          />
        </label>
        <label className="field">
          End · local time
          <input
            type="time"
            value={scenario.end}
            onChange={(e) => update({ end: e.target.value })}
          />
        </label>
      </div>
      <p className="fine-print">
        America/New_York. Hours describe the proposal and survey; they do not change modeled
        attendance.
      </p>
      <details className="optional-cost">
        <summary>Optional event cost & budget</summary>
        <div className="field-row">
          <label className="field">
            Cost per event · USD
            <input
              type="number"
              min="0"
              value={scenario.cost ?? ''}
              placeholder="Your estimate"
              onChange={(e) =>
                update({ cost: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Available budget · USD
            <input
              type="number"
              min="0"
              value={scenario.budget ?? ''}
              placeholder="Your budget"
              onChange={(e) =>
                update({ budget: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </label>
        </div>
        {result.budgetFeasible !== null && (
          <p className={result.budgetFeasible ? 'success-text' : 'error-text'}>
            {result.budgetFeasible
              ? 'Within the entered budget.'
              : 'Above the entered budget. Revise the event before proceeding.'}
          </p>
        )}
      </details>
      <label className="field">
        Operator note <span>Public · no personal details</span>
        <textarea
          maxLength={300}
          value={scenario.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="What should your collaborators verify?"
          rows={2}
        />
      </label>
      <Button variant="secondary" className="full-width" onClick={onCompare}>
        Compare locations <ArrowRight size={16} />
      </Button>
    </>
  );
}
