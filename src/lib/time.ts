export function formatRelativeTime(value: string | Date, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'زمان نامشخص';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  const number = new Intl.NumberFormat('fa-IR');
  if (seconds < 5) return 'همین حالا';
  if (seconds < 60) return `${number.format(seconds)} ثانیه پیش`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${number.format(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${number.format(hours)} ساعت پیش`;
  return `${number.format(Math.floor(hours / 24))} روز پیش`;
}
