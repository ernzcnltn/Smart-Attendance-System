import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      fr: { translation: fr },
      ar: { translation: ar },
      ru: { translation: ru },
    },
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    interpolation: { escapeValue: false },
  });

// Dil değişince RTL/LTR ve localStorage güncelle
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// İlk yükte RTL/LTR ayarla
const savedLang = localStorage.getItem('language') || 'en';
document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export default i18n;