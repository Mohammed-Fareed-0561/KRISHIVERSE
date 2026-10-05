export const DB_STORES = {
  meta: "meta",
  weatherForecast: "weatherForecast",
  mandiPrices: "mandiPrices",
  schemes: "schemes",
  shops: "shops",
  chatHistory: "chatHistory",
  diseaseDiagnoses: "diseaseDiagnoses",
  syncQueue: "syncQueue",
  crops: "crops",
  symptoms: "symptoms",
  diseasePests: "diseasePests",
  treatments: "treatments",
  concepts: "concepts",
  edges: "edges",
  farmers: "farmers",
  marketplace: "marketplace",
};

export function getDbName() {
  return import.meta.env.VITE_DB_NAME || "KrishiVerse";
}

export function getDbVersion() {
  const raw = import.meta.env.VITE_DB_VERSION;
  const parsed = Number.parseInt(raw ?? "6", 10);
  return Number.isFinite(parsed) ? parsed : 6;
}
