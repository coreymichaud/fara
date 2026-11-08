import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Survey } from '../domain/schema';
import { StorageError, type PlanRepository, type StoredPlan } from './types';

/** All database access is server-side, under ADC or the explicitly selected emulator. */
export class FirestoreRepository implements PlanRepository {
  private db: Firestore;
  constructor(projectId: string) {
    const app =
      getApps()[0] ??
      initializeApp({
        projectId,
        ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
      });
    this.db = getFirestore(app);
  }
  private ref(id: string) {
    return this.db.collection('plans').doc(id);
  }
  async create(plan: StoredPlan): Promise<void> {
    await this.ref(plan.id).create(plan);
  }
  async get(id: string): Promise<StoredPlan | null> {
    const doc = await this.ref(id).get();
    return doc.exists ? (doc.data() as StoredPlan) : null;
  }
  async submit(id: string, response: Survey): Promise<void> {
    const ref = this.ref(id);
    await this.db.runTransaction(async (transaction) => {
      const plan = (await transaction.get(ref)).data() as StoredPlan | undefined;
      if (!plan?.surveyEnabled) throw new StorageError('Survey is closed');
      if (plan.responseCount >= 5000) throw new StorageError('Survey limit reached');
      transaction.create(ref.collection('responses').doc(), response);
      transaction.update(ref, { responseCount: plan.responseCount + 1 });
    });
  }
  async responses(id: string): Promise<Survey[]> {
    const snapshot = await this.ref(id).collection('responses').limit(5000).get();
    return snapshot.docs.map((d) => d.data() as Survey);
  }
  async setSurvey(id: string, enabled: boolean): Promise<void> {
    await this.ref(id).update({ surveyEnabled: enabled });
  }
}
