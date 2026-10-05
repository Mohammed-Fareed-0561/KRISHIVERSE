import { useEffect, useState, useCallback } from "react";
import {
  getConnectivityState,
  probeConnectivity,
  CONNECTIVITY_STATES,
} from "../services/ai/connectivity";

/**
 * Reactive connectivity state for the UI. Starts from the fast
 * navigator.onLine signal, then refreshes with a cached lightweight /health
 * probe. Never blocks rendering.
 */
export function useConnectivity() {
  const [connectivity, setConnectivity] = useState(() => getConnectivityState());

  useEffect(() => {
    const refresh = () => {
      setConnectivity(getConnectivityState());
      probeConnectivity({ force: true })
        .then((state) => setConnectivity(state))
        .catch(() => {});
    };

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const refresh = useCallback(() => {
    return probeConnectivity({ force: true }).then(setConnectivity).catch(() => {});
  }, []);

  return {
    connectivity,
    isOnline: connectivity === CONNECTIVITY_STATES.ONLINE,
    isOffline: connectivity === CONNECTIVITY_STATES.OFFLINE,
    isUncertain: connectivity === CONNECTIVITY_STATES.UNCERTAIN,
    refresh,
  };
}

export default useConnectivity;