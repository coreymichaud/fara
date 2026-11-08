'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { ArrowRight, Info, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { evaluate, initialScenario, rankCandidates, scoreAreas } from '@/lib/domain/planner';
import { scenarioSchema, type Dataset, type Decision, type Scenario } from '@/lib/domain/schema';
import { AreaExplorer } from './area-explorer';
import { AreaDetails } from './area-details';
import { EventSettings } from './event-settings';
import { LocationComparison } from './location-comparison';
import { PlanningMap } from './planning-map';
import { SavedPlanLinks } from './saved-plan-links';

export function Workspace({ data }: { data: Dataset }) {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const start = initialScenario(data.areas[0]);
    const top = rankCandidates(scoreAreas(data.areas, 50), start)[0];
    return top ? { ...start, candidateId: top.area.id, coordinates: top.area.coordinates } : start;
  });
  const [tab, setTab] = useState('evidence');
  const [mobile, setMobile] = useState('map');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<{ publicUrl: string; manageUrl: string } | null>(null);
  const detailViewport = useRef<HTMLDivElement>(null);
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
  const openTab = (value: string) => {
    setTab(value);
    detailViewport.current!.scrollTop = 0;
  };
  const openSection = (mode: string) => {
    setMobile(mode);
    if (window.matchMedia('(max-width: 700px)').matches)
      document.getElementById('workspace-navigation')!.scrollIntoView({ block: 'start' });
  };
  const showDetails = () => {
    openTab('evidence');
    openSection('plan');
  };
  const select = (id: string, revealDetails = true) => {
    const area = scored.find((a) => a.id === id);
    if (!area) return;
    update({
      candidateId: id,
      coordinates: area.coordinates,
      ...(scenario.county !== 'all' && area.county !== scenario.county
        ? { county: area.county }
        : {}),
    });
    openTab('evidence');
    if (revealDetails) openSection('plan');
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
  return (
    <>
      <main id="main" className="workspace">
        <div className="workspace-heading">
          <h1>Pantry Planner</h1>
          <div className="workspace-meta">
            <span className={data.manifest.mode === 'illustrative' ? 'illustrative' : ''}>
              {data.manifest.mode === 'illustrative'
                ? 'Illustrative test data'
                : 'Observed public indicators'}
              <span className="meta-divider"> / </span>
              {data.manifest.geography.length} counties · {data.areas.length} tracts
            </span>
            <Link href="/methodology">2020–2025 source years & methods</Link>
          </div>
        </div>
        <div id="workspace-navigation" className="mobile-tabs" aria-label="Workspace sections">
          {['areas', 'map', 'plan'].map((mode) => (
            <button key={mode} aria-pressed={mobile === mode} onClick={() => openSection(mode)}>
              {mode === 'areas' ? 'Areas' : mode === 'map' ? 'Map' : 'Plan'}
            </button>
          ))}
        </div>
        <div className="workspace-grid" data-mobile={mobile}>
          <AreaExplorer
            data={data}
            scenario={scenario}
            scored={scored}
            selected={selected}
            ranked={ranked}
            update={update}
            select={select}
            decision={decision}
            reorder={reorder}
          />
          <PlanningMap
            scenario={scenario}
            scored={scored}
            selected={selected}
            result={result}
            update={update}
            select={select}
            showDetails={showDetails}
          />
          <aside className="plan-panel" aria-label="Evidence and plan">
            <Tabs.Root
              ref={detailViewport}
              className="detail-tabs-root"
              value={tab}
              onValueChange={openTab}
            >
              <Tabs.List className="panel-tabs" aria-label="Plan detail tabs">
                <Tabs.Trigger value="evidence">Area details</Tabs.Trigger>
                <Tabs.Trigger value="plan">Event settings</Tabs.Trigger>
                <Tabs.Trigger value="compare">Compare locations</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="evidence" className="panel-content">
                <AreaDetails
                  selected={selected}
                  areas={data.areas}
                  scenario={scenario}
                  decision={decision}
                  onPlan={() => {
                    openTab('plan');
                    openSection('plan');
                  }}
                />
              </Tabs.Content>
              <Tabs.Content value="plan" className="panel-content">
                <EventSettings
                  selected={selected}
                  scenario={scenario}
                  result={result}
                  update={update}
                  onCompare={() => openTab('compare')}
                />
              </Tabs.Content>
              <Tabs.Content value="compare" className="panel-content">
                <LocationComparison
                  selected={selected}
                  scored={scored}
                  ranked={ranked}
                  scenario={scenario}
                  result={result}
                  sensitivity={sensitivity}
                  weightSensitivity={weightSensitivity}
                  update={update}
                  select={select}
                />
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
              {message && !saved && (
                <p className="save-message" role="status">
                  {message}
                </p>
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
        {saved && (
          <SavedPlanLinks
            key={saved.publicUrl}
            publicUrl={saved.publicUrl}
            manageUrl={saved.manageUrl}
            surveyEnabled={scenario.surveyEnabled}
            notice={message}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
