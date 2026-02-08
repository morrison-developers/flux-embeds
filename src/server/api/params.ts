export async function resolveRouteParams<T extends Record<string, string>>(
  paramsLike: Promise<T> | T
): Promise<T> {
  if (typeof (paramsLike as Promise<T>).then === 'function') {
    return paramsLike as Promise<T>;
  }
  return paramsLike as T;
}
