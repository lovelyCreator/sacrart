import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import translationApi from '@/services/translationApi';

interface TranslateButtonProps {
  fields: { [fieldName: string]: string };
  sourceLanguage?: 'en' | 'es' | 'pt';
  onTranslate: (translations: { [fieldName: string]: { en: string; es: string; pt: string } }) => void;
  disabled?: boolean;
  className?: string;
}

const TranslateButton: React.FC<TranslateButtonProps> = ({
  fields,
  sourceLanguage = 'en',
  onTranslate,
  disabled = false,
  className = '',
}) => {
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    // Filter out empty fields
    const nonEmptyFields: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.trim()) {
        nonEmptyFields[key] = value;
      }
    }

    if (Object.keys(nonEmptyFields).length === 0) {
      toast.error('Please fill in at least one field to translate');
      return;
    }

    // Validate sourceLanguage
    if (!['en', 'es', 'pt'].includes(sourceLanguage)) {
      console.error('Invalid sourceLanguage:', sourceLanguage);
      toast.error('Invalid source language. Please refresh and try again.');
      return;
    }

    console.log('Starting translation:', { sourceLanguage, fields: nonEmptyFields });

    setTranslating(true);
    try {
      // Get target languages (all except source)
      const allLanguages: ('en' | 'es' | 'pt')[] = ['en', 'es', 'pt'];
      const targetLanguages = allLanguages.filter(lang => lang !== sourceLanguage) as ('en' | 'es' | 'pt')[];
      
      const result = await translationApi.translateFields(
        nonEmptyFields,
        sourceLanguage,
        targetLanguages
      );

      if (result.success && result.data) {
        // Check for warnings from backend
        if ((result as any).warnings) {
          console.warn('Backend translation warnings:', (result as any).warnings);
        }
        // The backend returns: translated target languages + original source language
        // Build complete translations object ensuring all languages are present
        const translationsWithSource: { [fieldName: string]: { en: string; es: string; pt: string } } = {};
        for (const [fieldName, sourceValue] of Object.entries(nonEmptyFields)) {
          const fieldTranslations = result.data[fieldName] || {};
          
          // The backend adds the source language back, so we should have all three languages
          // Explicitly preserve the source language value - always use sourceValue for source language
          // For target languages, use the translation from backend (check if it exists and is not empty)
          translationsWithSource[fieldName] = {
            en: sourceLanguage === 'en' 
              ? sourceValue  // Source language: always preserve original value
              : (fieldTranslations.en !== undefined && fieldTranslations.en !== null ? fieldTranslations.en : ''),  // Target language: use translation
            es: sourceLanguage === 'es' 
              ? sourceValue  // Source language: always preserve original value
              : (fieldTranslations.es !== undefined && fieldTranslations.es !== null ? fieldTranslations.es : ''),  // Target language: use translation
            pt: sourceLanguage === 'pt' 
              ? sourceValue  // Source language: always preserve original value
              : (fieldTranslations.pt !== undefined && fieldTranslations.pt !== null ? fieldTranslations.pt : ''),  // Target language: use translation
          };
        }
        
        // Verify translations were received and are different from source
        let translationIssues: string[] = [];
        for (const [fieldName, sourceValue] of Object.entries(nonEmptyFields)) {
          const translations = translationsWithSource[fieldName];
          for (const lang of ['en', 'es', 'pt'] as const) {
            if (lang !== sourceLanguage) {
              const translatedValue = translations[lang];
              // Check if translation is missing, empty, or same as source (which indicates translation failed)
              if (!translatedValue || translatedValue.trim() === '' || translatedValue === sourceValue) {
                translationIssues.push(`${fieldName}.${lang}`);
              }
            }
          }
        }
        
        console.log('Translation result:', { 
          sourceLanguage, 
          sourceFields: nonEmptyFields,
          backendResponse: result.data,
          finalTranslations: translationsWithSource,
          translationIssues: translationIssues.length > 0 ? translationIssues : 'none'
        });
        
        if (translationIssues.length > 0) {
          console.warn('Some translations may have failed:', translationIssues);
          console.error('Backend response details:', {
            backendResponse: result.data,
            sourceLanguage,
            expectedTargetLanguages: targetLanguages,
            issue: 'Translations returned same text as source, indicating API call may have failed. Check Laravel logs (storage/logs/laravel.log) for details.'
          });
          toast.error(`Translation failed: The backend returned the same text for target languages. This usually means:
1. Google Translate API key is missing or invalid
2. API quota exceeded
3. Network/connectivity issue

Please check the Laravel logs (storage/logs/laravel.log) for detailed error messages.`);
        }
        
        onTranslate(translationsWithSource);
        
        const langNames: { [key: string]: string } = { en: 'English', es: 'Spanish', pt: 'Portuguese' };
        const targetLangNames = targetLanguages.map(lang => langNames[lang]).join(' and ');
        toast.success(`Translated from ${langNames[sourceLanguage]} to ${targetLangNames}`);
      } else {
        console.error('Translation failed:', result);
        toast.error(result.message || 'Translation failed');
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || 'Translation request failed');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleTranslate}
      disabled={disabled || translating}
      className={className}
    >
      {translating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Translating...
        </>
      ) : (
        <>
          <Languages className="h-4 w-4 mr-2" />
          Translate to Other Languages
        </>
      )}
    </Button>
  );
};

export default TranslateButton;
