import i18n from "../i18n/i18n";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

const SUPPORTED = ["en", "ta", "hi"];

export function useLanguage() {
  const { i18n: i18nInstance } = useTranslation();

  const setLanguage = useCallback(async (lng) => {
    const target = SUPPORTED.includes(lng) ? lng : "en";
    await i18n.changeLanguage(target);
    // i18next-browser-languagedetector uses localStorage by default
    localStorage.setItem("i18nextLng", target);
  }, []);

  const language = useMemo(
    () => (SUPPORTED.includes(i18nInstance.language) ? i18nInstance.language : "en"),
    [i18nInstance.language],
  );

  return {
    language,
    setLanguage,
  };
}
