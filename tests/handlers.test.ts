// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NextRequest } from 'next/server';
import { JsonRepository } from '@/lib/storage/json';
import { createPlan } from '@/lib/server/plans';
import { dataset, scenario, survey } from './fixtures';
const mocks = vi.hoisted(() => ({ repository: vi.fn(), data: vi.fn() }));
vi.mock('@/lib/storage', () => ({ getRepository: mocks.repository }));
vi.mock('@/lib/data/load', () => ({ loadDataset: mocks.data }));
import {
  create,
  health,
  read,
  results,
  session,
  submit,
  updateSurvey,
} from '@/lib/server/handlers';
let directory: string, repository: JsonRepository;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'handlers-'));
  repository = new JsonRepository(join(directory, 'plans.json'));
  mocks.repository.mockReturnValue(repository);
  mocks.data.mockResolvedValue(dataset);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
const request = (id: string, payload?: unknown, cookie?: string, method = 'POST') =>
  new NextRequest(`https://demo.example/api/plans/${id}/manage`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('HTTP end-to-end boundaries', () => {
  it('creates, reads, surveys and authorizes creator-only aggregate access', async () => {
    const save = await create(request('', scenario));
    expect(save.status).toBe(201);
    const saved = (await save.json()) as { id: string; token: string };
    const publicResponse = await read(request(saved.id), ctx(saved.id));
    expect(publicResponse.status).toBe(200);
    const publicData = await publicResponse.json();
    expect(publicData).not.toHaveProperty('managementHash');
    expect(JSON.stringify(publicData)).not.toContain(saved.token);
    expect(
      (await results(request(saved.id, undefined, undefined, 'GET'), ctx(saved.id))).status,
    ).toBe(403);
    expect((await session(request(saved.id, { token: 'incorrect' }), ctx(saved.id))).status).toBe(
      403,
    );
    expect((await session(request(saved.id, { bad: 'invalid' }), ctx(saved.id))).status).toBe(400);
    const login = await session(request(saved.id, { token: saved.token }), ctx(saved.id));
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')?.toLowerCase()).toContain('httponly');
    expect(login.headers.get('set-cookie')?.toLowerCase()).toContain('samesite=strict');
    const response = await submit(request(saved.id, survey), ctx(saved.id));
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain(`responded_${saved.id}=1`);
    expect(
      (await submit(request(saved.id, survey, `responded_${saved.id}=1`), ctx(saved.id))).status,
    ).toBe(409);
    expect(
      (await submit(request(saved.id, { works: 'unlisted choice' }), ctx(saved.id))).status,
    ).toBe(400);
    const aggregate = await results(
      request(saved.id, undefined, `creator=${saved.token}`, 'GET'),
      ctx(saved.id),
    );
    expect(aggregate.headers.get('cache-control')).toBe('no-store');
    expect(await aggregate.json()).toMatchObject({
      n: 1,
      questions: [
        { suppressed: true },
        { suppressed: true },
        { suppressed: true },
        { suppressed: true },
      ],
    });
    expect(
      (
        await updateSurvey(
          request(saved.id, { enabled: false }, `creator=${saved.token}`, 'PATCH'),
          ctx(saved.id),
        )
      ).status,
    ).toBe(200);
    expect((await submit(request(saved.id, survey), ctx(saved.id))).status).toBe(409);
    expect(
      (
        await updateSurvey(
          request(saved.id, { enabled: 'false' }, `creator=${saved.token}`, 'PATCH'),
          ctx(saved.id),
        )
      ).status,
    ).toBe(400);
    expect(
      (await updateSurvey(request(saved.id, { enabled: true }, undefined, 'PATCH'), ctx(saved.id)))
        .status,
    ).toBe(403);
  });
  it('returns actionable failures without fake success', async () => {
    expect((await create(request('', {}))).status).toBe(400);
    expect((await read(request('invalid'), ctx('invalid'))).status).toBe(404);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.repository.mockImplementation(() => {
      throw new Error('unconfigured');
    });
    expect((await create(request('', scenario))).status).toBe(503);
    expect(log).toHaveBeenCalled();
  });
  it('reports read readiness without pretending to verify a database connection', async () => {
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'demo-food-access');
    expect(await (await health()).json()).toMatchObject({
      status: 'ok',
      persistence: 'firestore-configured-connection-not-probed',
      areas: 3,
    });
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', '');
    expect(await (await health()).json()).toMatchObject({ persistence: 'unconfigured' });
  });
  it('rate limits saves, survey writes and creator authentication', async () => {
    const saved = await createPlan(scenario, dataset, repository);
    for (let i = 0; i < 20; i++) await session(request(saved.id, { token: 'bad' }), ctx(saved.id));
    expect((await session(request(saved.id, { token: saved.token }), ctx(saved.id))).status).toBe(
      429,
    );
    for (let i = 0; i < 30; i++) await submit(request(saved.id, survey), ctx(saved.id));
    expect((await submit(request(saved.id, survey), ctx(saved.id))).status).toBe(429);
    for (let i = 0; i < 30; i++) await create(request('', {}));
    expect((await create(request('', scenario))).status).toBe(429);
  });
});
