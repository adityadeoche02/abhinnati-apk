import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { mr } from './locales/mr';
import { en } from './locales/en';

export const resources = {
  mr: { translation: mr },
  en: { translation: en },
} as const;

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: 'mr', // Marathi by default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards against XSS
    },
    react: {
      useSuspense: false, // React Native safe
    },
  });

export default i18n;
