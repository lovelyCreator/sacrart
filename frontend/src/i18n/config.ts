import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import ptTranslations from './locales/pt/translation.json';
import { languageApi } from '../services/languageApi';

// Validate translation files are loaded correctly
const validateTranslations = (translations: any, locale: string) => {
  if (!translations || typeof translations !== 'object') {
    console.error(`❌ Invalid translations for ${locale}:`, typeof translations);
    return false;
  }
  const keys = Object.keys(translations);
  if (keys.length === 0) {
    console.error(`❌ Empty translations for ${locale}`);
    return false;
  }
  console.log(`✓ Validated ${locale} translations: ${keys.length} top-level keys`);
  return true;
};

// Validate all translation files
const enValid = validateTranslations(enTranslations, 'en');
const esValid = validateTranslations(esTranslations, 'es');
const ptValid = validateTranslations(ptTranslations, 'pt');

const resources = {
  en: {
    translation: enValid ? enTranslations : {},
  },
  es: {
    translation: esValid ? esTranslations : {},
  },
  pt: {
    translation: ptValid ? ptTranslations : {},
  },
};

// Log resource status
console.log('i18n Resources Status:', {
  en: enValid ? '✓' : '❌',
  es: esValid ? '✓' : '❌',
  pt: ptValid ? '✓' : '❌',
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Explicitly set default language to English
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'], // Only use localStorage, don't auto-detect from navigator
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    // Disable automatic language change
    load: 'languageOnly',
    // Ensure i18n is ready before components use it
    react: {
      useSuspense: false, // Don't use suspense, handle loading manually
    },
    // Debug mode in development
    debug: import.meta.env.DEV,
  });

// Track if we're currently loading translations to prevent loops
let isLoadingTranslations = false;

// Load backend translations from database
const loadBackendTranslations = async (language: string) => {
  try {
    // Add a small delay to avoid race conditions on slow networks
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const response = await languageApi.getTranslations(language);
    
    // Handle different response formats
    if (!response || typeof response !== 'object') {
      console.warn(`Invalid response format for ${language}:`, typeof response);
      return {};
    }
    
    // Check if it's already the nested structure we need (direct translation object)
    if (response.success === undefined && response.locale === undefined && !Array.isArray(response)) {
      // It's already the data object with nested structure
      const keys = Object.keys(response);
      if (keys.length > 0) {
        console.log(`✓ Using direct response object for ${language}, keys:`, keys);
        return response;
      }
    }
    
    // Extract data if wrapped in API response
    const data = response.data || response.translations || response;
    
    // Ensure we have a valid object
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        console.log(`✓ Extracted data for ${language}, keys:`, keys);
        return data;
      }
    }
    
    console.warn(`No valid translation data found for ${language}, using file-based translations`);
    return {};
  } catch (error: any) {
    // More specific error handling
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn(`Translation fetch timeout for ${language}, using file-based translations`);
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.warn(`Network error for ${language}, using file-based translations`);
    } else {
      console.error(`Failed to load backend translations for ${language}:`, error);
    }
    // Return empty object to fall back to file-based translations
    return {};
  }
};

// Function to load and add translations dynamically from database
export const loadAndSetTranslations = async (locale: string, skipI18nChange = false) => {
  // Validate locale
  const validLocale = ['en', 'es', 'pt'].includes(locale) ? locale : 'en';
  
  if (isLoadingTranslations) {
    console.log(`Translation load already in progress for ${validLocale}, skipping...`);
    return; // Prevent multiple simultaneous loads
  }
  
  isLoadingTranslations = true;
  try {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      console.warn('i18n not initialized yet, waiting...');
      await new Promise(resolve => {
        if (i18n.isInitialized) {
          resolve(undefined);
        } else {
          i18n.on('initialized', resolve);
        }
      });
    }
    
    const backendTranslations = await loadBackendTranslations(validLocale);
    const keysCount = backendTranslations ? Object.keys(backendTranslations).length : 0;
    
    // CRITICAL: Always ensure English is available (it's the fallback)
    if (!i18n.hasResourceBundle('en', 'translation') && resources.en && resources.en.translation) {
      console.warn('⚠ English resource bundle missing, adding it...');
      i18n.addResourceBundle('en', 'translation', resources.en.translation, true, true);
      console.log('✓ English resource bundle added');
    }
    
    // Ensure file-based translations are available first
    if (!i18n.hasResourceBundle(validLocale, 'translation')) {
      console.warn(`⚠ No file-based translations found for ${validLocale}, attempting to add...`);
      // Try to add from resources if available
      if (resources[validLocale as keyof typeof resources]) {
        const resourceData = resources[validLocale as keyof typeof resources].translation;
        if (resourceData && Object.keys(resourceData).length > 0) {
          i18n.addResourceBundle(validLocale, 'translation', resourceData, true, true);
          console.log(`✓ Added file-based resource bundle for ${validLocale}`);
        } else {
          console.error(`❌ Resource data for ${validLocale} is empty`);
        }
      } else {
        console.error(`❌ No file-based translations available for ${validLocale}`);
      }
    }
    
    if (backendTranslations && keysCount > 0) {
      // Merge backend translations with existing resources (overwrite file-based with database)
      // The third parameter (true) means deep merge, fourth parameter (true) means overwrite existing
      i18n.addResourceBundle(validLocale, 'translation', backendTranslations, true, true);
      console.log(`✓ Added backend resource bundle for ${validLocale} with ${keysCount} top-level keys`);
      
      // Verify support translations specifically
      const backendTranslationsAny = backendTranslations as any;
      if (backendTranslationsAny.support) {
        const supportCount = Object.keys(backendTranslationsAny.support).length;
        console.log(`✓ Support translations found in backend: ${supportCount} keys`);
        
        // Test a support translation key
        const testSupportKey = 'support.center';
        const testSupportTranslation = i18n.t(testSupportKey, { lng: validLocale });
        if (testSupportTranslation && testSupportTranslation !== testSupportKey) {
          console.log(`✓ Support translation test passed: "${testSupportKey}" = "${testSupportTranslation}"`);
        } else {
          console.warn(`⚠ Support translation test failed: "${testSupportKey}" returned "${testSupportTranslation}"`);
        }
      } else {
        console.warn(`⚠ No 'support' key found in backend translations for ${validLocale}`);
        console.log(`Available top-level keys:`, Object.keys(backendTranslations).slice(0, 10));
      }
    } else {
      console.log(`No backend translations for ${validLocale}, using file-based translations only`);
      
      // Verify file-based support translations
      const localeResource = resources[validLocale as keyof typeof resources];
      if (localeResource?.translation && typeof localeResource.translation === 'object' && 'support' in localeResource.translation) {
        const supportObj = (localeResource.translation as any).support;
        if (supportObj && typeof supportObj === 'object') {
          const fileSupportCount = Object.keys(supportObj).length;
          console.log(`✓ File-based support translations available: ${fileSupportCount} keys`);
        } else {
          console.warn(`⚠ File-based support translations found but invalid for ${validLocale}`);
        }
      } else {
        console.warn(`⚠ No file-based support translations found for ${validLocale}`);
      }
    }
    
    // Final verification
    const hasResource = i18n.hasResourceBundle(validLocale, 'translation');
    if (!hasResource) {
      console.error(`❌ CRITICAL: No resource bundle available for ${validLocale} after loading!`);
    } else {
      console.log(`✓ Resource bundle verified for ${validLocale}`);
      
      // Final test of support translations
      const finalTestKey = 'support.center';
      const finalTest = i18n.t(finalTestKey, { lng: validLocale });
      if (finalTest && finalTest !== finalTestKey) {
        console.log(`✓ Final support translation test passed: "${finalTestKey}" = "${finalTest}"`);
      } else {
        console.error(`❌ Final support translation test FAILED: "${finalTestKey}" = "${finalTest}"`);
      }
    }
    
    // Only change i18n language if explicitly requested (not during automatic syncing)
    if (!skipI18nChange && i18n.language !== validLocale) {
      try {
        await i18n.changeLanguage(validLocale);
        console.log(`✓ Changed i18n language to ${validLocale}`);
        
        // Verify the language change worked
        const currentLang = i18n.language;
        if (currentLang !== validLocale) {
          console.warn(`⚠ Language change mismatch: expected ${validLocale}, got ${currentLang}`);
        }
        
        // Test a translation key to ensure it works
        const testKey = 'common.home';
        const testTranslation = i18n.t(testKey, { lng: validLocale });
        if (testTranslation === testKey) {
          console.warn(`⚠ Translation test failed for ${validLocale}: key "${testKey}" returned itself`);
        } else {
          console.log(`✓ Translation test passed for ${validLocale}: "${testKey}" = "${testTranslation}"`);
        }
      } catch (changeError) {
        console.error(`❌ Failed to change language to ${validLocale}:`, changeError);
        throw changeError;
      }
    }
  } catch (error) {
    console.error(`Error loading translations for ${validLocale}:`, error);
    // Don't fail completely, just use file-based translations
    // Still try to change language if needed
    if (!skipI18nChange && i18n.language !== validLocale) {
      try {
        await i18n.changeLanguage(validLocale);
      } catch (changeError) {
        console.error(`Failed to change language to ${validLocale}:`, changeError);
      }
    }
  } finally {
    isLoadingTranslations = false;
  }
};

// Wait for i18n to be ready before loading backend translations
const initializeBackendTranslations = () => {
  const initialLocale = localStorage.getItem('i18nextLng') || 'en';
  // Ensure locale is valid
  const validLocale = ['en', 'es', 'pt'].includes(initialLocale) ? initialLocale : 'en';
  
  console.log(`Initializing i18n with locale: ${validLocale}`);
  console.log(`Current i18n language: ${i18n.language}`);
  console.log(`Available languages: ${i18n.languages.join(', ')}`);
  
  // CRITICAL: Ensure English is always available first (it's the fallback)
  if (!i18n.hasResourceBundle('en', 'translation')) {
    console.warn('⚠ English resource bundle missing, adding it...');
    if (resources.en && resources.en.translation) {
      i18n.addResourceBundle('en', 'translation', resources.en.translation, true, true);
      console.log('✓ English resource bundle added');
    }
  }
  
  // First, ensure the file-based language is set immediately
  if (i18n.language !== validLocale) {
    i18n.changeLanguage(validLocale).then(() => {
      console.log(`✓ Initial language set to ${validLocale}`);
      
      // Test file-based translations
      const testKey = 'common.home';
      const testTranslation = i18n.t(testKey);
      if (testTranslation && testTranslation !== testKey) {
        console.log(`✓ File-based translations working for ${validLocale}: "${testKey}" = "${testTranslation}"`);
      } else {
        console.error(`❌ File-based translations NOT working for ${validLocale}: "${testKey}" = "${testTranslation}"`);
        
        // If English fails, try to force reload it
        if (validLocale === 'en') {
          console.log('Attempting to force reload English translations...');
          if (resources.en && resources.en.translation) {
            i18n.addResourceBundle('en', 'translation', resources.en.translation, true, true);
            const retest = i18n.t(testKey, { lng: 'en' });
            console.log(`After force reload: "${testKey}" = "${retest}"`);
          }
        }
      }
    }).catch(err => {
      console.error(`❌ Failed to set initial language to ${validLocale}:`, err);
    });
  } else {
    // Even if language matches, test it
    const testKey = 'common.home';
    const testTranslation = i18n.t(testKey);
    if (testTranslation && testTranslation !== testKey) {
      console.log(`✓ Current language ${validLocale} translations working: "${testKey}" = "${testTranslation}"`);
    } else {
      console.error(`❌ Current language ${validLocale} translations NOT working: "${testKey}" = "${testTranslation}"`);
    }
  }
  
  // Load backend translations after a delay to ensure i18n is fully initialized
  // Use longer delay on VPS to account for network latency
  const isVPS = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const delay = isVPS ? 1000 : 100; // Increased delay for VPS to ensure backend is ready
  console.log(`Environment: ${isVPS ? 'VPS' : 'Local'}, delay: ${delay}ms`);
  
  setTimeout(() => {
    loadAndSetTranslations(validLocale, false).catch(err => {
      console.warn('Failed to load initial translations from backend, using file-based translations:', err);
      // Ensure i18n language is still set even if backend fails
      if (i18n.language !== validLocale) {
        i18n.changeLanguage(validLocale).catch(changeErr => {
          console.error('Failed to change language:', changeErr);
        });
      }
    });
  }, delay);
};

// Diagnostic function to test all locales
export const testAllLocales = () => {
  const testKey = 'common.home';
  const locales = ['en', 'es', 'pt'];
  
  console.log('=== Testing All Locales ===');
  locales.forEach(locale => {
    const translation = i18n.t(testKey, { lng: locale });
    const hasResource = i18n.hasResourceBundle(locale, 'translation');
    const status = translation && translation !== testKey ? '✓' : '❌';
    console.log(`${status} ${locale}: "${translation}" (hasResource: ${hasResource})`);
  });
  console.log('=== End Locale Test ===');
};

// Wait for i18n to be ready
if (i18n.isInitialized) {
  initializeBackendTranslations();
  // Run diagnostic after a short delay
  setTimeout(() => testAllLocales(), 1000);
} else {
  i18n.on('initialized', () => {
    initializeBackendTranslations();
    // Run diagnostic after initialization
    setTimeout(() => testAllLocales(), 1000);
  });
}

export default i18n;
