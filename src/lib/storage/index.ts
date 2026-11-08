import { JsonRepository } from './json';
import { FirestoreRepository } from './firestore';
import type { PlanRepository } from './types';
let repository: PlanRepository | undefined;
export function getRepository(): PlanRepository {
  if (repository) return repository;
  if (process.env.STORAGE_ADAPTER === 'json') {
    if (process.env.NODE_ENV === 'production')
      throw new Error('JSON storage is forbidden in production. Configure Firestore and ADC.');
    repository = new JsonRepository(process.env.LOCAL_STORE_PATH ?? '.local/plans.json');
  } else {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId)
      throw new Error(
        'Set GOOGLE_CLOUD_PROJECT and configure Firestore/ADC (or an explicit local adapter).',
      );
    if (process.env.NODE_ENV === 'production' && process.env.FIRESTORE_EMULATOR_HOST)
      throw new Error('Firestore Emulator is forbidden in production.');
    repository = new FirestoreRepository(projectId);
  }
  return repository;
}
