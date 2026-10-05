function envBool(key, fallback = false) {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

export const featureFlags = {
  enableClaudeVerification: envBool("VITE_ENABLE_CLAUDE_VERIFICATION", false),
  enableVoiceInput: envBool("VITE_ENABLE_VOICE_INPUT", true),
  enableBackgroundSync: envBool("VITE_ENABLE_BACKGROUND_SYNC", true),
  enableGeolocation: envBool("VITE_ENABLE_GEOLOCATION", true),
  enableNotifications: envBool("VITE_ENABLE_NOTIFICATIONS", true),
};
