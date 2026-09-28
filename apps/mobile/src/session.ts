import AsyncStorage from './async-storage-shim';

export type DemoUser = { phone: string; name: string; loggedInAt: string };
export type TrialState = { startedAt: string; expiresAt: string; hours: number };
export type HistoryItem = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  asset: string;
};

const keys = {
  user: 'zs.mobile.user',
  trial: 'zs.mobile.trial',
  history: 'zs.mobile.history',
  view: 'zs.mobile.view',
} as const;

/** Local demo auth — real OTP comes in a later phase. */
export async function getDemoUser(): Promise<DemoUser | null> {
  const raw = await AsyncStorage.getItem(keys.user);
  return raw ? (JSON.parse(raw) as DemoUser) : null;
}

export async function demoLogin(phone: string): Promise<DemoUser> {
  const user: DemoUser = {
    phone: phone.replace(/\D/g, '').slice(-11) || '09120000000',
    name: 'کاربر آزمایشی',
    loggedInAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(keys.user, JSON.stringify(user));
  return user;
}

export async function demoLogout() {
  await AsyncStorage.multiRemove([keys.user, keys.trial]);
}

export async function getTrial(): Promise<TrialState | null> {
  const raw = await AsyncStorage.getItem(keys.trial);
  return raw ? (JSON.parse(raw) as TrialState) : null;
}

/** Mirrors admin trial hours locally until API auth exists. Default 24h. */
export async function startLocalTrial(hours = 24): Promise<TrialState> {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + hours * 3600_000);
  const trial: TrialState = { startedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString(), hours };
  await AsyncStorage.setItem(keys.trial, JSON.stringify(trial));
  return trial;
}

export function trialRemainingLabel(trial: TrialState | null, now = Date.now()): string {
  if (!trial) return 'اعتبار آزمایشی هنوز شروع نشده';
  const left = Date.parse(trial.expiresAt) - now;
  if (left <= 0) return 'اعتبار رایگان تمام شده — برای ادامه اشتراک لازم است';
  const hours = Math.ceil(left / 3600_000);
  return `${hours} ساعت اعتبار رایگان باقی مانده`;
}

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(keys.history);
  return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
}

export async function pushHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  const list = await getHistory();
  const next: HistoryItem = {
    ...item,
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(keys.history, JSON.stringify([next, ...list].slice(0, 40)));
  return next;
}

export async function getViewMode(): Promise<'simple' | 'professional'> {
  const raw = await AsyncStorage.getItem(keys.view);
  return raw === 'professional' ? 'professional' : 'simple';
}

export async function setViewMode(view: 'simple' | 'professional') {
  await AsyncStorage.setItem(keys.view, view);
}
