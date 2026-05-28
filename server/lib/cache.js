const store = new Map();

export function getCached(key) {
  const item = store.get(key);
  if (!item || item.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return item.value;
}

export async function getOrSetCache(key, ttlMs, loader) {
  const cached = getCached(key);
  if (cached) return cached;

  const value = await loader();
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  return value;
}

export function clearCache() {
  store.clear();
}
