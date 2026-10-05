import { useState, useEffect, useRef } from "react";

/**
 * Requests and tracks the browser's Geolocation.
 *
 * States:
 *   'idle'      — not yet requested
 *   'loading'   — permission prompt open / locating
 *   'success'   — coords available
 *   'denied'    — user denied permission
 *   'error'     — other geolocation error
 *
 * Uses watchPosition with enableHighAccuracy: true and maximumAge: 0
 * to always return the real current position, never a stale cached fix.
 */
export function useGeolocation() {
  const [state, setState] = useState({
    status: "idle",
    lat: null,
    lon: null,
    accuracy: null,
    error: null,
  });
  const watchIdRef = useRef(null);

  const onSuccess = (pos) => {
    setState({
      status: "success",
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      error: null,
    });
  };

  const onError = (err) => {
    const denied = err.code === err.PERMISSION_DENIED;
    setState({
      status: denied ? "denied" : "error",
      lat: null,
      lon: null,
      accuracy: null,
      error: { message: err.message, code: err.code },
    });
  };

  // Options: high accuracy, no cache, generous timeout
  const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0, // ← never use a cached position from another city
  };

  function request() {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        status: "error",
        error: { message: "Geolocation is not supported by your browser." },
      }));
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setState((s) => ({ ...s, status: "loading", error: null }));

    // Use watchPosition so subsequent device movements also update the pin
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      GEO_OPTIONS,
    );
  }

  // Auto-request on mount; clear watch on unmount
  useEffect(() => {
    request();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, request };
}
