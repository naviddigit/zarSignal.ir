export type WarningPolicy = { version: string; timezone: 'Asia/Tehran'; warningStart: string; warningEnd: string };
export const defaultWarningPolicy: WarningPolicy = { version: 'approved-default-v1', timezone: 'Asia/Tehran', warningStart: '21:00', warningEnd: '10:00' };
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validWarningWindow(start: unknown, end: unknown): start is string {
  return typeof start === 'string' && typeof end === 'string' && clock.test(start) && clock.test(end) && start !== end;
}
export function timeReliability(policy: WarningPolicy, now = new Date()): 'STANDARD' | 'WARNING' {
  if (!validWarningWindow(policy.warningStart, policy.warningEnd)) throw new Error('Invalid policy');
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const time = `${parts.find(p => p.type === 'hour')!.value}:${parts.find(p => p.type === 'minute')!.value}`;
  const { warningStart: start, warningEnd: end } = policy;
  return (start < end ? time >= start && time < end : time >= start || time < end) ? 'WARNING' : 'STANDARD';
}
