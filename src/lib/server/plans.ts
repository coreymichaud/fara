import { evaluate, rankCandidates, scoreAreas } from '../domain/planner';
import { scenarioSchema, surveyQuestions, type Dataset, type Survey } from '../domain/schema';
import { type PlanRepository, type PublicPlan, type StoredPlan } from '../storage/types';
import { authorized, hashToken, newId, newToken } from './security';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function publicPlan(plan: StoredPlan): PublicPlan {
  const { managementHash: _hash, responseCount: _count, ...safe } = plan;
  void _hash;
  void _count;
  return safe;
}
export async function createPlan(
  input: unknown,
  data: Dataset,
  repository: PlanRepository,
): Promise<{ id: string; token: string }> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
  const scenario = parsed.data;
  const area = data.areas.find((a) => a.id === scenario.candidateId);
  const ids = [
    ...scenario.shortlist,
    ...scenario.comparisons,
    ...scenario.decisions.map((d) => d.id),
  ];
  if (
    !area ||
    ids.some((id) => !data.areas.some((a) => a.id === id)) ||
    new Set(scenario.decisions.map((d) => d.id)).size !== scenario.decisions.length ||
    new Set(scenario.shortlist).size !== scenario.shortlist.length ||
    new Set(scenario.comparisons).size !== scenario.comparisons.length
  )
    throw new ApiError(400, 'Unknown or duplicate candidate IDs');
  if (scenario.county !== 'all' && !data.manifest.geography.includes(scenario.county))
    throw new ApiError(400, 'County is outside the study area');
  if (scenario.county !== 'all' && area.county !== scenario.county)
    throw new ApiError(400, 'Candidate is outside the selected county');
  if (
    area.poverty === null ||
    area.lowAccess === null ||
    area.population === 0 ||
    area.households === 0
  )
    throw new ApiError(400, 'Selected area has insufficient comparable data');
  const scored = scoreAreas(data.areas, scenario.povertyWeight);
  const id = newId(),
    token = newToken();
  const plan: StoredPlan = {
    id,
    createdAt: new Date().toISOString(),
    scenario,
    result: evaluate(scored, scenario),
    alternatives: scenario.comparisons.map((candidateId) => {
      const candidate = data.areas.find((a) => a.id === candidateId)!;
      return {
        id: candidate.id,
        label: `${candidate.label}, ${candidate.county}`,
        result: evaluate(scored, { ...scenario, coordinates: candidate.coordinates }),
      };
    }),
    area,
    manifest: data.manifest,
    surveyEnabled: scenario.surveyEnabled,
    managementHash: hashToken(id, token),
    responseCount: 0,
  };
  // Rank is computed from the same pure engine used in the interactive workspace.
  if (rankCandidates(scored, scenario).length === 0)
    throw new ApiError(400, 'No eligible candidates remain');
  await repository.create(plan);
  return { id, token };
}
export async function requirePlan(repository: PlanRepository, id: string): Promise<StoredPlan> {
  if (!/^[A-Za-z0-9_-]{24}$/.test(id)) throw new ApiError(404, 'Plan not found');
  const plan = await repository.get(id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  return plan;
}
export async function requireOwner(
  repository: PlanRepository,
  id: string,
  token: string,
): Promise<StoredPlan> {
  const plan = await requirePlan(repository, id);
  if (!authorized(id, token, plan.managementHash))
    throw new ApiError(403, 'Private management access required');
  return plan;
}
export function aggregateResponses(responses: Survey[]) {
  const n = responses.length;
  // Suppress all small cells, and all breakdowns when any cell in that question is 1–4.
  // This also prevents deriving a single suppressed cell by subtraction.
  return {
    n,
    warning:
      'Voluntary convenience sample. Too sparse for population generalization; repeat submissions cannot be fully prevented.',
    questions: surveyQuestions.map((question) => {
      const cells = question.options.map((option) => ({
        option,
        count: responses.filter((r) => r[question.key] === option).length,
      }));
      const suppressed = n < 5 || cells.some((c) => c.count > 0 && c.count < 5);
      return {
        key: question.key,
        label: question.label,
        suppressed,
        cells: suppressed
          ? []
          : cells.map((c) => ({ ...c, percent: Math.round((c.count / n) * 100) })),
      };
    }),
  };
}
