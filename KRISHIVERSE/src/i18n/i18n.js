import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { appConfig } from "../services/config/appConfig";

import en from "./locales/en.json";
import ta from "./locales/ta.json";
import hi from "./locales/hi.json";

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "ta", "hi"],
    defaultNS: "translation",
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    lng: appConfig.defaultLanguage,
  });

export default i18n;
