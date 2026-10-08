import { useCallback, useEffect, useRef, useState } from "react";
import { adminGet } from "./adminApi";

/**
 * Fetch an admin endpoint with loading / error / data state and optional polling.
 * Never throws: failures land in state.error so a broken panel cannot break the shell.
 */
export function useAdminData(path, { intervalMs = 0, params = undefined, enabled = true } = {}) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const mounted = useRef(true);
  const paramsKey = JSON.stringify(params || null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled || !path) return;
    try {
      const data = await adminGet(path, params);
      if (mounted.current) setState({ loading: false, data, error: null });
    } catch (error) {
      if (mounted.current) {
        setState((prev) => ({
          loading: false,
          data: prev.data,
          error: error?.message || "Request failed",
          code: error?.code,
          status: error?.status,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, enabled]);

  useEffect(() => {
    if (!enabled || !path) return undefined;
    setState((prev) => ({ ...prev, loading: prev.data ? false : true }));
    load();
    if (!intervalMs) return undefined;
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs, enabled]);

  return { ...state, refresh: load };
}
