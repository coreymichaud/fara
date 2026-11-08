import { notFound } from 'next/navigation';
import { getRepository } from '@/lib/storage';
import { ApiError, publicPlan, requirePlan } from './plans';

/** Read the public snapshot for either the detailed plan or participant page. */
export async function loadPublicPlan(id: string) {
  try {
    return publicPlan(await requirePlan(getRepository(), id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
