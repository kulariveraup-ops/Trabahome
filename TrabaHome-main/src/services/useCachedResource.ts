import { useCallback, useEffect, useRef, useState } from "react";
import { readJsonCache, readJsonCacheStale, writeJsonCache } from "./pageCache.ts";

const resourceRequests = new Map<string, Promise<unknown>>();

const loadResourceOnce = <T,>(cacheKey: string, load: () => Promise<T>): Promise<T> => {
  const existing = resourceRequests.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = load().finally(() => {
    if (resourceRequests.get(cacheKey) === promise) {
      resourceRequests.delete(cacheKey);
    }
  });
  resourceRequests.set(cacheKey, promise);
  return promise;
};

type CachedResourceOptions<T> = {
  cacheKey: string;
  ttlMs: number;
  enabled?: boolean;
  load: () => Promise<T>;
  shouldCache?: (value: T) => boolean;
};

export const useCachedResource = <T,>({
  cacheKey,
  ttlMs,
  enabled = true,
  load,
  shouldCache = () => true,
}: CachedResourceOptions<T>) => {
  const [value, setValue] = useState<T | null>(() => readJsonCacheStale<T>(cacheKey));
  const [isLoading, setIsLoading] = useState<boolean>(() => value == null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  const shouldCacheRef = useRef(shouldCache);
  loadRef.current = load;
  shouldCacheRef.current = shouldCache;

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    const hasCachedValue = readJsonCache<T>(cacheKey, ttlMs) != null;
    if (!hasCachedValue) setIsLoading(true);
    setError(null);
    try {
      const nextValue = await loadResourceOnce(cacheKey, () => loadRef.current());
      if (shouldCacheRef.current(nextValue)) {
        writeJsonCache(cacheKey, nextValue);
      }
      setValue(nextValue);
      return nextValue;
    } catch (nextError) {
      setError("Unable to load data.");
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, enabled, ttlMs]);

  useEffect(() => {
    if (!enabled) return;
    const cachedValue = readJsonCacheStale<T>(cacheKey);
    if (cachedValue != null) {
      setValue(cachedValue);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    void refresh().catch(() => {
      // error state is handled above; keep cached data visible.
    });
  }, [cacheKey, enabled, refresh, ttlMs]);

  return {
    value,
    setValue,
    isLoading,
    setIsLoading,
    error,
    setError,
    refresh,
  };
};
