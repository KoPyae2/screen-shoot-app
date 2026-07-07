import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import zh from "./locales/zh.json";
import es from "./locales/es.json";
import hi from "./locales/hi.json";
import my from "./locales/my.json";

// Chinese was originally registered under the nonstandard code "ch"
// (which is actually Chamorro — browsers report "zh"/"zh-CN", so
// auto-detection never matched). Migrate any cached preference.
try {
  if (localStorage.getItem("i18nextLng") === "ch") {
    localStorage.setItem("i18nextLng", "zh");
  }
} catch {
  // localStorage unavailable — detection will fall back to navigator.
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      es: { translation: es },
      hi: { translation: hi },
      my: { translation: my },
    },
    fallbackLng: "en",
    // Match "zh-CN" / "es-MX" etc. to their base bundle.
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
