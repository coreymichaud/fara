import { describe, expect, it } from 'vitest';
import {
  circlePolygon,
  distanceMiles,
  evaluate,
  initialScenario,
  normalize,
  rankCandidates,
  scoreAreas,
} from '@/lib/domain/planner';
import {
  areaSchema,
  coordinatesSchema,
  manifestSchema,
  scenarioSchema,
  surveySchema,
} from '@/lib/domain/schema';
import { areas, dataset, scenario, survey } from './fixtures';

describe('transparent planning model', () => {
  it('normalizes boundaries, constant features and rejects invalid bounds', () => {
    expect(normalize(20, 10, 30)).toBe(0.5);
    expect(normalize(5, 10, 30)).toBe(0);
    expect(normalize(50, 10, 30)).toBe(1);
    expect(normalize(5, 5, 5)).toBe(0.5);
    for (const values of [
      [NaN, 0, 1],
      [0, 2, 1],
      [0, 0, Infinity],
    ])
      expect(() => normalize(...(values as [number, number, number]))).toThrow('Invalid');
  });
  it('uses comparable complete rows and does not treat null as zero', () => {
    const scored = scoreAreas(areas, 50);
    expect(scored.map((a) => a.priority)).toEqual([0, 100, 50]);
    expect(scoreAreas(areas, 100).map((a) => a.priority)).toEqual([0, 100, 50]);
    for (const patch of [
      { poverty: null },
      { lowAccess: null },
      { population: 0 },
      { households: 0 },
    ])
      expect(scoreAreas([{ ...areas[0], ...patch }], 50)[0].priority).toBeNull();
    expect(scoreAreas([], 50)).toEqual([]);
    expect(scoreAreas([areas[0]], 0)[0].priority).toBe(50);
    for (const weight of [-1, 101, NaN]) expect(() => scoreAreas(areas, weight)).toThrow('Weight');
  });
  it('computes known distances, zero distance and rejects invalid coordinates', () => {
    expect(distanceMiles([0, 0], [0, 1])).toBeCloseTo(69.093, 2);
    expect(distanceMiles([-81, 28], [-81, 28])).toBe(0);
    expect(distanceMiles([0, 0], [180, 0])).toBeCloseTo(Math.PI * 3958.7613, 4);
    for (const [a, b] of [
      [
        [NaN, 0],
        [0, 0],
      ],
      [
        [181, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [-181, 0],
      ],
      [
        [0, 91],
        [0, 0],
      ],
      [
        [0, 0],
        [0, -91],
      ],
    ])
      expect(() => distanceMiles(a as [number, number], b as [number, number])).toThrow();
  });
  it('caps capacity without claiming recipients; includes the exact radius boundary', () => {
    const scored = scoreAreas(areas, 50),
      result = evaluate(scored, scenario);
    expect(result).toMatchObject({
      areaCount: 2,
      householdsInTracts: 400,
      capacityCeiling: 200,
      planningValue: 150,
      needWeightedAreas: 1,
      budgetFeasible: null,
    });
    expect(evaluate(scored, { ...scenario, capacity: 500 }).capacityCeiling).toBe(400);
    expect(
      evaluate(scored, {
        ...scenario,
        radius: distanceMiles(areas[0].coordinates, areas[1].coordinates),
      }).areaCount,
    ).toBe(2);
    expect(evaluate(scored, { ...scenario, county: 'Lake' })).toMatchObject({
      areaCount: 0,
      planningValue: 0,
      capacityCeiling: 0,
    });
    expect(evaluate(scored, { ...scenario, cost: 0, budget: 0 }).budgetFeasible).toBe(true);
    expect(evaluate(scored, { ...scenario, cost: 5, budget: 4 }).budgetFeasible).toBe(false);
    expect(evaluate(scored, { ...scenario, cost: 5, budget: null }).budgetFeasible).toBeNull();
    expect(evaluate(scoreAreas([{ ...areas[0], poverty: null }], 50), scenario).areaCount).toBe(0);
  });
  it('ranks reproducibly, uses stable ties, filters counties and practitioner decisions', () => {
    const scored = scoreAreas(areas, 50);
    expect(rankCandidates(scored, scenario).map((r) => r.area.id)).toEqual([
      areas[0].id,
      areas[1].id,
      areas[2].id,
    ]);
    expect(rankCandidates([...scored].reverse(), scenario).map((r) => r.area.id)).toEqual(
      rankCandidates(scored, scenario).map((r) => r.area.id),
    );
    expect(rankCandidates(scored, { ...scenario, county: 'Lake' })[0].area.id).toBe(areas[2].id);
    expect(
      rankCandidates(scored, {
        ...scenario,
        decisions: [
          { id: areas[0].id, status: 'dismissed' },
          { id: areas[1].id, status: 'flagged' },
          { id: areas[2].id, status: 'shortlisted' },
        ],
      }).map((r) => r.area.id),
    ).toEqual([areas[2].id]);
    expect(rankCandidates(scoreAreas([{ ...areas[0], poverty: null }], 50), scenario)).toEqual([]);
  });
  it('creates a closed display catchment and explicit default scenario', () => {
    const circle = circlePolygon([-81, 28], 2);
    expect(circle.geometry.coordinates[0]).toHaveLength(65);
    expect(circle.geometry.coordinates[0][0][0]).toBeCloseTo(
      circle.geometry.coordinates[0][64][0],
      10,
    );
    expect(initialScenario(areas[0])).toMatchObject({
      candidateId: areas[0].id,
      capacity: 200,
      surveyEnabled: true,
      cost: null,
    });
  });
});
describe('input boundaries', () => {
  it('accepts complete data and fixed-choice survey', () => {
    expect(areaSchema.parse(areas[0])).toEqual(areas[0]);
    expect(manifestSchema.parse(dataset.manifest)).toEqual(dataset.manifest);
    expect(scenarioSchema.parse(scenario)).toEqual(scenario);
    expect(surveySchema.parse(survey)).toEqual(survey);
  });
  it.each([
    { capacity: 0 },
    { capacity: 1.5 },
    { radius: 0 },
    { radius: 11 },
    { cost: -1 },
    { budget: -1 },
    { povertyWeight: 101 },
    { title: '' },
    { end: '08:00' },
    { start: '25:00' },
    { coordinates: [28, -81] },
    { capacity: 'people' },
  ])('rejects malformed scenario %j', (patch) => {
    expect(scenarioSchema.safeParse({ ...scenario, ...patch }).success).toBe(false);
  });
  it('rejects arbitrary survey text, extras and unsupported geography', () => {
    expect(surveySchema.safeParse({ ...survey, works: 'name@host.com' }).success).toBe(false);
    expect(surveySchema.safeParse({ ...survey, email: 'name@host.com' }).success).toBe(false);
    expect(coordinatesSchema.safeParse([-120, 28]).success).toBe(false);
  });
});
