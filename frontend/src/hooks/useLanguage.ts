import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from './useLocale';
import { languageApi } from '@/services/languageApi';
import { loadAndSetTranslations } from '@/i18n/config';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { locale, changeLocale } = useLocale();
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await languageApi.getLanguages();
        if (response.success) {
          setLanguages(response.data);
        }
      } catch (error) {
        console.error('Error loading languages:', error);
        // Fallback languages
        setLanguages([
          { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
          { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
          { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, []);

  // Sync i18n with URL locale (only update when locale actually changes)
  useEffect(() => {
    if (!locale) return;
    
    // Only sync if locale is different from current i18n language
    if (locale !== i18n.language) {
      const syncLocale = async () => {
        try {
          // Load translations first, then change language
          await loadAndSetTranslations(locale, false);
          // Ensure localStorage is updated
          if (localStorage.getItem('i18nextLng') !== locale) {
          localStorage.setItem('i18nextLng', locale);
          }
        } catch (error) {
          console.error('Error syncing locale:', error);
          // Still update localStorage even if backend fails
          localStorage.setItem('i18nextLng', locale);
        }
      };
      syncLocale();
    } else {
      // Just ensure localStorage matches if locale already matches i18n
      if (localStorage.getItem('i18nextLng') !== locale) {
      localStorage.setItem('i18nextLng', locale);
      }
    }
  }, [locale, i18n.language]); // Include i18n.language to detect changes

  const changeLanguage = async (lang: string) => {
    // Normalize language code to lowercase
    const normalizedLang = lang.toLowerCase();
    
    if (locale !== normalizedLang) {
      try {
        // Update localStorage first for immediate feedback
        localStorage.setItem('i18nextLng', normalizedLang);
        
        // Load translations from backend
        await loadAndSetTranslations(normalizedLang, false);
        
        // Save to backend (non-blocking)
        languageApi.setLocale(normalizedLang).catch(err => {
          console.warn('Failed to save locale to backend:', err);
        });
        
        // Update URL with new locale (this will trigger navigation)
        changeLocale(normalizedLang as any);
      } catch (error) {
        console.error('Error changing language:', error);
        // Still update URL and localStorage even if backend call fails
        localStorage.setItem('i18nextLng', normalizedLang);
        changeLocale(normalizedLang as any);
      }
    }
  };

  return {
    currentLanguage: locale || 'en',
    languages,
    changeLanguage,
    loading,
  };
};

