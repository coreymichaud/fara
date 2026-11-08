// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { JsonRepository } from '@/lib/storage/json';
import {
  aggregateResponses,
  ApiError,
  createPlan,
  publicPlan,
  requireOwner,
  requirePlan,
} from '@/lib/server/plans';
import { allowRequest, authorized, hashToken, newId, newToken } from '@/lib/server/security';
import { body, handle, json } from '@/lib/server/http';
import { StorageError } from '@/lib/storage/types';
import { areas, dataset, scenario, survey } from './fixtures';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'food-access-tests-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
describe('persistent snapshots and creator permissions', () => {
  it('round trips an immutable plan, recomputes results, and separates secrets', async () => {
    const repository = new JsonRepository(join(directory, 'plans.json'));
    const saved = await createPlan(
      { ...scenario, comparisons: [areas[2].id] },
      dataset,
      repository,
    );
    expect(saved.id).toMatch(/^[\w-]{24}$/);
    expect(saved.token).toMatch(/^[\w-]{43}$/);
    const plan = await requirePlan(new JsonRepository(join(directory, 'plans.json')), saved.id);
    expect(plan.result.planningValue).toBe(150);
    expect(plan.alternatives[0].result.areaCount).toBe(1);
    expect(JSON.stringify(publicPlan(plan))).not.toContain('managementHash');
    expect(JSON.stringify(plan)).not.toContain(saved.token);
    expect((await requireOwner(repository, saved.id, saved.token)).id).toBe(saved.id);
    await expect(requireOwner(repository, saved.id, newToken())).rejects.toMatchObject({
      status: 403,
    });
    await expect(requirePlan(repository, 'not-valid')).rejects.toMatchObject({ status: 404 });
    await expect(requirePlan(repository, newId())).rejects.toMatchObject({ status: 404 });
    await expect(repository.create(plan)).rejects.toThrow('already exists');
    const before = await readFile(join(directory, 'plans.json'), 'utf8');
    expect(before).not.toContain(saved.token);
    await Promise.all([
      repository.submit(saved.id, survey),
      repository.submit(saved.id, { ...survey, works: 'No' }),
    ]);
    expect(await repository.responses(saved.id)).toHaveLength(2);
    expect((await repository.get(saved.id))?.responseCount).toBe(2);
    await repository.setSurvey(saved.id, false);
    await expect(repository.submit(saved.id, survey)).rejects.toThrow('closed');
    await repository.setSurvey(saved.id, true);
    await repository.submit(saved.id, survey);
    expect(await repository.responses(saved.id)).toHaveLength(3);
    await expect(repository.setSurvey(newId(), true)).rejects.toThrow('not found');
    expect(await repository.responses(newId())).toEqual([]);
    await expect(repository.submit(newId(), survey)).rejects.toThrow('closed');
  });
  it('enforces response limits and reports corrupt files', async () => {
    const path = join(directory, 'plans.json'),
      repository = new JsonRepository(path),
      saved = await createPlan(scenario, dataset, repository);
    const state = JSON.parse(await readFile(path, 'utf8'));
    state.plans[saved.id].responseCount = 5000;
    await writeFile(path, JSON.stringify(state));
    await expect(repository.submit(saved.id, survey)).rejects.toThrow('limit');
    await writeFile(path, 'invalid JSON');
    await expect(repository.get(saved.id)).rejects.toThrow();
  });
  it.each([
    { capacity: 0 },
    { candidateId: '12095009999' },
    { county: 'Outside' },
    { county: 'Lake' },
    { shortlist: [areas[0].id, areas[0].id] },
    { comparisons: ['12095009999'] },
    { comparisons: [areas[0].id, areas[0].id] },
    {
      decisions: [
        { id: areas[0].id, status: 'shortlisted' },
        { id: areas[0].id, status: 'dismissed' },
      ],
    },
  ])('rejects invalid or manipulated plan %j', async (patch) => {
    await expect(
      createPlan(
        { ...scenario, ...patch },
        dataset,
        new JsonRepository(join(directory, 'plans.json')),
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });
  it('rejects an unscorable selection and all challenged candidates', async () => {
    const repo = new JsonRepository(join(directory, 'plans.json'));
    for (const patch of [
      { poverty: null },
      { lowAccess: null },
      { population: 0 },
      { households: 0 },
    ])
      await expect(
        createPlan(scenario, { ...dataset, areas: [{ ...areas[0], ...patch }] }, repo),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      createPlan(
        { ...scenario, decisions: areas.map((a) => ({ id: a.id, status: 'dismissed' })) },
        dataset,
        repo,
      ),
    ).rejects.toThrow('No eligible');
    await expect(
      createPlan({ ...scenario, shortlist: ['12095009999'] }, dataset, repo),
    ).rejects.toThrow('Unknown');
    const saved = await createPlan({ ...scenario, county: 'Orange' }, dataset, repo);
    expect(saved.id).toHaveLength(24);
  });
});
describe('anonymous aggregate privacy', () => {
  it('suppresses sparse questions and resists single-cell subtraction', () => {
    expect(aggregateResponses([])).toMatchObject({ n: 0 });
    expect(
      aggregateResponses([survey]).questions.every((q) => q.suppressed && q.cells.length === 0),
    ).toBe(true);
    expect(
      aggregateResponses([...Array.from({ length: 5 }, () => survey), { ...survey, works: 'No' }])
        .questions[0].cells,
    ).toEqual([]);
    const complete = aggregateResponses(Array.from({ length: 5 }, () => survey));
    expect(complete.questions[0].suppressed).toBe(false);
    expect(complete.questions[0].cells[0]).toEqual({ option: 'Yes', count: 5, percent: 100 });
    expect(complete.questions[0].cells[1].count).toBe(0);
  });
});
describe('secret handling and bounded abuse controls', () => {
  it('uses high-entropy ids, distinct hashes and timing-safe authentication', () => {
    const id = newId(),
      token = newToken(),
      hash = hashToken(id, token);
    expect(newId()).not.toBe(id);
    expect(hashToken(newId(), token)).not.toBe(hash);
    expect(authorized(id, token, hash)).toBe(true);
    expect(authorized(id, 'bad', hash)).toBe(false);
    expect(authorized(id, token, 'bad')).toBe(false);
    expect(authorized(id, newToken(), hash)).toBe(false);
  });
  it('limits and renews buckets and bounds memory without storing IPs', () => {
    const key = newId();
    expect(allowRequest(key, 1, 0)).toBe(true);
    expect(allowRequest(key, 1, 1)).toBe(false);
    expect(allowRequest(key, 1, 60000)).toBe(true);
    expect(allowRequest(key, 2, 60001)).toBe(true);
    for (let i = 0; i < 10010; i++) allowRequest(`full-${i}`, 1, 60001);
    expect(allowRequest('over-capacity', 1, 60001)).toBe(false);
    expect(allowRequest('expired', 1, 120002)).toBe(true);
  });
});
describe('HTTP validation and visible failures', () => {
  const request = (value: string, headers: Record<string, string> = {}) =>
    new Request('https://example.com/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: value,
    });
  it('accepts same-origin JSON and rejects CSRF, malformed and oversized bodies', async () => {
    expect(
      await body(
        new Request('http://0.0.0.0:8080/api/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Host: 'example.com',
            Origin: 'https://example.com',
            'x-forwarded-proto': 'https',
          },
          body: '{}',
        }),
      ),
    ).toEqual({});
    expect(await body(request('{"value":1}', { origin: 'https://example.com' }))).toEqual({
      value: 1,
    });
    await expect(body(request('{}', { origin: 'https://evil.test' }))).rejects.toMatchObject({
      status: 403,
    });
    await expect(body(request('{}', { 'content-type': 'text/plain' }))).rejects.toMatchObject({
      status: 415,
    });
    await expect(body(request('{}', { 'content-length': '20000' }))).rejects.toMatchObject({
      status: 413,
    });
    await expect(body(request('1234'), 3)).rejects.toMatchObject({ status: 413 });
    await expect(body(request('{'))).rejects.toMatchObject({ status: 400 });
    await expect(
      body(
        new Request('https://example.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('does not cache private payloads or leak internal errors', async () => {
    expect(json({ ok: true }).headers.get('cache-control')).toBe('no-store');
    expect((await handle(async () => json({ ok: true }))).status).toBe(200);
    expect(
      (
        await handle(async () => {
          throw new ApiError(403, 'private');
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await handle(async () => {
          throw new StorageError('closed');
        })
      ).status,
    ).toBe(409);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handle(async () => {
      throw new Error('secret-token');
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret-token');
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('secret-token'));
  });
  it('uses cookie-safe NextRequest objects', () => {
    const req = new NextRequest('https://example.com');
    expect(req.cookies.get('creator')).toBeUndefined();
  });
});
