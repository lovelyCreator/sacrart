const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper function to get locale from localStorage or default to 'en'
const getLocale = (): string => {
  return localStorage.getItem('i18nextLng') || 'en';
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const locale = getLocale();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': locale,
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return {} as T;
}

export interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
}

export const languageApi = {
  // Get available languages
  getLanguages: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/languages`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return handleResponse<any>(response);
  },

  // Get current locale
  getLocale: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/locale`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return handleResponse<any>(response);
  },

  // Set locale
  setLocale: async (locale: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/locale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ locale }),
    });
    return handleResponse<any>(response);
  },

  // Get translations for a locale
  getTranslations: async (locale?: string): Promise<any> => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const url = locale ? `${API_BASE_URL}/translations/${locale}` : `${API_BASE_URL}/translations`;
      console.log(`Fetching translations from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Translation API returned ${response.status} for ${locale}`);
        return {};
      }
      
      const result = await handleResponse<any>(response);
      console.log(`API response for ${locale}:`, result);
      // The backend returns { success: true, locale: 'en', data: {...} }
      const translations = result.data || result.translations || {};
      console.log(`Extracted translations for ${locale}:`, Object.keys(translations).length, 'top-level keys');
      return translations;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle different error types
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.warn(`Translation fetch timeout for ${locale}, using file-based translations`);
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        console.warn(`Network error fetching translations for ${locale}, using file-based translations`);
      } else {
        console.error(`Error fetching translations for ${locale}:`, error);
      }
      return {};
    }
  },

  // Admin: Get all translations
  getAllTranslations: async (): Promise<any> => {
    const headers = getAuthHeaders();
    const url = `${API_BASE_URL}/admin/translations`;
    
    // Check if Authorization header exists (handle different HeadersInit types)
    const authToken = typeof headers === 'object' && !Array.isArray(headers) 
      ? (headers as Record<string, string>).Authorization || ''
      : '';
    const hasAuth = authToken.length > 0;
    
    console.log('🔍 Fetching all translations from:', url);
    console.log('🔑 Auth token present:', hasAuth);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('❌ API Error:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ API Error (text):', text);
          errorMessage = text || errorMessage;
        }
        
        // Provide more specific error messages
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: You do not have admin permissions.';
        } else if (response.status === 404) {
          errorMessage = 'Not Found: The translations endpoint was not found.';
        } else if (response.status === 500) {
          errorMessage = 'Server Error: The server encountered an error.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('✅ Translations fetched successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Error in getAllTranslations:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        throw new Error('Network error: Could not connect to server. Please check your internet connection and server status.');
      }
      
      throw error;
    }
  },

  // Admin: Update translation
  updateTranslation: async (key: string, locale: string, value: string, group?: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/admin/translations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ key, locale, value, group }),
    });
    return handleResponse<any>(response);
  },

  // Admin: Bulk update translations
  bulkUpdateTranslations: async (translations: Array<{key: string, locale: string, value: string, group?: string}>): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/admin/translations/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ translations }),
    });
    return handleResponse<any>(response);
  },

  // Admin: Delete translation
  deleteTranslation: async (id: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/admin/translations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },
};

export default languageApi;
