const hits = new Map<string, number>();

export function isRateLimited(key: string, intervalMs: number): boolean {
  const now = Date.now();
  const last = hits.get(key) ?? 0;
  if (now - last < intervalMs) {
    return true;
  }
  hits.set(key, now);
  return false;
}
