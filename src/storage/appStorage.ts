import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedAppState } from '../domain/models';
import { claimLocalState } from '../domain/localOwnership';
import { migratePersistedState } from './migrations';

const STORAGE_KEY = '@momentum/app-state';
const userKey = (userId: string) => `${STORAGE_KEY}/user/${userId}`;

async function parseKey(key: string): Promise<PersistedAppState | null> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return null;
  try { return migratePersistedState(JSON.parse(value)); } catch { return null; }
}

export const appStorage = {
  async loadForUser(userId: string, createClean: () => PersistedAppState): Promise<PersistedAppState> {
    const owned = await parseKey(userKey(userId));
    if (owned) return claimLocalState(owned, userId, createClean);
    const legacy = await parseKey(STORAGE_KEY);
    const claimed = claimLocalState(legacy, userId, createClean);
    await AsyncStorage.setItem(userKey(userId), JSON.stringify(claimed));
    if (legacy && !legacy.ownerUserId) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(claimed));
    return claimed;
  },

  async save(state: PersistedAppState): Promise<void> {
    if (!state.ownerUserId) throw new Error('Cannot persist Movementum data without an owner.');
    await AsyncStorage.setItem(userKey(state.ownerUserId), JSON.stringify(state));
  },

  async clearForUser(userId: string): Promise<void> {
    await AsyncStorage.removeItem(userKey(userId));
    const legacy = await parseKey(STORAGE_KEY);
    if (legacy?.ownerUserId === userId) await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
