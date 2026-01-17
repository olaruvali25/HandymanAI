import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const IS_DEV = process.env.NODE_ENV === "development";

void i18n.use(initReactI18next).init({
  debug: IS_DEV,
  fallbackLng: "en",
  lng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
  resources: {
    en: {
      common: {
        appName: "Fixly",
      },
    },
  },
});

export default i18n;
