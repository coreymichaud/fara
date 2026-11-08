import type { Decision, Scenario } from '@/lib/domain/schema';

/** Callbacks owned by the workspace so every panel edits the same proposal. */
export type WorkspaceActions = {
  update: (patch: Partial<Scenario>) => void;
  select: (id: string, revealDetails?: boolean) => void;
  decision: (id: string, status: Decision['status'], reason?: Decision['reason']) => void;
  reorder: (index: number, direction: number) => void;
};
