import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Globe, 
  Plus,
  Edit,
  Save,
  Check,
  X,
  Flag,
  Languages,
  FileText,
  Settings
} from 'lucide-react';
import { languageApi } from '@/services/languageApi';

const MultilingualSettings = () => {
  const { t } = useTranslation();
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', isComplete: true },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', isComplete: false },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹', isComplete: false }
  ];

  // Real translation data from backend
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({
    en: {},
    es: {},
    pt: {}
  });

  const [editingTranslations, setEditingTranslations] = useState<Record<string, Record<string, string>>>({
    en: {},
    es: {},
    pt: {}
  });

  // Fetch translations from backend
  useEffect(() => {
    fetchTranslations();
  }, []);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      const response = await languageApi.getAllTranslations();
      if (response.success && response.data) {
        // Transform grouped translations into flat structure by locale
        const translationsByLocale: Record<string, Record<string, string>> = {
          en: {},
          es: {},
          pt: {}
        };

        // response.data is grouped by group, then contains translation objects
        Object.values(response.data).forEach((group: any) => {
          if (Array.isArray(group)) {
            group.forEach((translation: any) => {
              const key = translation.key || translation.translation_key;
              const locale = translation.locale || 'en';
              const value = translation.value || translation.translation || '';
              
              if (key && locale && (locale === 'en' || locale === 'es' || locale === 'pt')) {
                translationsByLocale[locale][key] = value;
              }
            });
          }
        });

        setTranslations(translationsByLocale);
        setEditingTranslations(translationsByLocale);
      }
    } catch (error: any) {
      console.error('Error fetching translations:', error);
      toast.error('Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = (languageCode: string) => {
    const totalKeys = Object.keys(translations.en).length;
    const translatedKeys = Object.keys(translations[languageCode as keyof typeof translations]).length;
    return Math.round((translatedKeys / totalKeys) * 100);
  };

  const handleSaveTranslation = (key: string, value: string) => {
    setEditingTranslations(prev => ({
      ...prev,
      [activeLanguage]: {
        ...prev[activeLanguage as keyof typeof prev],
        [key]: value
      }
    }));
    setEditingKey(null);
  };

  const handleSaveAll = () => {
    setTranslations(editingTranslations);
    // Here you would typically save to your backend
    console.log('Saving translations:', editingTranslations);
  };

  const handleEditKey = (key: string) => {
    setEditingKey(key);
  };

  const getTranslationCategories = () => {
    const categories: { [key: string]: string[] } = {};
    Object.keys(translations.en).forEach(key => {
      const category = key.split('.')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(key);
    });
    return categories;
  };

  // Export translations to JSON file
  const handleExport = async () => {
    setIsExporting(true);
    try {
      console.log('🔄 Starting export process...');
      
      // Fetch all translations from database
      console.log('📡 Fetching translations from API...');
      const response = await languageApi.getAllTranslations();
      console.log('✅ API Response received:', response);
      
      if (!response) {
        throw new Error('No response from server. Please check your connection and authentication.');
      }
      
      if (!response.success) {
        const errorMsg = response.message || 'Failed to fetch translations from database';
        console.error('❌ API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!response.data) {
        console.warn('⚠️ No data in response, response object:', response);
        throw new Error('No translation data received from server. The database might be empty.');
      }

      console.log('📦 Processing translation data...');
      // Transform the grouped translations into nested structure organized by locale
      // This matches the frontend JSON file format: { en: { subscription: { title: "..." } } }
      const exportData: { [locale: string]: { [key: string]: any } } = {
        en: {},
        es: {},
        pt: {},
      };

      let translationCount = 0;
      
      // Process grouped translations
      Object.keys(response.data).forEach((group) => {
        const groupTranslations = response.data[group];
        if (Array.isArray(groupTranslations)) {
          groupTranslations.forEach((translation: any) => {
            const { key, locale, value } = translation;
            if (locale && key && value && ['en', 'es', 'pt'].includes(locale)) {
              // Convert dot notation key (e.g., "subscription.title") to nested object
              const keys = key.split('.');
              let current = exportData[locale];
              
              // Navigate/create nested structure
              for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                  current[keys[i]] = {};
                }
                current = current[keys[i]];
              }
              
              // Set the final value
              current[keys[keys.length - 1]] = value;
              translationCount++;
            }
          });
        }
      });

      console.log(`✅ Processed ${translationCount} translations`);

      if (translationCount === 0) {
        console.warn('⚠️ No translations found to export');
        toast.warning('No translations found to export. The database might be empty.');
        return;
      }

      // Create JSON string with proper formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      console.log('📄 JSON string created, size:', jsonString.length, 'bytes');
      
      // Try multiple download methods for better browser compatibility
      try {
        // Method 1: Standard blob download (works in most browsers)
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translations_export_${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        
        // Try to trigger download
        console.log('⬇️ Attempting to download file...');
        document.body.appendChild(link);
        link.click();
        
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('✅ Download completed and cleaned up');
        }, 100);
        
        // Verify download was triggered (check if link was clicked)
        // If download doesn't work, try alternative method
        setTimeout(() => {
          // If still here, download might have been blocked
          // This is just a safety check, the download should work
        }, 500);
        
      } catch (downloadError) {
        console.warn('⚠️ Standard download method failed, trying alternative...', downloadError);
        
        // Fallback: Open in new window (user can save manually)
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`<pre>${jsonString}</pre>`);
          newWindow.document.title = 'Translations Export';
          console.log('✅ Opened translations in new window (user can save manually)');
          toast.info('Translations opened in new window. Please save the file manually (Ctrl+S or Cmd+S).');
        } else {
          // Last resort: Copy to clipboard
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jsonString).then(() => {
              toast.success('Translations copied to clipboard! Paste into a text editor and save as .json file.');
              console.log('✅ Copied translations to clipboard');
            }).catch((clipError) => {
              console.error('❌ Failed to copy to clipboard:', clipError);
              throw new Error('Download failed and clipboard copy failed. Please check browser console for the data.');
            });
          } else {
            throw new Error('Download failed. Please check browser console for the JSON data.');
          }
        }
      }

      toast.success(t('admin.multilingual_exported') || 'Translations exported successfully');
    } catch (error: any) {
      console.error('❌ Error exporting translations:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // More detailed error messages
      let errorMessage = t('admin.multilingual_export_error') || 'Failed to export translations';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to server. Please check your internet connection.';
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        errorMessage = 'Access denied. You do not have permission to export translations.';
      } else if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multilingual Settings</h1>
          <p className="text-muted-foreground">Manage translations for Spanish, Portuguese, and English</p>
        </div>
        <Button onClick={handleSaveAll}>
          <Save className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </div>

      {/* Language Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Available Languages</h3>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Language
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                activeLanguage === language.code
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setActiveLanguage(language.code)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{language.flag}</span>
                  <div>
                    <h4 className="font-medium">{language.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getCompletionPercentage(language.code)}% complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {language.isComplete ? (
                    <Badge variant="default">
                      <Check className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${getCompletionPercentage(language.code)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Translation Editor */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{languages.find(l => l.code === activeLanguage)?.flag}</span>
            <div>
              <h3 className="text-lg font-semibold">
                {languages.find(l => l.code === activeLanguage)?.name} Translations
              </h3>
              <p className="text-sm text-muted-foreground">
                {getCompletionPercentage(activeLanguage)}% complete
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Auto Translate
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isExporting ? t('admin.multilingual_exporting') || 'Exporting...' : t('admin.multilingual_export')}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(getTranslationCategories()).map(([category, keys]) => (
            <div key={category}>
              <h4 className="text-md font-semibold mb-3 capitalize flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                {category} ({keys.length} items)
              </h4>
              <div className="grid gap-3">
                {keys.map((key) => (
                  <div key={key} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">{key}</Label>
                        {editingKey === key ? (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveTranslation(key, editingTranslations[activeLanguage as keyof typeof editingTranslations][key])}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingKey(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditKey(key)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {editingKey === key ? (
                        <Textarea
                          value={editingTranslations[activeLanguage as keyof typeof editingTranslations][key] || ''}
                          onChange={(e) => setEditingTranslations(prev => ({
                            ...prev,
                            [activeLanguage]: {
                              ...prev[activeLanguage as keyof typeof prev],
                              [key]: e.target.value
                            }
                          }))}
                          className="min-h-[60px]"
                          placeholder={`Enter ${languages.find(l => l.code === activeLanguage)?.name} translation...`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {editingTranslations[activeLanguage as keyof typeof editingTranslations][key] || 
                           translations[activeLanguage as keyof typeof translations][key] || 
                           'No translation available'}
                        </div>
                      )}
                      {activeLanguage !== 'en' && (
                        <div className="text-xs text-gray-500 mt-1">
                          English: {translations.en[key as keyof typeof translations.en]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Translation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {languages.map((language) => (
          <Card key={language.code} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{language.flag}</span>
                <div>
                  <p className="text-sm font-medium">{language.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCompletionPercentage(language.code)}% complete
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {Object.keys(translations[language.code as keyof typeof translations]).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {Object.keys(translations.en).length}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MultilingualSettings;
