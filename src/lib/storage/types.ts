import type { Area, Manifest, Scenario, Survey } from '../domain/schema';
import type { ModelResult } from '../domain/planner';
export type PublicPlan = {
  id: string;
  createdAt: string;
  scenario: Scenario;
  result: ModelResult;
  alternatives: { id: string; label: string; result: ModelResult }[];
  area: Area;
  manifest: Manifest;
  surveyEnabled: boolean;
};
export type StoredPlan = PublicPlan & { managementHash: string; responseCount: number };
export interface PlanRepository {
  create(plan: StoredPlan): Promise<void>;
  get(id: string): Promise<StoredPlan | null>;
  submit(id: string, response: Survey): Promise<void>;
  responses(id: string): Promise<Survey[]>;
  setSurvey(id: string, enabled: boolean): Promise<void>;
}
export class StorageError extends Error {}
