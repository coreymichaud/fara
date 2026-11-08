import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { loadDataset } from '../data/load';
import { surveySchema } from '../domain/schema';
import { getRepository } from '../storage';
import {
  aggregateResponses,
  ApiError,
  createPlan,
  publicPlan,
  requireOwner,
  requirePlan,
} from './plans';
import { allowRequest } from './security';
import { body, handle, json } from './http';
export type Context = { params: Promise<{ id: string }> };

export function create(request: Request) {
  return handle(async () => {
    if (!allowRequest('create', 30))
      throw new ApiError(429, 'Too many saves; try again in a minute');
    const input = await body(request);
    return json(await createPlan(input, await loadDataset(), getRepository()), 201);
  });
}
export function read(_request: Request, context: Context) {
  return handle(async () => {
    const { id } = await context.params;
    return json(publicPlan(await requirePlan(getRepository(), id)));
  });
}
export function submit(request: NextRequest, context: Context) {
  return handle(async () => {
    const { id } = await context.params;
    const repository = getRepository();
    await requirePlan(repository, id);
    if (request.cookies.get(`responded_${id}`))
      throw new ApiError(409, 'This browser has already sent a check-in');
    if (!allowRequest(`survey:${id}`, 30))
      throw new ApiError(429, 'Too many check-ins; try again in a minute');
    const parsed = surveySchema.safeParse(await body(request, 2000));
    if (!parsed.success)
      throw new ApiError(400, 'Please answer each question using the listed choices');
    await repository.submit(id, parsed.data);
    const response = json({ saved: true }, 201);
    response.cookies.set(`responded_${id}`, '1', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: `/api/plans/${id}/responses`,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  });
}
export function session(request: NextRequest, context: Context) {
  return handle(async () => {
    const { id } = await context.params;
    if (!allowRequest(`auth:${id}`, 20))
      throw new ApiError(429, 'Too many attempts; try again in a minute');
    const input = z
      .object({ token: z.string().max(100) })
      .strict()
      .safeParse(await body(request, 1000));
    if (!input.success) throw new ApiError(400, 'Management token required');
    await requireOwner(getRepository(), id, input.data.token);
    const response = json({ authorized: true });
    response.cookies.set('creator', input.data.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: `/api/plans/${id}/manage`,
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  });
}
export function results(request: NextRequest, context: Context) {
  return handle(async () => {
    const { id } = await context.params;
    const repository = getRepository();
    const plan = await requireOwner(repository, id, request.cookies.get('creator')?.value ?? '');
    return json({
      ...aggregateResponses(await repository.responses(id)),
      surveyEnabled: plan.surveyEnabled,
    });
  });
}
export function updateSurvey(request: NextRequest, context: Context) {
  return handle(async () => {
    const { id } = await context.params;
    const repository = getRepository();
    await requireOwner(repository, id, request.cookies.get('creator')?.value ?? '');
    const input = z
      .object({ enabled: z.boolean() })
      .strict()
      .safeParse(await body(request, 1000));
    if (!input.success) throw new ApiError(400, 'Expected an enabled boolean');
    await repository.setSurvey(id, input.data.enabled);
    return json({ surveyEnabled: input.data.enabled });
  });
}
export function health() {
  return handle(async () => {
    const data = await loadDataset();
    return json({
      status: 'ok',
      schema: data.manifest.schemaVersion,
      mode: data.manifest.mode,
      datasetVersion: data.manifest.datasetVersion,
      areas: data.areas.length,
      persistence: process.env.GOOGLE_CLOUD_PROJECT
        ? 'firestore-configured-connection-not-probed'
        : 'unconfigured',
    });
  });
}
