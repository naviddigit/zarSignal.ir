/**
 * Tiny AsyncStorage shim: uses localStorage on web, in-memory on native
 * until @react-native-async-storage is added in a later phase.
 */
const memory = new Map<string, string>();

const web = typeof localStorage !== 'undefined';

async function getItem(key: string) {
  if (web) return localStorage.getItem(key);
  return memory.get(key) ?? null;
}

async function setItem(key: string, value: string) {
  if (web) localStorage.setItem(key, value);
  else memory.set(key, value);
}

async function removeItem(key: string) {
  if (web) localStorage.removeItem(key);
  else memory.delete(key);
}

async function multiRemove(keys: string[]) {
  await Promise.all(keys.map(removeItem));
}

export default { getItem, setItem, removeItem, multiRemove };
