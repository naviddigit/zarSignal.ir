/** Bound response time; the underlying database driver keeps its own connection timeout. */
export async function withDeadline<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Operation timed out')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
