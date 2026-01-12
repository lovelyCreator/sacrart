const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface TranslationResult {
  en: string;
  es: string;
  pt: string;
}

export interface FieldTranslations {
  [fieldName: string]: TranslationResult;
}

/**
 * Translate a single text to multiple languages
 */
export async function translateText(
  text: string,
  sourceLanguage: 'en' | 'es' | 'pt' = 'en',
  targetLanguages: ('en' | 'es' | 'pt')[] = ['es', 'pt']
): Promise<{ success: boolean; data?: TranslationResult; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
        target_languages: targetLanguages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Translation failed',
      };
    }

    return {
      success: true,
      data: data.data as TranslationResult,
    };
  } catch (error: any) {
    console.error('Translation error:', error);
    return {
      success: false,
      message: error.message || 'Translation request failed',
    };
  }
}

/**
 * Translate multiple fields at once
 */
export async function translateFields(
  fields: { [fieldName: string]: string },
  sourceLanguage: 'en' | 'es' | 'pt' = 'en',
  targetLanguages: ('en' | 'es' | 'pt')[] = ['es', 'pt']
): Promise<{ success: boolean; data?: FieldTranslations; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/translate/fields`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fields,
        source_language: sourceLanguage,
        target_languages: targetLanguages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Translation failed',
      };
    }

    return {
      success: true,
      data: data.data as FieldTranslations,
    };
  } catch (error: any) {
    console.error('Translation error:', error);
    return {
      success: false,
      message: error.message || 'Translation request failed',
    };
  }
}

const translationApi = {
  translateText,
  translateFields,
};

export default translationApi;
