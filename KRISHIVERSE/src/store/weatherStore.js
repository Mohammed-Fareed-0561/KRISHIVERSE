import { create } from "zustand";
import { getWeather, fetchForecast } from "../services/api/weatherService";
import { appConfig } from "../services/config/appConfig";

export const useWeatherStore = create((set, get) => ({
  current: null,
  forecast: null,
  loading: false,
  error: null,
  fromCache: false,
  lat: appConfig.defaultLat,
  lon: appConfig.defaultLon,

  setLocation: (lat, lon) => set({ lat, lon }),

  fetchCurrent: async (lat, lon) => {
    const useLat = lat ?? get().lat;
    const useLon = lon ?? get().lon;
    set({ loading: true, error: null });
    try {
      const result = await getWeather({ lat: useLat, lon: useLon });
      set({
        current: result.data,
        fromCache: !!result.fromCache,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchForecast: async (lat, lon) => {
    const useLat = lat ?? get().lat;
    const useLon = lon ?? get().lon;
    set({ loading: true, error: null });
    try {
      const data = await fetchForecast({ lat: useLat, lon: useLon });
      set({ forecast: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));
