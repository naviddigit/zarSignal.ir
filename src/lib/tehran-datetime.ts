/** Convert Date → Tehran wall-clock parts for display/editing. */
export function tehranParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Build UTC Date from Tehran Y-M-D H:M using an offset probe. */
export function tehranLocalToUtc(year: number, month: number, day: number, hour: number, minute: number) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const asTehran = tehranParts(guess);
  const desiredAsUtcMin = Date.UTC(year, month - 1, day, hour, minute);
  const actualAsUtcMin = Date.UTC(asTehran.year, asTehran.month - 1, asTehran.day, asTehran.hour, asTehran.minute);
  return new Date(guess.getTime() + (desiredAsUtcMin - actualAsUtcMin));
}

export function formatTehranDateTime(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}
