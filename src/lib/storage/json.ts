import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Survey } from '../domain/schema';
import { StorageError, type PlanRepository, type StoredPlan } from './types';
type State = { plans: Record<string, StoredPlan>; responses: Record<string, Survey[]> };

/** Explicit development adapter. Atomic replacement, serialized within one process only. */
export class JsonRepository implements PlanRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private path: string) {}
  private async read(): Promise<State> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as State;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { plans: {}, responses: {} };
      throw error;
    }
  }
  private async mutate(update: (state: State) => void): Promise<void> {
    const operation = this.queue.then(async () => {
      const state = await this.read();
      update(state);
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(`${this.path}.tmp`, JSON.stringify(state), { mode: 0o600 });
      await rename(`${this.path}.tmp`, this.path);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async create(plan: StoredPlan): Promise<void> {
    await this.mutate((s) => {
      if (s.plans[plan.id]) throw new StorageError('Plan already exists');
      s.plans[plan.id] = plan;
      s.responses[plan.id] = [];
    });
  }
  async get(id: string): Promise<StoredPlan | null> {
    await this.queue;
    return (await this.read()).plans[id] ?? null;
  }
  async submit(id: string, response: Survey): Promise<void> {
    await this.mutate((s) => {
      const plan = s.plans[id];
      if (!plan?.surveyEnabled) throw new StorageError('Survey is closed');
      if (plan.responseCount >= 5000) throw new StorageError('Survey limit reached');
      s.responses[id].push(response);
      plan.responseCount += 1;
    });
  }
  async responses(id: string): Promise<Survey[]> {
    await this.queue;
    return (await this.read()).responses[id] ?? [];
  }
  async setSurvey(id: string, enabled: boolean): Promise<void> {
    await this.mutate((s) => {
      if (!s.plans[id]) throw new StorageError('Plan not found');
      s.plans[id].surveyEnabled = enabled;
    });
  }
}
