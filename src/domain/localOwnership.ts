import type { PersistedAppState } from './models';

export function claimLocalState(
  existing: PersistedAppState | null,
  userId: string,
  createClean: () => PersistedAppState,
): PersistedAppState {
  if (!existing || (existing.ownerUserId && existing.ownerUserId !== userId)) {
    return { ...createClean(), ownerUserId: userId };
  }
  return { ...existing, ownerUserId: userId };
}
