import { useEffect, useCallback } from "react";
import { useAdvisoryStore } from "../store/advisoryStore";
import { useOffline } from "./useOffline";
import { useLanguage } from "./useLanguage";

/**
 * buildAdvisoryContext — location is explicit-or-unknown, never invented.
 * A district is forwarded ONLY when the caller supplies one (user-selected or
 * known context). There is no default district: the previous hardcoded city
 * fallback has been removed (see evaluation-report failures).
 */
export function buildAdvisoryContext(context = {}) {
  const { district, ...rest } = context || {};
  return typeof district === "string" && district.trim()
    ? { ...rest, district: district.trim() }
    : { ...rest };
}

export function useAdvisory() {
  const { isOffline } = useOffline();
  const { language } = useLanguage();
  const store = useAdvisoryStore();

  // Load chat history from IndexedDB on mount
  useEffect(() => {
    store.loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = useCallback(
    async (question, options = {}) => {
      if (!question?.trim()) return;
      const { context = {}, displayQuestion } = options;
      return store.ask({
        question: question.trim(),
        displayQuestion: displayQuestion?.trim() || question.trim(),
        language: language?.startsWith("ta") ? "ta" : "en",
        context: buildAdvisoryContext(context),
      });
    },
    [language, store],
  );

  return {
    messages: store.messages,
    loading: store.loading,
    error: store.error,
    offline: store.offline || isOffline,
    ragStatus: store.ragStatus,
    ask,
    clearError: store.clearError,
  };
}

export function useDiagnose() {
  const { language } = useLanguage();
  const store = useAdvisoryStore();

  useEffect(() => {
    store.loadDiagnoses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diagnose = useCallback(
    async ({ symptoms, cropType }) => {
      return store.diagnose({
        symptoms,
        cropType,
        language: language?.startsWith("ta") ? "ta" : "en",
      });
    },
    [language, store],
  );

  return {
    diagnoses: store.diagnoses,
    loading: store.loading,
    error: store.error,
    diagnose,
    addDiagnose: store.addDiagnoseRecord,
    clearError: store.clearError,
    clearDiagnoses: store.clearDiagnoses,
  };
}
