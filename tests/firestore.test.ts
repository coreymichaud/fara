// @vitest-environment node
import { afterAll, describe, expect, it, vi } from 'vitest';
import { getApps, deleteApp } from 'firebase-admin/app';
import { FirestoreRepository } from '@/lib/storage/firestore';
import { getRepository } from '@/lib/storage';
import { createPlan, requireOwner } from '@/lib/server/plans';
import { dataset, scenario, survey } from './fixtures';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('real Firestore Emulator integration', () => {
  afterAll(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });
  it('persists across repository instances, enforces survey gates and creates transactions', async () => {
    const first = new FirestoreRepository('demo-food-access');
    const saved = await createPlan(scenario, dataset, first);
    const second = new FirestoreRepository('demo-food-access');
    expect((await requireOwner(second, saved.id, saved.token)).scenario.title).toBe(scenario.title);
    expect(await second.get('absent')).toBeNull();
    expect(await second.responses(saved.id)).toEqual([]);
    await Promise.all([first.submit(saved.id, survey), second.submit(saved.id, survey)]);
    expect((await second.get(saved.id))?.responseCount).toBe(2);
    expect(await second.responses(saved.id)).toHaveLength(2);
    await second.setSurvey(saved.id, false);
    await expect(first.submit(saved.id, survey)).rejects.toThrow('closed');
    await expect(first.submit('absent', survey)).rejects.toThrow('closed');
    await second.setSurvey(saved.id, true);
    const atLimit = {
      ...(await second.get(saved.id))!,
      id: `limit-${saved.id}`,
      responseCount: 5000,
    };
    await second.create(atLimit);
    await expect(second.submit(atLimit.id, survey)).rejects.toThrow('limit');
    await expect(second.create(atLimit)).rejects.toThrow();
    vi.stubEnv('STORAGE_ADAPTER', 'firestore');
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'demo-food-access');
    expect(getRepository().constructor.name).toBe('FirestoreRepository');
    vi.unstubAllEnvs();
  });
  it('selects application default credentials outside emulator mode without embedding keys', async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '');
    const repository = new FirestoreRepository('demo-food-access');
    expect(repository).toBeInstanceOf(FirestoreRepository);
    expect(getApps()[0].options.credential).toBeDefined();
    vi.unstubAllEnvs();
  });
});
