'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Flag,
  Info,
  Layers,
  MapPin,
  Plus,
  Save,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { MapView } from '@/features/map/map-view';
import { evaluate, initialScenario, rankCandidates, scoreAreas } from '@/lib/domain/planner';
import {
  reasons,
  scenarioSchema,
  type Dataset,
  type Decision,
  type Scenario,
} from '@/lib/domain/schema';
import { EvidenceChart } from './evidence-chart';

export function Workspace({ data }: { data: Dataset }) {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const start = initialScenario(data.areas[0]);
    const top = rankCandidates(scoreAreas(data.areas, 50), start)[0];
    return top ? { ...start, candidateId: top.area.id, coordinates: top.area.coordinates } : start;
  });
  const [availability, setAvailability] = useState('comparable');
  const [tab, setTab] = useState('evidence');
  const [mobile, setMobile] = useState('map');
  const [baseline, setBaseline] = useState(false);
  const [retailers, setRetailers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<{ publicUrl: string; manageUrl: string } | null>(null);
  const scored = useMemo(
    () => scoreAreas(data.areas, scenario.povertyWeight),
    [data.areas, scenario.povertyWeight],
  );
  const rankingParameters = useMemo(
    () => ({
      county: scenario.county,
      radius: scenario.radius,
      capacity: scenario.capacity,
      cost: scenario.cost,
      budget: scenario.budget,
      decisions: scenario.decisions,
    }),
    [
      scenario.county,
      scenario.radius,
      scenario.capacity,
      scenario.cost,
      scenario.budget,
      scenario.decisions,
    ],
  );
  const ranked = useMemo(
    () => rankCandidates(scored, rankingParameters),
    [scored, rankingParameters],
  );
  const result = useMemo(() => evaluate(scored, scenario), [scored, scenario]);
  const selected = scored.find((a) => a.id === scenario.candidateId)!;
  const update = (patch: Partial<Scenario>) => {
    setScenario((s) => ({ ...s, ...patch }));
    setSaved(null);
    setMessage('');
  };
  const select = (id: string) => {
    const area = scored.find((a) => a.id === id);
    if (!area) return;
    update({
      candidateId: id,
      coordinates: area.coordinates,
      ...(scenario.county !== 'all' && area.county !== scenario.county
        ? { county: area.county }
        : {}),
    });
    setTab('evidence');
  };
  const decision = (id: string, status: Decision['status'], reason?: Decision['reason']) => {
    const decisions = [
      ...scenario.decisions.filter((d) => d.id !== id),
      { id, status, ...(reason ? { reason } : {}) },
    ];
    const shortlist =
      status === 'shortlisted'
        ? [...scenario.shortlist.filter((v) => v !== id), id].slice(-10)
        : scenario.shortlist.filter((v) => v !== id);
    update({ decisions, shortlist });
  };
  const reorder = (index: number, direction: number) => {
    const list = [...scenario.shortlist];
    [list[index], list[index + direction]] = [list[index + direction], list[index]];
    update({ shortlist: list });
  };
  const list =
    availability === 'missing'
      ? scored
          .filter(
            (a) =>
              (scenario.county === 'all' || a.county === scenario.county) && a.priority === null,
          )
          .map((area) => ({
            area,
            result: evaluate(scored, { ...scenario, coordinates: area.coordinates }),
          }))
      : ranked.slice(0, 5);
  const shortlist = scenario.shortlist.map((id) => scored.find((a) => a.id === id)!);
  const sensitivity = useMemo(
    () =>
      [1, 2.5, 5].map((radius) => ({
        radius,
        top: rankCandidates(scored, { ...rankingParameters, radius })[0]?.area.id,
      })),
    [scored, rankingParameters],
  );
  const weightSensitivity = useMemo(
    () =>
      [25, 75].map(
        (weight) =>
          rankCandidates(scoreAreas(data.areas, weight), rankingParameters)[0]?.area.label ??
          'None',
      ),
    [data.areas, rankingParameters],
  );
  async function save() {
    const validation = scenarioSchema.safeParse(scenario);
    if (!validation.success) {
      setMessage(validation.error.issues[0].message);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      const payload = (await response.json()) as { id: string; token: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Plan could not be saved');
      const publicUrl = `${window.location.origin}/plans/${payload.id}`;
      const manageUrl = `${publicUrl}/manage#token=${payload.token}`;
      setSaved({ publicUrl, manageUrl });
      try {
        localStorage.setItem(`management:${payload.id}`, payload.token);
      } catch {
        setMessage(
          'Plan saved. Browser storage is unavailable; keep the private management link below.',
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copied.');
    } catch {
      setMessage('Clipboard unavailable. Select and copy the link below.');
    }
  }
  const pct = (v: number | null) => (v === null ? 'Not available' : `${v.toFixed(1)}%`);
  return (
    <>
      <main id="main" className="workspace">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">THE FOOD ACCESS PLANNER</div>
            <h1>From public signals to a practical plan.</h1>
            <p>Find a candidate area. Test a pop-up. Bring local knowledge.</p>
          </div>
          <div className="workflow" aria-label="Planning flow">
            <span className="active">
              <i>1</i>Explore
            </span>
            <ChevronRight />
            <span>
              <i>2</i>Plan
            </span>
            <ChevronRight />
            <span>
              <i>3</i>Community check
            </span>
          </div>
        </div>
        <div
          className={`data-ribbon ${data.manifest.mode === 'illustrative' ? 'illustrative' : ''}`}
        >
          <span>
            <span className="status-dot" />
            {data.manifest.mode === 'illustrative'
              ? 'Illustrative demo data'
              : 'Observed public indicators'}
          </span>
          <span>
            {data.manifest.geography.length} counties · {data.areas.length} census tracts
          </span>
          <Link href="/methodology">
            2020–2025 source vintages <Info size={13} />
          </Link>
          <code>DATA {data.manifest.datasetVersion}</code>
        </div>
        <div className="mobile-tabs" aria-label="Workspace sections">
          {['areas', 'map', 'plan'].map((mode) => (
            <button key={mode} aria-pressed={mobile === mode} onClick={() => setMobile(mode)}>
              {mode === 'areas' ? 'Explore areas' : mode === 'map' ? 'Map' : 'Your plan'}
            </button>
          ))}
        </div>
        <div className="workspace-grid" data-mobile={mobile}>
          <aside className="analysis-rail" aria-label="Area explorer">
            <div className="rail-heading">
              <h2>Where to look</h2>
              <SlidersHorizontal size={18} />
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
              <Link href="/methodology">How the index works ↗</Link>
            </details>
            <div className="section-heading">
              <h3>Candidate zones</h3>
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
              <option value="comparable">Recommended · comparable data</option>
              <option value="missing">Insufficient comparable data</option>
            </select>
            <p className="rail-note">
              Ranked for this event’s radius and capacity. These are areas to investigate, not
              approved venues.
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
                    <span className="candidate-priority">
                      {area.priority === null ? '—' : area.priority.toFixed(0)}
                      <small>/ 100</small>
                    </span>
                  </button>
                  <div className="candidate-meta">
                    <span>
                      {potential.areaCount} nearby tracts · {potential.planningValue.toFixed(0)}{' '}
                      planning value
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Shortlist ${area.label}`}
                      onClick={() => decision(area.id, 'shortlisted')}
                      disabled={scenario.shortlist.includes(area.id)}
                    >
                      {scenario.shortlist.includes(area.id) ? (
                        <Check size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
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
              <span>
                Relative priority is a planning signal, not a probability of food insecurity.
              </span>
            </div>
          </aside>
          <section className="map-workspace" aria-label="Planning map">
            <div className="map-toolbar">
              <span>
                <MapPin size={14} /> Central Florida
              </span>
              <div className="segmented" aria-label="Scenario overlay">
                <button aria-pressed={baseline} onClick={() => setBaseline(true)}>
                  Current network
                </button>
                <button aria-pressed={!baseline} onClick={() => setBaseline(false)}>
                  Proposed site
                </button>
              </div>
            </div>
            <MapView
              areas={scored}
              scenario={scenario}
              included={result.areaIds}
              baseline={baseline}
              showRetailers={retailers}
              onSelect={select}
              onMove={(coordinates) => update({ coordinates })}
            />
            <div className="map-overline">
              <span className="map-chip">
                {baseline ? 'Current pantry network unknown' : 'ONE PROPOSED POP-UP'}
              </span>
              <p>
                {baseline
                  ? 'No measured baseline or incremental uplift is available.'
                  : `${scenario.radius} mile straight-line radius · drag the marker to test a site`}
              </p>
            </div>
            <div className="map-legend">
              <div>
                <strong>Relative planning priority</strong>
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
            <div className="map-metric">
              <div>
                <span className="eyebrow">POTENTIAL REACH OF THIS PROPOSED SITE</span>
                <div>
                  <strong>{baseline ? '—' : result.areaCount}</strong>
                  <span>
                    tract representative points
                    <br />
                    within the radius
                  </span>
                </div>
              </div>
              <span className="metric-rule" />
              <p>
                <strong>{scenario.capacity.toLocaleString()} household slots</strong>
                <br />
                Operator-entered event capacity.
                <br />
                Attendance and current service coverage are unknown.
              </p>
            </div>
          </section>
          <aside className="plan-panel" aria-label="Evidence and plan">
            <Tabs.Root className="detail-tabs-root" value={tab} onValueChange={setTab}>
              <Tabs.List className="panel-tabs" aria-label="Plan detail tabs">
                <Tabs.Trigger value="evidence">Evidence</Tabs.Trigger>
                <Tabs.Trigger value="plan">Your event</Tabs.Trigger>
                <Tabs.Trigger value="compare">Compare</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="evidence" className="panel-content">
                <div className="eyebrow">WHY THIS AREA?</div>
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
                <EvidenceChart area={selected} areas={data.areas} />
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
                    Higher index values suggest an area to investigate. A tract point does not
                    establish a suitable venue.
                  </p>
                </div>
                <div className="section-heading">
                  <h3>Bring your local knowledge</h3>
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
                <Button
                  className="full-width"
                  onClick={() => {
                    setTab('plan');
                    setMobile('plan');
                  }}
                  disabled={selected.priority === null}
                >
                  Plan a pop-up here <ArrowRight size={16} />
                </Button>
              </Tabs.Content>
              <Tabs.Content value="plan" className="panel-content">
                <div className="eyebrow">A SCENARIO TO TEST</div>
                <h2>Make it a practical event.</h2>
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
                <p className="fine-print">
                  Straight-line proximity. No road, transit, or walking times.
                </p>
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
                        if (v >= -83 && v <= -80)
                          update({ coordinates: [v, scenario.coordinates[1]] });
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
                        if (v >= 27 && v <= 30)
                          update({ coordinates: [scenario.coordinates[0], v] });
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
                    {[
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday',
                    ].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
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
                  America/New_York. Hours describe the proposal and survey; they do not change
                  modeled attendance.
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
                <Button
                  variant="secondary"
                  className="full-width"
                  onClick={() => setTab('compare')}
                >
                  Compare the potential <ArrowRight size={16} />
                </Button>
              </Tabs.Content>
              <Tabs.Content value="compare" className="panel-content">
                <div className="eyebrow">TEST THE ASSUMPTIONS</div>
                <h2>Potential, with context.</h2>
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
                    Whole-tract 2020 household totals assigned to representative points. Not a count
                    of households inside the circle or expected recipients.
                  </p>
                </div>
                <label className="field">
                  Add up to two alternatives
                  <select
                    value=""
                    disabled={scenario.comparisons.length >= 2}
                    onChange={(e) => {
                      if (e.target.value)
                        update({ comparisons: [...scenario.comparisons, e.target.value] });
                    }}
                  >
                    <option value="">Choose a ranked candidate…</option>
                    {ranked
                      .filter(
                        (r) =>
                          r.area.id !== selected.id && !scenario.comparisons.includes(r.area.id),
                      )
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
                        onClick={() =>
                          update({ comparisons: scenario.comparisons.filter((v) => v !== id) })
                        }
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
                    The top candidate may change as the catchment changes. This is model
                    sensitivity, not statistical confidence.
                  </p>
                  {sensitivity.map((s) => (
                    <div key={s.radius}>
                      {s.radius} mi{' '}
                      <span>
                        {scored.find((a) => a.id === s.top)?.label ?? 'No eligible candidate'}
                      </span>
                    </div>
                  ))}
                  <p>
                    At 25/75 poverty/access weights: {weightSensitivity[0]}. At 75/25:{' '}
                    {weightSensitivity[1]}.
                  </p>
                </details>
                <Link className="method-link" href="/methodology">
                  Read the full method <ArrowRight size={14} />
                </Link>
              </Tabs.Content>
            </Tabs.Root>
            <section className="save-section">
              <label className="survey-toggle">
                <Switch.Root
                  className="switch"
                  checked={scenario.surveyEnabled}
                  onCheckedChange={(checked) => update({ surveyEnabled: checked })}
                  aria-label="Include anonymous community check-in"
                >
                  <Switch.Thumb className="switch-thumb" />
                </Switch.Root>
                <span>
                  Include anonymous community check-in
                  <small>Ask whether this location and time work.</small>
                </span>
              </label>
              <Button
                variant="accent"
                className="full-width"
                onClick={save}
                disabled={saving || selected.priority === null}
              >
                <Save size={16} />
                {saving ? 'Saving the snapshot…' : 'Save & share this plan'}
                <ArrowRight size={16} />
              </Button>
              {message && (
                <p className="save-message" role="status">
                  {message}
                </p>
              )}
              {saved && (
                <div className="saved-links">
                  <strong>
                    <Check size={15} />
                    Plan saved persistently
                  </strong>
                  <label>
                    Public read-only link
                    <input readOnly value={saved.publicUrl} onFocus={(e) => e.target.select()} />
                  </label>
                  <div>
                    <Button variant="secondary" onClick={() => copy(saved.publicUrl)}>
                      <Copy size={14} />
                      Copy share link
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href={saved.publicUrl}>
                        Open plan <ArrowRight size={14} />
                      </Link>
                    </Button>
                  </div>
                  <details>
                    <summary>Private creator link · keep this safe</summary>
                    <p>
                      Anyone with this separate link can view aggregates and close the survey. It
                      cannot be recovered if lost.
                    </p>
                    <a href={saved.manageUrl}>Open private results</a>
                    <Button variant="secondary" onClick={() => copy(saved.manageUrl)}>
                      Copy private link
                    </Button>
                  </details>
                </div>
              )}
            </section>
            <details className="caveats">
              <summary>
                <Info size={14} /> What still needs verification
              </summary>
              <ul>
                <li>Venue permission, safety, accessibility, and actual community demand.</li>
                <li>Existing pantry services, costs, and operating capacity.</li>
                <li>Mixed source years and uncertainty in tract estimates.</li>
                <li>One retailer with inconsistent coordinates was excluded.</li>
              </ul>
            </details>
          </aside>
        </div>
        <div className="workspace-caption">
          <span>
            <MapPin size={13} /> Candidate zones are tract representative points. No travel times or
            pantry network are modeled.
          </span>
          <Link href="/methodology">
            Data & limitations <ArrowUp size={12} />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
