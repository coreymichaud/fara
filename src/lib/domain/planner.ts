import type { Area, Scenario } from './schema';
import type * as GeoJSON from 'geojson';

export const METHOD = 'priority-proximity-v1';
export type ScoredArea = Area & { priority: number | null };
export type CatchmentParameters = Pick<
  Scenario,
  'coordinates' | 'county' | 'radius' | 'capacity' | 'cost' | 'budget'
>;
export type RankingParameters = Omit<CatchmentParameters, 'coordinates'> &
  Pick<Scenario, 'decisions'>;
export type ModelResult = {
  areaIds: string[];
  areaCount: number;
  householdsInTracts: number;
  capacityCeiling: number;
  planningValue: number;
  needWeightedAreas: number;
  budgetFeasible: boolean | null;
};

/** Global min–max scaling; a constant comparable feature contributes 0.5. */
export function normalize(value: number, min: number, max: number): number {
  if (![value, min, max].every(Number.isFinite) || min > max)
    throw new Error('Invalid normalization bounds');
  return max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function scoreAreas(areas: Area[], povertyWeight: number): ScoredArea[] {
  if (!Number.isFinite(povertyWeight) || povertyWeight < 0 || povertyWeight > 100)
    throw new Error('Weight must be between 0 and 100');
  const valid = areas.filter(
    (a) => a.poverty !== null && a.lowAccess !== null && a.population > 0 && a.households > 0,
  );
  const poverty = valid.map((a) => a.poverty as number),
    access = valid.map((a) => a.lowAccess as number);
  return areas.map((a) => ({
    ...a,
    priority: valid.includes(a)
      ? 100 *
        ((povertyWeight / 100) *
          normalize(a.poverty as number, Math.min(...poverty), Math.max(...poverty)) +
          (1 - povertyWeight / 100) *
            normalize(a.lowAccess as number, Math.min(...access), Math.max(...access)))
      : null,
  }));
}

/** Haversine distance on a spherical Earth, in international miles. */
export function distanceMiles(a: [number, number], b: [number, number]): number {
  if (
    ![...a, ...b].every(Number.isFinite) ||
    Math.abs(a[0]) > 180 ||
    Math.abs(b[0]) > 180 ||
    Math.abs(a[1]) > 90 ||
    Math.abs(b[1]) > 90
  )
    throw new Error('Invalid coordinates');
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Representative-point inclusion. Household totals refer to entire included tracts. */
export function evaluate(areas: ScoredArea[], scenario: CatchmentParameters): ModelResult {
  const included = areas.filter(
    (a) =>
      a.priority !== null &&
      (scenario.county === 'all' || a.county === scenario.county) &&
      distanceMiles(a.coordinates, scenario.coordinates) <= scenario.radius + 1e-9,
  );
  const households = included.reduce((n, a) => n + a.households, 0);
  const weighted = included.reduce((n, a) => n + (a.households * (a.priority as number)) / 100, 0);
  const capacityCeiling = Math.min(scenario.capacity, households);
  return {
    areaIds: included.map((a) => a.id),
    areaCount: included.length,
    householdsInTracts: households,
    capacityCeiling,
    planningValue: households > 0 ? (weighted / households) * capacityCeiling : 0,
    needWeightedAreas: included.reduce((n, a) => n + (a.priority as number) / 100, 0),
    budgetFeasible:
      scenario.cost === null || scenario.budget === null ? null : scenario.cost <= scenario.budget,
  };
}

/** Single-event greedy objective, sorted by capacity-adjusted priority, then tract ID. */
export function rankCandidates(
  areas: ScoredArea[],
  scenario: RankingParameters,
): { area: ScoredArea; result: ModelResult }[] {
  const dismissed = new Set(
    scenario.decisions.filter((d) => d.status !== 'shortlisted').map((d) => d.id),
  );
  return areas
    .filter(
      (a) =>
        a.priority !== null &&
        !dismissed.has(a.id) &&
        (scenario.county === 'all' || a.county === scenario.county),
    )
    .map((area) => ({
      area,
      result: evaluate(areas, { ...scenario, coordinates: area.coordinates }),
    }))
    .sort(
      (a, b) =>
        b.result.planningValue - a.result.planningValue || a.area.id.localeCompare(b.area.id),
    );
}

export function initialScenario(area: Area): Scenario {
  return {
    title: 'Central Florida pop-up pantry',
    note: '',
    candidateId: area.id,
    coordinates: area.coordinates,
    county: 'all',
    radius: 2.5,
    capacity: 200,
    day: 'Saturday',
    start: '09:00',
    end: '12:00',
    cost: null,
    budget: null,
    povertyWeight: 50,
    surveyEnabled: true,
    decisions: [],
    shortlist: [],
    comparisons: [],
  };
}

export function circlePolygon(
  center: [number, number],
  radius: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring = Array.from({ length: 65 }, (_, i) => {
    const angle = (i / 64) * 2 * Math.PI;
    return [
      center[0] + (radius * Math.cos(angle)) / (69.093 * Math.cos((center[1] * Math.PI) / 180)),
      center[1] + (radius * Math.sin(angle)) / 69.093,
    ];
  });
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
