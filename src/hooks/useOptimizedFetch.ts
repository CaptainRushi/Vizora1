import { useEffect, useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for optimized data fetching with caching and deduplication
 */
export function useOptimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
        cacheTime?: number;
        enabled?: boolean;
        refetchOnMount?: boolean;
    } = {}
) {
    const {
        cacheTime = CACHE_DURATION,
        enabled = true,
        refetchOnMount = false
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);
    const fetchingRef = useRef(false);

    const fetchData = useCallback(async (force = false) => {
        if (!enabled) return;
        if (fetchingRef.current) return; // Prevent duplicate fetches

        // Check cache first
        if (!force) {
            const cached = cache.get(key);
            if (cached && Date.now() - cached.timestamp < cacheTime) {
                setData(cached.data);
                setLoading(false);
                return;
            }
        }

        fetchingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();

            if (isMountedRef.current) {
                setData(result);
                setError(null);

                // Update cache
                cache.set(key, {
                    data: result,
                    timestamp: Date.now()
                });
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err as Error);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            fetchingRef.current = false;
        }
    }, [key, fetchFn, enabled, cacheTime]);

    useEffect(() => {
        isMountedRef.current = true;

        if (enabled) {
            fetchData(refetchOnMount);
        } else {
            setLoading(false);
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [enabled, fetchData, refetchOnMount]);

    const refetch = useCallback(() => {
        return fetchData(true);
    }, [fetchData]);

    const invalidate = useCallback(() => {
        cache.delete(key);
    }, [key]);

    return {
        data,
        loading,
        error,
        refetch,
        invalidate
    };
}

/**
 * Clear all cached data
 */
export function clearCache() {
    cache.clear();
}

/**
 * Clear specific cache entry
 */
export function invalidateCache(key: string) {
    cache.delete(key);
}

/**
 * Prefetch data and store in cache
 */
export async function prefetch<T>(key: string, fetchFn: () => Promise<T>) {
    try {
        const data = await fetchFn();
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('Prefetch failed:', err);
    }
}
