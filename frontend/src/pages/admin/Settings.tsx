import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  RefreshCw, 
  Settings as SettingsIcon,
  Home,
  Globe,
  FileText,
  Mail,
  Phone,
  Users,
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  Folder,
  Languages,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/hooks/useLocale';
import { useTranslation } from 'react-i18next';
import { settingsApi, SiteSetting, SettingsUpdateRequest } from '@/services/settingsApi';
import { faqApi, Faq, FaqCreateRequest, FaqUpdateRequest } from '@/services/faqApi';
import { feedbackApi, Feedback } from '@/services/feedbackApi';
import { videoApi, Video } from '@/services/videoApi';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HeroBackgroundSelector from '@/components/admin/HeroBackgroundSelector';
import FileUpload from '@/components/admin/FileUpload';
import { heroBackgroundApi } from '@/services/heroBackgroundApi';
import axios from 'axios';
import LanguageTabs from '@/components/admin/LanguageTabs';

// Multilingual data structure
interface MultilingualData {
  en: string;
  es: string;
  pt: string;
}

// Translatable settings keys
const TRANSLATABLE_KEYS = [
  'hero_badge',
  'hero_title',
  'hero_subtitle',
  'hero_description',
  'hero_stat_1_value',
  'hero_stat_1_label',
  'hero_stat_2_value',
  'hero_stat_2_label',
  'hero_stat_3_value',
  'hero_stat_3_label',
  'hero_stat_4_value',
  'hero_stat_4_label',
  'about_title',
  'about_description',
  'about_text_1',
  'about_text_2',
  'about_text_3',
  'testimonial_title',
  'testimonial_subtitle',
  'site_name',
  'site_tagline',
  'footer_copyright',
  'footer_description',
  'footer_address',
  'contact_address',
];

const Settings = () => {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, SiteSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(locale as 'en' | 'es' | 'pt' || 'en');
  
  // Multilingual state for translatable settings
  const [settingsMultilingual, setSettingsMultilingual] = useState<Record<string, MultilingualData>>({});
  const [selectedHeroBackgrounds, setSelectedHeroBackgrounds] = useState<any[]>([]);
  // Fixed hero background images (16 slots only)
  const HERO_SLOTS = 16;
  const [fixedHeroImages, setFixedHeroImages] = useState<string[]>(Array.from({ length: HERO_SLOTS }, () => ''));
  // Store hero background IDs mapped by sort_order (slot index)
  const [heroBackgroundIds, setHeroBackgroundIds] = useState<Record<number, number>>({});
  // Track current about image URL for display
  const [currentAboutImage, setCurrentAboutImage] = useState<string>('');
  
  // FAQ Management State
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqCategories, setFaqCategories] = useState<string[]>(['general', 'subscription', 'technical', 'content', 'billing']);
  const [faqLoading, setFaqLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [faqFormData, setFaqFormData] = useState<FaqCreateRequest>({
    question: '',
    answer: '',
    category: 'general',
    sort_order: 0,
    is_active: true
  });

  // Testimonial Management State (using Feedback)
  const [testimonials, setTestimonials] = useState<Feedback[]>([]);
  const [testimonialLoading, setTestimonialLoading] = useState(true);
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [selectedHomepageTestimonials, setSelectedHomepageTestimonials] = useState<number[]>([]);

  // Video Carousel Management State
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoFilter, setVideoFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedHomepageVideos, setSelectedHomepageVideos] = useState<number[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchFaqs();
    fetchFaqCategories();
    fetchTestimonials();
    fetchVideos();
  }, []);

  // Refetch settings and FAQs when content locale changes
  useEffect(() => {
    fetchSettings();
    if (user) {
      fetchFaqs();
    }
  }, [contentLocale]);

  // Update currentAboutImage when settings are loaded
  useEffect(() => {
    // Wait for settings to be loaded
    if (!settings || Object.keys(settings).length === 0) {
      return;
    }
    
    const aboutImageSetting = settings.about?.find(s => s.key === 'about_image')?.value;
    console.log('About image setting from backend:', aboutImageSetting, 'Settings about group:', settings.about);
    
    if (aboutImageSetting && String(aboutImageSetting).trim()) {
      const trimmedUrl = String(aboutImageSetting).trim();
      let processedUrl = '';
      
      // Process URL using the same logic as getImageUrl (but inline to avoid dependency issues)
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        if (trimmedUrl.includes('://') && trimmedUrl.length > 7 && !trimmedUrl.includes(' ')) {
          processedUrl = trimmedUrl.includes('?') ? `${trimmedUrl}&t=${Date.now()}` : `${trimmedUrl}?t=${Date.now()}`;
        }
      } else {
        // Use buildAbsoluteUrl for relative paths
        const abs = buildAbsoluteUrl(trimmedUrl);
        if (abs && abs.includes('://') && abs.length > 7) {
          processedUrl = abs.includes('?') ? `${abs}&t=${Date.now()}` : `${abs}?t=${Date.now()}`;
        } else {
          // Fallback: try to construct URL manually
          const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://72.61.297.64:8000/api';
          const origin = String(apiBase).replace(/\/?api\/?$/, '').trim();
          if (origin && trimmedUrl.startsWith('/')) {
            processedUrl = `${origin}${trimmedUrl}?t=${Date.now()}`;
          }
        }
      }
      
      console.log('Processed about image URL:', processedUrl, 'from raw:', aboutImageSetting);
      
      if (processedUrl) {
        setCurrentAboutImage(processedUrl);
      } else {
        // Fallback: use raw URL if processing fails
        console.warn('Failed to process about image URL, using raw:', aboutImageSetting);
        setCurrentAboutImage(trimmedUrl);
      }
    } else {
      console.log('No about image setting found, clearing currentAboutImage');
      setCurrentAboutImage('');
    }
  }, [settings, settings.about]);

  // Helper to construct full URL to backend for any given path
  const buildAbsoluteUrl = (url: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return '';
    
    const trimmedUrl = url.trim();
    
    // If already absolute, return as-is (basic validation without URL constructor)
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      // Basic validation - check if it looks like a valid URL
      if (trimmedUrl.includes('://') && trimmedUrl.length > 7) {
        return trimmedUrl;
      }
      console.warn('Invalid absolute URL format:', trimmedUrl);
      return '';
    }
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://72.61.297.64:8000/api';
      const origin = String(apiBase).replace(/\/?api\/?$/, '').trim();
      
      if (!origin || origin === '') {
        console.error('Invalid API base URL');
        return '';
      }
      
      // Clean the path
      const cleanPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
      
      // Construct full URL
      const fullUrl = `${origin}${cleanPath}`;
      
      // Basic validation - check if it looks like a valid URL
      if (fullUrl.includes('://') && fullUrl.length > 7) {
        return fullUrl;
      }
      
      console.warn('Invalid URL constructed:', fullUrl, 'from:', url);
      return '';
    } catch (error) {
      console.error('Error in buildAbsoluteUrl:', error, 'url:', url);
      return '';
    }
  };

  // Fetch hero backgrounds from database
  useEffect(() => {
    const fetchHeroBackgrounds = async () => {
      try {
        const response = await heroBackgroundApi.getAll();
        if (response.success && Array.isArray(response.data)) {
          // Helper to construct full URL and add cache buster
          const getImageUrl = (url: string) => {
            const abs = buildAbsoluteUrl(url);
            if (!abs) return '';
            return abs.includes('?') ? `${abs}&t=${Date.now()}` : `${abs}?t=${Date.now()}`;
          };

          // Map backgrounds by sort_order to slot index
          const urls: string[] = Array.from({ length: HERO_SLOTS }, () => '');
          const ids: Record<number, number> = {};
          
          response.data.forEach((bg) => {
            const sortOrder = bg.sort_order ?? 0;
            if (sortOrder >= 0 && sortOrder < HERO_SLOTS) {
              const url = bg.image_url || bg.image_path;
              urls[sortOrder] = url ? getImageUrl(url) : '';
              ids[sortOrder] = bg.id;
            }
          });
          
          setFixedHeroImages(urls);
          setHeroBackgroundIds(ids);
          
          // Also update settings for backward compatibility
          const heroJson = JSON.stringify(urls.map((u, i) => ({ url: u, alt: `Hero ${i + 1}`, rotation: 0, x: 0, y: 0 })));
          await settingsApi.bulkUpdate([{ key: 'hero_background_images', value: heroJson, group: 'hero' }]);
        }
      } catch (error) {
        console.error('Error fetching hero backgrounds:', error);
        // Fallback to settings if database fetch fails
        if (settings.hero) {
          const heroBackgroundImagesSetting = settings.hero.find(s => s.key === 'hero_background_images');
          if (heroBackgroundImagesSetting && heroBackgroundImagesSetting.value) {
            try {
              const parsedBackgrounds = JSON.parse(heroBackgroundImagesSetting.value);
              const urls: string[] = Array.isArray(parsedBackgrounds)
                ? parsedBackgrounds.map((b: any) => b.url || '').slice(0, HERO_SLOTS)
                : [];
              const padded = Array.from({ length: HERO_SLOTS }, (_, i) => urls[i] || '');
              setFixedHeroImages(padded);
            } catch (parseError) {
              console.error('Error parsing hero background images:', parseError);
            }
          }
        }
      }
    };

    fetchHeroBackgrounds();
  }, []); // Fetch on component mount

  useEffect(() => {
    // Load existing hero background images from settings as fallback (only if database fetch didn't populate)
    if (settings.hero && fixedHeroImages.every(url => !url)) {
      const heroBackgroundImagesSetting = settings.hero.find(s => s.key === 'hero_background_images');
      if (heroBackgroundImagesSetting && heroBackgroundImagesSetting.value) {
        try {
          const parsedBackgrounds = JSON.parse(heroBackgroundImagesSetting.value);
          setSelectedHeroBackgrounds(parsedBackgrounds);
          // Initialize fixed 16-slot array using urls only
          const urls: string[] = Array.isArray(parsedBackgrounds)
            ? parsedBackgrounds.map((b: any) => b.url || '').slice(0, HERO_SLOTS)
            : [];
          const padded = Array.from({ length: HERO_SLOTS }, (_, i) => urls[i] || '');
          setFixedHeroImages(padded);
        } catch (error) {
          console.error('Error parsing hero background images:', error);
        }
      }
    }

    // Load selected testimonials for homepage
    if (settings.testimonial) {
      const selectedTestimonialsSetting = settings.testimonial.find(s => s.key === 'homepage_testimonial_ids');
      if (selectedTestimonialsSetting && selectedTestimonialsSetting.value) {
        try {
          const parsedIds = JSON.parse(selectedTestimonialsSetting.value);
          setSelectedHomepageTestimonials(parsedIds);
        } catch (error) {
          console.error('Error parsing homepage testimonials:', error);
        }
      }
    }

    // Load selected videos for homepage
    if (settings.homepage) {
      const selectedVideosSetting = settings.homepage.find(s => s.key === 'homepage_video_ids');
      if (selectedVideosSetting && selectedVideosSetting.value) {
        try {
          const parsedIds = JSON.parse(selectedVideosSetting.value);
          setSelectedHomepageVideos(parsedIds);
        } catch (error) {
          console.error('Error parsing homepage videos:', error);
        }
      }
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Pass locale directly to API instead of using localStorage
      const response = await settingsApi.getAll(contentLocale);
      if (response.success && response.data) {
        const groupedSettings: Record<string, SiteSetting[]> = {};
        const settingsData = response.data;
        
        // Group settings by their group property
        Object.values(settingsData).forEach((setting: any) => {
          const group = setting.group || 'general';
          if (!groupedSettings[group]) {
            groupedSettings[group] = [];
          }
          groupedSettings[group].push(setting);
        });
        
        setSettings(groupedSettings);
        
        // Load multilingual data from settings
        const multilingualData: Record<string, MultilingualData> = {};
        TRANSLATABLE_KEYS.forEach(key => {
          // Try to get translations from settings
          const setting = Object.values(settingsData).find((s: any) => s.key === key) as any;
          if (setting) {
            const translations = setting.translations || {};
            // Preserve existing multilingual data if available, merge with fetched data
            const existing = settingsMultilingual[key] || { en: '', es: '', pt: '' };
            multilingualData[key] = {
              en: translations.en || setting.value || existing.en || '',
              es: translations.es || existing.es || '',
              pt: translations.pt || existing.pt || '',
            };
          } else {
            // Keep existing data if setting not found
            multilingualData[key] = settingsMultilingual[key] || { en: '', es: '', pt: '' };
          }
        });
        setSettingsMultilingual(multilingualData);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error(`Failed to load settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (groupName: string) => {
    try {
      setSaving(true);
      const groupSettings = settings[groupName] || [];
      
      // Define translatable keys
      const translatableKeys = [
        'hero_title',
        'hero_subtitle',
        'hero_cta_text',
        'hero_cta_button_text',
        'hero_disclaimer',
  'about_title',
  'about_description',
  'about_text_1',
  'about_text_2',
  'about_text_3',
  'testimonial_title',
        'testimonial_subtitle',
        'site_name',
        'site_tagline',
        'footer_copyright',
        'footer_description',
        'footer_address',
        'contact_address',
      ];
      
      const updateData: SettingsUpdateRequest[] = [];
      
      // Process each setting
      groupSettings.forEach(setting => {
        // Skip settings without keys
        if (!setting || !setting.key) {
          return;
        }
        
        if (translatableKeys.includes(setting.key)) {
          // For translatable settings, save all languages
          const multilingualValue = settingsMultilingual[setting.key] || { en: '', es: '', pt: '' };
          updateData.push({
            key: setting.key,
            value: multilingualValue.en, // Default to English
            type: setting.type,
            group: setting.group,
            label: setting.label,
            description: setting.description,
            locale: 'en',
            // Include translations
            translations: multilingualValue,
          } as any);
        } else {
          // For non-translatable settings, save normally
          updateData.push({
            key: setting.key,
            value: setting.value,
            type: setting.type,
            group: setting.group,
            label: setting.label,
            description: setting.description,
          });
        }
      });
      
      // Also handle settings that might be in multilingual state but not in groupSettings yet
      // This is important for newly created settings
      if (groupName === 'general') {
        ['site_name', 'site_tagline'].forEach(key => {
          if (settingsMultilingual[key]) {
            const multilingualValue = settingsMultilingual[key];
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: multilingualValue.en || '',
                type: 'text',
                group: 'general',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
                locale: 'en',
                translations: multilingualValue,
              } as any);
            }
          }
        });
      }
      
      // Handle footer settings
      if (groupName === 'footer') {
        ['footer_copyright', 'footer_description', 'footer_address'].forEach(key => {
          if (settingsMultilingual[key]) {
            const multilingualValue = settingsMultilingual[key];
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: multilingualValue.en || '',
                type: 'text',
                group: 'footer',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
                locale: 'en',
                translations: multilingualValue,
              } as any);
            }
          }
        });
      }

      // Handle about settings (including about_text fields)
      if (groupName === 'about') {
        ['about_title', 'about_description', 'about_text_1', 'about_text_2', 'about_text_3'].forEach(key => {
          if (settingsMultilingual[key]) {
            const multilingualValue = settingsMultilingual[key];
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: multilingualValue.en || '',
                type: 'text',
                group: 'about',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
                locale: 'en',
                translations: multilingualValue,
              } as any);
            }
          }
        });
      }
      
      // Handle testimonial settings
      if (groupName === 'testimonial') {
        ['testimonial_title', 'testimonial_subtitle'].forEach(key => {
          if (settingsMultilingual[key]) {
            const multilingualValue = settingsMultilingual[key];
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: multilingualValue.en || '',
                type: 'text',
                group: 'testimonial',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
                locale: 'en',
                translations: multilingualValue,
              } as any);
            }
          }
        });
        
        // Handle non-translatable footer settings (social media URLs)
        ['footer_social_facebook', 'footer_social_instagram', 'footer_social_twitter'].forEach(key => {
          const setting = groupSettings.find(s => s && s.key === key);
          if (setting) {
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: setting.value || '',
                type: 'text',
                group: 'footer',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
              });
            }
          } else {
            // Check if it's in settings state but not in groupSettings
            const settingFromState = settings.footer?.find(s => s && s.key === key);
            if (settingFromState) {
              const existingSetting = updateData.find(s => s.key === key);
              if (!existingSetting) {
                updateData.push({
                  key: key,
                  value: settingFromState.value || '',
                  type: 'text',
                  group: 'footer',
                  label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  description: '',
                });
              }
            }
          }
        });
      }
      
      // Also handle settings that might be in multilingual state but not in groupSettings yet
      // This is important for newly created settings
      if (groupName === 'general') {
        ['site_name', 'site_tagline'].forEach(key => {
          if (settingsMultilingual[key]) {
            const multilingualValue = settingsMultilingual[key];
            const existingSetting = updateData.find(s => s.key === key);
            if (!existingSetting) {
              updateData.push({
                key: key,
                value: multilingualValue.en || '',
                type: 'text',
                group: 'general',
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: '',
                locale: 'en',
                translations: multilingualValue,
              } as any);
            }
          }
        });
        
        // Handle contact_address (multilingual)
        if (settingsMultilingual.contact_address) {
          const multilingualValue = settingsMultilingual.contact_address;
          const existingSetting = updateData.find(s => s.key === 'contact_address');
          if (!existingSetting) {
            updateData.push({
              key: 'contact_address',
              value: multilingualValue.en || '',
              type: 'text',
              group: 'general',
              label: 'Contact Address',
              description: '',
              locale: 'en',
              translations: multilingualValue,
            } as any);
          }
        }
      }

      const response = await settingsApi.bulkUpdate(updateData, contentLocale);
      if (response.success) {
        toast.success(`${groupName} settings updated successfully for all languages`);
        await fetchSettings(); // Refresh to get updated data
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (groupName: string, settingKey: string, newValue: string) => {
    // Check if this is a translatable setting
    if (TRANSLATABLE_KEYS.includes(settingKey)) {
      // Update multilingual state
      setSettingsMultilingual(prev => ({
        ...prev,
        [settingKey]: {
          ...(prev[settingKey] || { en: '', es: '', pt: '' }),
          [contentLocale]: newValue,
        },
      }));
      
      // Also update the settings state for display
      setSettings(prev => {
        const currentGroup = prev[groupName] || [];
        const existingSetting = currentGroup.find(s => s.key === settingKey);
        
        if (existingSetting) {
          return {
            ...prev,
            [groupName]: currentGroup.map(setting => 
              setting.key === settingKey 
                ? { ...setting, value: newValue }
                : setting
            )
          };
        } else {
          const newSetting: SiteSetting = {
            id: 0,
            key: settingKey,
            value: newValue,
            type: 'text',
            group: groupName,
            label: settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: '',
            is_active: true,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return {
            ...prev,
            [groupName]: [...currentGroup, newSetting]
          };
        }
      });
    } else {
      // For non-translatable settings, update normally
      setSettings(prev => {
        const currentGroup = prev[groupName] || [];
        const existingSetting = currentGroup.find(s => s.key === settingKey);
        
        if (existingSetting) {
          return {
            ...prev,
            [groupName]: currentGroup.map(setting => 
              setting.key === settingKey 
                ? { ...setting, value: newValue }
                : setting
            )
          };
        } else {
          const newSetting: SiteSetting = {
            id: 0,
            key: settingKey,
            value: newValue,
            type: 'text',
            group: groupName,
            label: settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: '',
            is_active: true,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return {
            ...prev,
            [groupName]: [...currentGroup, newSetting]
          };
        }
      });
    }
  };

  const handleHeroBackgroundsChange = (backgrounds: any[]) => {
    setSelectedHeroBackgrounds(backgrounds);
    
    // Update the hero background images setting
    const backgroundImagesValue = JSON.stringify(backgrounds.map(bg => ({
      url: bg.image_path,
      alt: bg.name,
      rotation: 0,
      x: 0,
      y: 0
    })));
    
    updateSetting('hero', 'hero_background_images', backgroundImagesValue);
  };

  // Helper to construct full URL if needed (use backend origin for /storage paths)
  const getImageUrl = (url: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return '';
    
    const trimmedUrl = url.trim();
    
    // If already absolute, add cache buster and return
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      // Basic validation - check if it looks like a valid URL
      if (trimmedUrl.includes('://') && trimmedUrl.length > 7) {
        return trimmedUrl.includes('?') ? `${trimmedUrl}&t=${Date.now()}` : `${trimmedUrl}?t=${Date.now()}`;
      }
      console.warn('Invalid absolute URL format:', trimmedUrl);
      return '';
    }
    
    try {
      const abs = buildAbsoluteUrl(trimmedUrl);
      if (!abs || abs.trim() === '') {
        console.warn('buildAbsoluteUrl returned empty for:', trimmedUrl);
        return '';
      }
      
      // Basic validation - check if it looks like a valid URL
      if (!abs.includes('://') || abs.length <= 7) {
        console.warn('Invalid URL format:', abs, 'from original:', trimmedUrl);
        return '';
      }
      
      // add cache buster to avoid stale previews
      return abs.includes('?') ? `${abs}&t=${Date.now()}` : `${abs}?t=${Date.now()}`;
    } catch (error) {
      console.error('Error in getImageUrl:', error, 'url:', trimmedUrl);
      return '';
    }
  };

  // Upload a single hero image into a fixed slot and persist immediately
  const uploadHeroSlot = async (index: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('name', `Hero ${index + 1}`);
    formData.append('image', file);
    formData.append('is_active', 'true');
    formData.append('sort_order', String(index));

    let response;
    let bg: any;
    
    const existingId = heroBackgroundIds[index];
    
    if (existingId) {
      response = await heroBackgroundApi.update(existingId, formData);
    } else {
      response = await heroBackgroundApi.create(formData);
    }
    
    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }
    
    // Handle response structure
    if (Array.isArray(response.data)) {
      bg = response.data[0];
    } else {
      bg = response.data;
    }
    
    if (!bg || (!bg.image_url && !bg.image_path)) {
      throw new Error('No image URL returned from server');
    }
    
    const rawUrl = bg.image_url || bg.image_path || '';
    const url = getImageUrl(rawUrl);

    // Update UI state
    setFixedHeroImages(prev => {
      const latest = [...prev];
      latest[index] = url;
      
      const heroJson = JSON.stringify(latest.map((u, i) => ({ 
        url: u, 
        alt: `Hero ${i + 1}`, 
        rotation: 0, 
        x: 0, 
        y: 0 
      })));
      settingsApi.bulkUpdate([{ key: 'hero_background_images', value: heroJson, group: 'hero' }]).catch(() => {});
      
      return latest;
    });
    
    // Store ID if new
    if (bg.id && !existingId) {
      setHeroBackgroundIds(prev => ({
        ...prev,
        [index]: bg.id
      }));
    }
    
    toast.success(`Hero background image ${existingId ? 'updated' : 'uploaded'} successfully`);
    return url;
  };

  // Upload About image and persist directly to site_settings (not hero_backgrounds table)
  const uploadAboutImage = async (file: File): Promise<string> => {
    try {
      // Validate file
      if (!file || !(file instanceof File)) {
        throw new Error('Invalid file object');
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP image');
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://72.61.297.64:8000/api';
      const token = localStorage.getItem('auth_token');
      
      console.log('Uploading about image:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Upload image using media endpoint (stores to storage, not hero_backgrounds table)
      const formData = new FormData();
      formData.append('image', file);
      
      let uploadResponse;
      try {
        uploadResponse = await axios.post(`${API_BASE_URL}/media/images`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      } catch (uploadError: any) {
        console.error('Media upload error:', uploadError);
        // Check if it's a URL construction error
        if (uploadError?.message && uploadError.message.includes('Failed to construct') && uploadError.message.includes('URL')) {
          throw new Error('Invalid API configuration. Please check your API URL settings.');
        }
        const errorMsg = uploadError?.response?.data?.message 
          || (uploadError?.response?.data?.errors && Object.values(uploadError.response.data.errors).flat().join(', '))
          || uploadError?.message 
          || 'Failed to upload image';
        throw new Error(errorMsg);
      }
      
      if (!uploadResponse || !uploadResponse.data) {
        throw new Error('No response from server');
      }
      
      if (!uploadResponse.data.success || !uploadResponse.data.data || uploadResponse.data.data.length === 0) {
        throw new Error('Upload failed: Invalid server response');
      }
      
      // Get the uploaded image URL from the response
      const uploadedImage = uploadResponse.data.data[0];
      let rawImageUrl: string = '';
      
      try {
        if (uploadedImage.url) {
          rawImageUrl = String(uploadedImage.url).trim();
        } else if (uploadedImage.path) {
          rawImageUrl = String(uploadedImage.path).trim();
        }
      } catch (e) {
        console.error('Error extracting URL from upload response:', e);
        rawImageUrl = '';
      }
      
      if (!rawImageUrl || rawImageUrl === '') {
        console.error('Upload response:', uploadResponse.data);
        throw new Error('No valid image URL returned from server');
      }
      
      console.log('Raw image URL from server:', rawImageUrl);
      
      // Process the URL safely
      let processedUrl: string = '';
      
      // If rawImageUrl is already absolute, use it directly
      if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
        // Basic validation - must contain :// and be longer than protocol
        if (rawImageUrl.includes('://') && rawImageUrl.length > 7 && !rawImageUrl.includes(' ')) {
          processedUrl = rawImageUrl.includes('?') ? `${rawImageUrl}&t=${Date.now()}` : `${rawImageUrl}?t=${Date.now()}`;
          console.log('Using raw absolute URL:', processedUrl);
        } else {
          console.error('Invalid absolute URL format:', rawImageUrl);
          throw new Error('Server returned invalid absolute URL format');
        }
      } else {
        // Process relative URL - getImageUrl won't throw, just returns empty string on error
        processedUrl = getImageUrl(rawImageUrl);
        console.log('Processed relative URL:', processedUrl);
      }
      
      if (!processedUrl || processedUrl.trim() === '') {
        console.error('Failed to process URL. Raw URL:', rawImageUrl);
        // Last resort: if rawImageUrl exists and looks like it could be a URL, use it as-is
        if (rawImageUrl && rawImageUrl.length > 0 && !rawImageUrl.includes(' ')) {
          // If it starts with /, it's a path - try to make it absolute
          if (rawImageUrl.startsWith('/')) {
            const origin = String(API_BASE_URL).replace(/\/?api\/?$/, '').trim();
            if (origin && origin.length > 0) {
              processedUrl = `${origin}${rawImageUrl}`;
              console.log('Fallback: Constructed URL from path:', processedUrl);
            }
          } else if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
            processedUrl = rawImageUrl;
            console.log('Fallback: Using raw URL without cache buster:', processedUrl);
          }
        }
        
        if (!processedUrl || processedUrl.trim() === '') {
          throw new Error('Failed to process image URL. Server returned: "' + (rawImageUrl || 'empty') + '". Please try uploading again.');
        }
      }
      
      // Delete old image if exists (optional cleanup)
      const currentAboutImage = settings.about?.find(s => s.key === 'about_image')?.value;
      if (currentAboutImage && currentAboutImage !== rawImageUrl) {
        try {
          // Extract path from URL if it's a full URL
          let pathToDelete = currentAboutImage;
          if (pathToDelete.startsWith('http://') || pathToDelete.startsWith('https://')) {
            // Extract path from URL manually without using URL constructor
            const match = pathToDelete.match(/https?:\/\/[^\/]+(\/.*)/);
            if (match && match[1]) {
              pathToDelete = match[1];
            }
            // Remove /storage prefix if present
            if (pathToDelete.startsWith('/storage/')) {
              pathToDelete = pathToDelete.substring('/storage/'.length);
            }
          }
          
          // Call delete endpoint - use POST endpoint for better compatibility
          if (pathToDelete && pathToDelete.length > 0) {
            await axios.post(`${API_BASE_URL}/media/files/delete`, { path: pathToDelete }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              }
            }).catch((deleteError) => {
              // Silently fail if deletion fails (old file might not exist)
              console.warn('Failed to delete old about image:', deleteError);
            });
          }
        } catch (deleteError) {
          // Silently fail if deletion fails (old file might not exist)
          console.warn('Failed to delete old about image:', deleteError);
        }
      }
      
      // Update local state IMMEDIATELY for preview (use processed URL) - do this BEFORE saving
      console.log('Setting currentAboutImage after upload:', processedUrl);
      setCurrentAboutImage(processedUrl);
      
      // Save URL to site_settings table (use rawImageUrl, not processedUrl, so backend can handle it)
      await settingsApi.bulkUpdate([{ key: 'about_image', value: rawImageUrl, group: 'about' }]);
      updateSetting('about', 'about_image', rawImageUrl);
      
      // Don't refresh settings immediately - it might reset the state
      // The state is already updated above, and settings will be refreshed on next page load
      
      toast.success('About image updated successfully');
      
      // Return processed URL for preview - FileUpload will use this
      return processedUrl;
    } catch (error: any) {
      console.error('About image upload failed:', error);
      const errorMsg = error?.response?.data?.message 
        || (error?.response?.data?.errors && Object.values(error.response.data.errors).flat().join(', '))
        || error?.message 
        || 'Failed to upload about image. Please check your connection and try again.';
      toast.error(errorMsg);
      throw error;
    }
  };

  // FAQ Management Functions
  const fetchFaqs = async () => {
    try {
      setFaqLoading(true);
      if (user) {
        // Pass locale directly to API instead of using localStorage
        const response = await faqApi.getAdminFaqs(contentLocale);
        const allFaqs: Faq[] = [];
        Object.values(response.data).forEach(categoryFaqs => {
          allFaqs.push(...categoryFaqs);
        });
        setFaqs(allFaqs.sort((a, b) => a.sort_order - b.sort_order));
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setFaqLoading(false);
    }
  };

  const fetchFaqCategories = async () => {
    try {
      const response = await faqApi.getCategories();
      if (response.success) {
        setFaqCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTestimonials = async () => {
    try {
      setTestimonialLoading(true);
      const response = await feedbackApi.getAll({ type: 'general_feedback' });
      if (response.success) {
        setTestimonials(response.data?.data || response.data || []);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast.error('Failed to fetch testimonials');
    } finally {
      setTestimonialLoading(false);
    }
  };

  const handleToggleTestimonialApproval = async (testimonial: Feedback) => {
    try {
      const newStatus = testimonial.status === 'resolved' ? 'reviewed' : 'resolved';
      await feedbackApi.update(testimonial.id, { status: newStatus });
      toast.success(`Testimonial ${newStatus === 'resolved' ? 'approved' : 'unapproved'} successfully`);
      await fetchTestimonials();
    } catch (error) {
      console.error('Error toggling testimonial approval:', error);
      toast.error('Failed to toggle approval');
    }
  };

  const handleToggleTestimonialFeatured = async (testimonial: Feedback) => {
    try {
      const newPriority = testimonial.priority === 'high' ? 'medium' : 'high';
      await feedbackApi.update(testimonial.id, { priority: newPriority });
      toast.success(`Testimonial ${newPriority === 'high' ? 'featured' : 'unfeatured'} successfully`);
      await fetchTestimonials();
    } catch (error) {
      console.error('Error toggling testimonial featured:', error);
      toast.error('Failed to toggle featured status');
    }
  };

  const handleDeleteTestimonial = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this testimonial?')) {
      try {
        await feedbackApi.delete(id);
        toast.success('Testimonial deleted successfully');
        await fetchTestimonials();
      } catch (error) {
        console.error('Error deleting testimonial:', error);
        toast.error('Failed to delete testimonial');
      }
    }
  };

  const handleToggleHomepageTestimonial = async (testimonialId: number) => {
    try {
      const updatedIds = selectedHomepageTestimonials.includes(testimonialId)
        ? selectedHomepageTestimonials.filter(id => id !== testimonialId)
        : [...selectedHomepageTestimonials, testimonialId];

      setSelectedHomepageTestimonials(updatedIds);

      // Save to settings
      const updateData: SettingsUpdateRequest[] = [{
        key: 'homepage_testimonial_ids',
        value: JSON.stringify(updatedIds),
        group: 'testimonial'
      }];

      await settingsApi.bulkUpdate(updateData);
      toast.success('Homepage testimonials updated');
    } catch (error) {
      console.error('Error updating homepage testimonials:', error);
      toast.error('Failed to update homepage testimonials');
    }
  };

  const fetchVideos = async () => {
    try {
      setVideoLoading(true);
      const response = await videoApi.getAll({ status: 'published', per_page: 1000 });
      if (response.success) {
        const videosData = response.data?.data || response.data || [];
        setVideos(Array.isArray(videosData) ? videosData : []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleToggleHomepageVideo = async (videoId: number) => {
    try {
      const updatedIds = selectedHomepageVideos.includes(videoId)
        ? selectedHomepageVideos.filter(id => id !== videoId)
        : [...selectedHomepageVideos, videoId];

      setSelectedHomepageVideos(updatedIds);

      // Save to settings
      const updateData: SettingsUpdateRequest[] = [{
        key: 'homepage_video_ids',
        value: JSON.stringify(updatedIds),
        group: 'homepage'
      }];

      await settingsApi.bulkUpdate(updateData);
      toast.success('Homepage videos updated');
    } catch (error) {
      console.error('Error updating homepage videos:', error);
      toast.error('Failed to update homepage videos');
    }
  };

  const handleCreateFaq = async () => {
    try {
      if (user) {
        const faqDataWithLocale: FaqCreateRequest = {
          ...faqFormData,
          locale: contentLocale,
        };
        
        await faqApi.createFaq(faqDataWithLocale);
        await fetchFaqs();
        setIsCreateDialogOpen(false);
        resetFaqForm();
        toast.success(`FAQ created successfully in ${contentLocale.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error creating FAQ:', error);
      toast.error('Failed to create FAQ');
    }
  };

  const handleUpdateFaq = async () => {
    try {
      if (user && editingFaq) {
        const updateData: FaqUpdateRequest = {
          question: faqFormData.question,
          answer: faqFormData.answer,
          category: faqFormData.category,
          sort_order: faqFormData.sort_order,
          is_active: faqFormData.is_active,
          locale: contentLocale, // Include locale for translation
        };
        
        await faqApi.updateFaq(editingFaq.id, updateData);
        await fetchFaqs();
        setIsEditDialogOpen(false);
        setEditingFaq(null);
        resetFaqForm();
        toast.success(`FAQ updated successfully in ${contentLocale.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error updating FAQ:', error);
      toast.error('Failed to update FAQ');
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        if (user) {
          await faqApi.deleteFaq(id);
          await fetchFaqs();
        }
      } catch (error) {
        console.error('Error deleting FAQ:', error);
        toast.error('Failed to delete FAQ');
      }
    }
  };

  const handleToggleFaqStatus = async (faq: Faq) => {
    try {
      if (user) {
        const updateData: FaqUpdateRequest = {
          is_active: !faq.is_active
        };
        await faqApi.updateFaq(faq.id, updateData);
        await fetchFaqs();
      }
    } catch (error) {
      console.error('Error toggling FAQ status:', error);
    }
  };

  const resetFaqForm = () => {
    setFaqFormData({
      question: '',
      answer: '',
      category: 'general',
      sort_order: 0,
      is_active: true
    });
  };

  const openEditDialog = (faq: Faq) => {
    setEditingFaq(faq);
    setFaqFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      sort_order: faq.sort_order,
      is_active: faq.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    const categorySlug = newCategory.toLowerCase().replace(/\s+/g, '-');
    
    if (faqCategories.includes(categorySlug)) {
      toast.error('Category already exists');
      return;
    }

    try {
      setFaqCategories([...faqCategories, categorySlug]);
      setNewCategory('');
      toast.success('Category added successfully');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category}"?`)) {
      return;
    }

    try {
      setFaqCategories(faqCategories.filter(cat => cat !== category));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleStartEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditCategoryValue(category);
  };

  const handleSaveEditCategory = (oldCategory: string) => {
    if (!editCategoryValue.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const newCategorySlug = editCategoryValue.toLowerCase().replace(/\s+/g, '-');
    
    if (faqCategories.includes(newCategorySlug) && newCategorySlug !== oldCategory) {
      toast.error('Category already exists');
      return;
    }

    try {
      setFaqCategories(faqCategories.map(cat => cat === oldCategory ? newCategorySlug : cat));
      setEditingCategory(null);
      setEditCategoryValue('');
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const renderSettingField = (setting: SiteSetting, groupName: string) => {
    // Safety check: ensure setting.key exists
    if (!setting || !setting.key) {
      return null;
    }
    
    const labelText = t(`admin.settings_fields.${setting.key}.label`, { defaultValue: setting.label || setting.key });
    const descriptionText = t(`admin.settings_fields.${setting.key}.description`, { defaultValue: setting.description || '' });
    
    // Check if this is a translatable setting
    const isTranslatable = setting.key && TRANSLATABLE_KEYS.includes(setting.key);
    const multilingualValue = isTranslatable 
      ? (settingsMultilingual[setting.key] || { en: setting.value || '', es: '', pt: '' })
      : null;
    
    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={setting.key}
              checked={setting.value === '1' || setting.value === 'true'}
              onChange={(e) => updateSetting(groupName, setting.key, e.target.checked ? '1' : '0')}
              className="rounded border-gray-300"
            />
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {labelText}
            </Label>
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {labelText}
            </Label>
            <Input
              id={setting.key}
              type="number"
              value={setting.value}
              onChange={(e) => updateSetting(groupName, setting.key, e.target.value)}
              className="w-full"
            />
            {(descriptionText || '').length > 0 && (
              <p className="text-xs text-gray-500">{descriptionText}</p>
            )}
          </div>
        );
      
      default: // text
        if (isTranslatable && multilingualValue) {
          // Render multilingual input
          const isTextarea = (setting.key || '').includes('disclaimer') || (setting.key || '').includes('description');
          return (
            <div className="space-y-2">
              <Label htmlFor={setting.key} className="text-sm font-medium">
                {labelText}
              </Label>
              {isTextarea ? (
                <Textarea
                  id={setting.key}
                  value={multilingualValue[contentLocale]}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      [setting.key]: {
                        ...(prev[setting.key] || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting(groupName, setting.key, e.target.value);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder={`Enter ${labelText.toLowerCase()} in ${contentLocale.toUpperCase()}`}
                />
              ) : (
                <Input
                  id={setting.key}
                  value={multilingualValue[contentLocale]}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      [setting.key]: {
                        ...(prev[setting.key] || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting(groupName, setting.key, e.target.value);
                  }}
                  className="w-full"
                  placeholder={`Enter ${labelText.toLowerCase()} in ${contentLocale.toUpperCase()}`}
                />
              )}
              {(descriptionText || '').length > 0 && (
                <p className="text-xs text-gray-500">{descriptionText}</p>
              )}
            </div>
          );
        } else {
          // Render normal input for non-translatable settings
          return (
            <div className="space-y-2">
              <Label htmlFor={setting.key} className="text-sm font-medium">
                {labelText}
              </Label>
              {(setting.key || '').includes('disclaimer') || (setting.key || '').includes('description') ? (
                <Textarea
                  id={setting.key}
                  value={setting.value}
                  onChange={(e) => updateSetting(groupName, setting.key, e.target.value)}
                  className="w-full min-h-[100px]"
                  placeholder={descriptionText || ''}
                />
              ) : (
                <Input
                  id={setting.key}
                  value={setting.value}
                  onChange={(e) => updateSetting(groupName, setting.key, e.target.value)}
                  className="w-full"
                  placeholder={descriptionText || ''}
                />
              )}
              {(descriptionText || '').length > 0 && (
                <p className="text-xs text-gray-500">{descriptionText}</p>
              )}
            </div>
          );
        }
    }
  };

  const renderSettingsGroup = (groupName: string, groupSettings: SiteSetting[]) => {
    // Filter out any settings without keys
    const validSettings = (groupSettings || []).filter(s => s && s.key);
    const hasTranslatableSettings = validSettings.some(s => s.key && TRANSLATABLE_KEYS.includes(s.key));
    
    return (
      <div className="space-y-6">
        {/* Show Language Tabs if group has translatable settings */}
        {hasTranslatableSettings && (
          <LanguageTabs 
            activeLanguage={contentLocale} 
            onLanguageChange={(lang) => setContentLocale(lang)}
            className="mb-4"
          />
        )}
        
        {validSettings.map((setting) => (
          <div key={setting.id || setting.key} className="space-y-2">
            {renderSettingField(setting, groupName)}
          </div>
        ))}
        
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={() => handleSaveSettings(groupName)}
            disabled={saving}
            className="flex items-center"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('admin.common_save')}
          </Button>
        </div>
      </div>
    );
  };

  // Helper function to get hero field value with fallback
  const getHeroFieldValue = (key: string) => {
    return settingsMultilingual[key]?.[contentLocale] || 
           (settings.hero?.find(s => s.key === key) as any)?.translations?.[contentLocale] || 
           settings.hero?.find(s => s.key === key)?.value || 
           '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.settings_page.title')}</h1>
          <p className="text-muted-foreground">{t('admin.settings_page.subtitle_short')}</p>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('admin.common_loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.settings_page.title')}</h1>
          <p className="text-muted-foreground">{t('admin.settings_page.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('admin.common_refresh')}
          </Button>
        </div>
      </div>

      {/* Language Notice
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Editing content for: {contentLocale.toUpperCase()}</strong> - Text content (titles, descriptions, etc.) will be saved in the selected language. Other settings (images, numbers, etc.) are language-independent.
        </p>
      </div> */}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {/* Hero tab retained for general text settings; background images managed via About only */}
          <TabsTrigger value="hero" className="flex items-center">
            <Home className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.hero')}
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.about')}
          </TabsTrigger>
          <TabsTrigger value="testimonial" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.testimonials')}
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center">
            <Play className="mr-2 h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center">
            <HelpCircle className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.faq')}
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center">
            <Globe className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.footer')}
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            {t('admin.settings_page.tabs.contact')}
          </TabsTrigger>
        </TabsList>

        {/* Hero Section Settings (textual/content only). Background images are controlled via About image. */}
        <TabsContent value="hero" className="mt-6">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.hero.title')}</h2>
              <div className="space-y-4">
                {/* Language Tabs */}
                <LanguageTabs 
                  activeLanguage={contentLocale} 
                  onLanguageChange={(lang) => setContentLocale(lang)}
                  className="mb-4"
                />
                
                <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hero_badge">Hero Badge <span className="text-muted-foreground text-xs">(e.g., "Nueva Masterclass Disponible")</span></Label>
                      <Input
                        id="hero_badge"
                        value={settingsMultilingual.hero_badge?.[contentLocale] || (settings.hero?.find(s => s.key === 'hero_badge') as any)?.translations?.[contentLocale] || settings.hero?.find(s => s.key === 'hero_badge')?.value || ''}
                        onChange={(e) => {
                          setSettingsMultilingual(prev => ({
                            ...prev,
                            hero_badge: {
                              ...(prev.hero_badge || { en: '', es: '', pt: '' }),
                              [contentLocale]: e.target.value,
                            },
                          }));
                        }}
                        placeholder={`Enter hero badge text in ${contentLocale.toUpperCase()}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero_title">Hero Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="hero_title"
                        value={getHeroFieldValue('hero_title')}
                        onChange={(e) => {
                          setSettingsMultilingual(prev => ({
                            ...prev,
                            hero_title: {
                              ...(prev.hero_title || { en: '', es: '', pt: '' }),
                              [contentLocale]: e.target.value,
                            },
                          }));
                        }}
                        placeholder={`Enter hero title in ${contentLocale.toUpperCase()} (e.g., "EL ARTE DE")`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                      <Input
                        id="hero_subtitle"
                        value={getHeroFieldValue('hero_subtitle')}
                        onChange={(e) => {
                          setSettingsMultilingual(prev => ({
                            ...prev,
                            hero_subtitle: {
                              ...(prev.hero_subtitle || { en: '', es: '', pt: '' }),
                              [contentLocale]: e.target.value,
                            },
                          }));
                        }}
                        placeholder={`Enter hero subtitle in ${contentLocale.toUpperCase()} (e.g., "LO DIVINO")`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero_description">Hero Description</Label>
                      <Textarea
                        id="hero_description"
                        value={getHeroFieldValue('hero_description')}
                        onChange={(e) => {
                          setSettingsMultilingual(prev => ({
                            ...prev,
                            hero_description: {
                              ...(prev.hero_description || { en: '', es: '', pt: '' }),
                              [contentLocale]: e.target.value,
                            },
                          }));
                        }}
                        placeholder={`Enter hero description in ${contentLocale.toUpperCase()}`}
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    {/* Statistics Section */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-lg font-semibold mb-4">Hero Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_1_value">Stat 1 Value</Label>
                          <Input
                            id="hero_stat_1_value"
                            value={getHeroFieldValue('hero_stat_1_value')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_1_value: {
                                  ...(prev.hero_stat_1_value || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 1 value (e.g., "500+")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_1_label">Stat 1 Label</Label>
                          <Input
                            id="hero_stat_1_label"
                            value={getHeroFieldValue('hero_stat_1_label')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_1_label: {
                                  ...(prev.hero_stat_1_label || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 1 label (e.g., "Horas de contenido")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_2_value">Stat 2 Value</Label>
                          <Input
                            id="hero_stat_2_value"
                            value={getHeroFieldValue('hero_stat_2_value')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_2_value: {
                                  ...(prev.hero_stat_2_value || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 2 value (e.g., "4K")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_2_label">Stat 2 Label</Label>
                          <Input
                            id="hero_stat_2_label"
                            value={getHeroFieldValue('hero_stat_2_label')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_2_label: {
                                  ...(prev.hero_stat_2_label || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 2 label (e.g., "Ultra Alta Definición")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_3_value">Stat 3 Value</Label>
                          <Input
                            id="hero_stat_3_value"
                            value={getHeroFieldValue('hero_stat_3_value')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_3_value: {
                                  ...(prev.hero_stat_3_value || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 3 value (e.g., "Escultora Ana Rey")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_3_label">Stat 3 Label</Label>
                          <Input
                            id="hero_stat_3_label"
                            value={getHeroFieldValue('hero_stat_3_label')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_3_label: {
                                  ...(prev.hero_stat_3_label || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 3 label (e.g., "Artista Principal")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_4_value">Stat 4 Value</Label>
                          <Input
                            id="hero_stat_4_value"
                            value={getHeroFieldValue('hero_stat_4_value')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_4_value: {
                                  ...(prev.hero_stat_4_value || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 4 value (e.g., "400k+")`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero_stat_4_label">Stat 4 Label</Label>
                          <Input
                            id="hero_stat_4_label"
                            value={getHeroFieldValue('hero_stat_4_label')}
                            onChange={(e) => {
                              setSettingsMultilingual(prev => ({
                                ...prev,
                                hero_stat_4_label: {
                                  ...(prev.hero_stat_4_label || { en: '', es: '', pt: '' }),
                                  [contentLocale]: e.target.value,
                                },
                              }));
                            }}
                            placeholder={`Enter stat 4 label (e.g., "Seguidores en redes")`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={async () => {
                          try {
                            setSaving(true);
                            // Save all multilingual settings
                            const updateData: any[] = [];
                            
                            // Add all multilingual hero settings - preserve all language data
                            TRANSLATABLE_KEYS.filter(key => key.startsWith('hero_')).forEach(key => {
                              // Get current multilingual value from state, or from existing settings
                              const currentMultilingual = settingsMultilingual[key] || { en: '', es: '', pt: '' };
                              const existingSetting = settings.hero?.find(s => s.key === key) as any;
                              
                              // Merge with existing translations to preserve all languages
                              const mergedTranslations = {
                                en: currentMultilingual.en || existingSetting?.translations?.en || existingSetting?.value || '',
                                es: currentMultilingual.es || existingSetting?.translations?.es || '',
                                pt: currentMultilingual.pt || existingSetting?.translations?.pt || '',
                              };
                              
                              // Only add if there's at least one value
                              if (mergedTranslations.en || mergedTranslations.es || mergedTranslations.pt) {
                                updateData.push({
                                  key: key,
                                  value: mergedTranslations.en || mergedTranslations.es || mergedTranslations.pt || '',
                                  type: 'text',
                                  group: 'hero',
                                  label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                  description: '',
                                  locale: 'en',
                                  translations: mergedTranslations,
                                });
                              }
                            });
                            
                            if (updateData.length > 0) {
                              const response = await settingsApi.bulkUpdate(updateData, contentLocale);
                              if (response.success) {
                                toast.success('Hero settings updated successfully');
                                // Refresh settings to load saved data
                                await fetchSettings();
                                // Also refresh hero background images
                                const fetchHeroBackgrounds = async () => {
                                  try {
                                    const bgResponse = await heroBackgroundApi.getAll();
                                    if (bgResponse.success && Array.isArray(bgResponse.data)) {
                                      const getImageUrl = (url: string) => {
                                        const abs = buildAbsoluteUrl(url);
                                        if (!abs) return '';
                                        return abs.includes('?') ? `${abs}&t=${Date.now()}` : `${abs}?t=${Date.now()}`;
                                      };
                                      const urls: string[] = Array.from({ length: HERO_SLOTS }, () => '');
                                      const ids: Record<number, number> = {};
                                      bgResponse.data.forEach((bg) => {
                                        const sortOrder = bg.sort_order ?? 0;
                                        if (sortOrder >= 0 && sortOrder < HERO_SLOTS) {
                                          const url = bg.image_url || bg.image_path;
                                          urls[sortOrder] = url ? getImageUrl(url) : '';
                                          ids[sortOrder] = bg.id;
                                        }
                                      });
                                      setFixedHeroImages(urls);
                                      setHeroBackgroundIds(ids);
                                    }
                                  } catch (error) {
                                    console.error('Error refreshing hero backgrounds:', error);
                                  }
                                };
                                await fetchHeroBackgrounds();
                              } else {
                                toast.error('Failed to save hero settings');
                              }
                            } else {
                              toast.warning('No hero settings to save');
                            }
                          } catch (error: any) {
                            console.error('Error saving hero settings:', error);
                            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="flex items-center"
                      >
                        {saving ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {t('admin.common_save')}
                      </Button>
                    </div>
                  </div>
              </div>
            </Card>

            {/* Background Images Control (like initial) */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('admin.settings_page.hero.background_images')}</h3>
                <Badge variant="secondary">{HERO_SLOTS} {t('admin.settings_page.slots')}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {fixedHeroImages.map((url, idx) => (
                  <div key={idx} className="space-y-2">
                    <FileUpload
                      type="image"
                      label={`Slot ${idx + 1}`}
                      onFileSelect={() => {}}
                      onFileUpload={async (file) => {
                        // uploadHeroSlot returns the URL, so we can return it directly
                        return await uploadHeroSlot(idx, file);
                      }}
                      currentFile={url}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{t('admin.settings_page.hero.background_help')}</p>
            </Card>
          </div>
        </TabsContent>

        {/* About Section Settings */}
        <TabsContent value="about" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.about.title')}</h2>
            {/* About Image Uploader */}
            <div className="mb-6">
              <FileUpload
                type="image"
                label={t('admin.settings_page.about.image')}
                onFileSelect={() => {}}
                onFileUpload={uploadAboutImage}
                currentFile={currentAboutImage || settings.about?.find(s => s.key === 'about_image')?.value || ''}
              />
            </div>
            {settings.about && settings.about.length > 0 ? (
              renderSettingsGroup('about', settings.about.filter(s => s && s.key && s.key !== 'about_image'))
            ) : (
              <div className="space-y-4">
                {/* <p className="text-muted-foreground mb-4">{t('admin.settings_page.about.no_settings') || 'No about settings found. Create them below:'}</p> */}
                
                {/* Language Tabs */}
                <LanguageTabs 
                  activeLanguage={contentLocale} 
                  onLanguageChange={(lang) => setContentLocale(lang)}
                  className="mb-4"
                />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="about_title">About Title</Label>
                    <Input
                      id="about_title"
                      value={settingsMultilingual.about_title?.[contentLocale] || settings.about?.find(s => s.key === 'about_title')?.value || ''}
                      onChange={(e) => {
                        setSettingsMultilingual(prev => ({
                          ...prev,
                          about_title: {
                            ...(prev.about_title || { en: '', es: '', pt: '' }),
                            [contentLocale]: e.target.value,
                          },
                        }));
                        // Don't call updateSetting here - only update on save
                      }}
                      placeholder={`Enter about title in ${contentLocale.toUpperCase()}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_description">About Description</Label>
                    <Textarea
                      id="about_description"
                      value={settingsMultilingual.about_description?.[contentLocale] || settings.about?.find(s => s.key === 'about_description')?.value || ''}
                      onChange={(e) => {
                        setSettingsMultilingual(prev => ({
                          ...prev,
                          about_description: {
                            ...(prev.about_description || { en: '', es: '', pt: '' }),
                            [contentLocale]: e.target.value,
                          },
                        }));
                        // Don't call updateSetting here - only update on save
                      }}
                      placeholder={`Enter about description in ${contentLocale.toUpperCase()}`}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_text_1">About Text 1</Label>
                    <Textarea
                      id="about_text_1"
                      value={settingsMultilingual.about_text_1?.[contentLocale] || settings.about?.find(s => s.key === 'about_text_1')?.value || ''}
                      onChange={(e) => {
                        setSettingsMultilingual(prev => ({
                          ...prev,
                          about_text_1: {
                            ...(prev.about_text_1 || { en: '', es: '', pt: '' }),
                            [contentLocale]: e.target.value,
                          },
                        }));
                      }}
                      placeholder={`Enter about text 1 in ${contentLocale.toUpperCase()}`}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_text_2">About Text 2</Label>
                    <Textarea
                      id="about_text_2"
                      value={settingsMultilingual.about_text_2?.[contentLocale] || settings.about?.find(s => s.key === 'about_text_2')?.value || ''}
                      onChange={(e) => {
                        setSettingsMultilingual(prev => ({
                          ...prev,
                          about_text_2: {
                            ...(prev.about_text_2 || { en: '', es: '', pt: '' }),
                            [contentLocale]: e.target.value,
                          },
                        }));
                      }}
                      placeholder={`Enter about text 2 in ${contentLocale.toUpperCase()}`}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_text_3">About Text 3</Label>
                    <Textarea
                      id="about_text_3"
                      value={settingsMultilingual.about_text_3?.[contentLocale] || settings.about?.find(s => s.key === 'about_text_3')?.value || ''}
                      onChange={(e) => {
                        setSettingsMultilingual(prev => ({
                          ...prev,
                          about_text_3: {
                            ...(prev.about_text_3 || { en: '', es: '', pt: '' }),
                            [contentLocale]: e.target.value,
                          },
                        }));
                      }}
                      placeholder={`Enter about text 3 in ${contentLocale.toUpperCase()}`}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={() => handleSaveSettings('about')}
                      disabled={saving}
                      className="flex items-center"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {t('admin.common_save')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Testimonial Section Settings */}
        <TabsContent value="testimonial" className="mt-6 space-y-6">
          {/* Testimonial Section Text Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.testimonials.section_settings') || 'Testimonial Section Settings'}</h2>
            {settings.testimonial ? renderSettingsGroup('testimonial', settings.testimonial.filter(setting => 
              setting.key === 'testimonial_title' || setting.key === 'testimonial_subtitle'
            )) : (
              <div className="space-y-4">
                {/* Language Tabs */}
                <LanguageTabs 
                  activeLanguage={contentLocale} 
                  onLanguageChange={(lang) => setContentLocale(lang)}
                  className="mb-4"
                />
                
                <div className="space-y-2">
                  <Label htmlFor="testimonial_title" className="text-sm font-medium">
                    {t('admin.settings_page.testimonials.title') || 'Testimonial Title'}
                  </Label>
                  <Input
                    id="testimonial_title"
                    value={settingsMultilingual.testimonial_title?.[contentLocale] || settings.testimonial?.find(s => s.key === 'testimonial_title')?.value || ''}
                    onChange={(e) => {
                      setSettingsMultilingual(prev => ({
                        ...prev,
                        testimonial_title: {
                          ...(prev.testimonial_title || { en: '', es: '', pt: '' }),
                          [contentLocale]: e.target.value,
                        },
                      }));
                      // Don't call updateSetting here - only update on save
                    }}
                    className="w-full"
                    placeholder={`Enter testimonial title in ${contentLocale.toUpperCase()}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testimonial_subtitle" className="text-sm font-medium">
                    {t('admin.settings_page.testimonials.subtitle') || 'Testimonial Subtitle'}
                  </Label>
                  <Input
                    id="testimonial_subtitle"
                    value={settingsMultilingual.testimonial_subtitle?.[contentLocale] || settings.testimonial?.find(s => s.key === 'testimonial_subtitle')?.value || ''}
                    onChange={(e) => {
                      setSettingsMultilingual(prev => ({
                        ...prev,
                        testimonial_subtitle: {
                          ...(prev.testimonial_subtitle || { en: '', es: '', pt: '' }),
                          [contentLocale]: e.target.value,
                        },
                      }));
                      // Don't call updateSetting here - only update on save
                    }}
                    className="w-full"
                    placeholder={`Enter testimonial subtitle in ${contentLocale.toUpperCase()}`}
                  />
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={() => handleSaveSettings('testimonial')}
                    disabled={saving}
                    className="flex items-center"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {t('admin.common_save')}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* All Reviews/Testimonials from Database */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t('admin.settings_page.testimonials.all_reviews')}</h2>
                <p className="text-muted-foreground">{t('admin.settings_page.testimonials.list_description')}</p>
              </div>
            </div>

            {/* Selected Testimonials Info */}
            {selectedHomepageTestimonials.length > 0 && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {t('admin.settings_page.testimonials.reviews_selected', { count: selectedHomepageTestimonials.length })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('admin.settings_page.testimonials.selection_help')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSelectedHomepageTestimonials([]);
                      // Save empty array to settings
                      try {
                        const updateData: SettingsUpdateRequest[] = [{
                          key: 'homepage_testimonial_ids',
                          value: JSON.stringify([]),
                          group: 'testimonial'
                        }];
                        await settingsApi.bulkUpdate(updateData);
                        toast.success(t('admin.settings_page.testimonials.cleared'));
                      } catch (error) {
                        console.error('Error clearing homepage reviews:', error);
                        toast.error(t('admin.settings_page.testimonials.clear_failed'));
                      }
                    }}
                  >
                    {t('admin.settings_page.testimonials.clear_all')}
                  </Button>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <Input
                placeholder={t('admin.settings_page.testimonials.search_placeholder')}
                value={testimonialSearch}
                onChange={(e) => setTestimonialSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={testimonialFilter} onValueChange={(value) => setTestimonialFilter(value as 'all' | 'approved' | 'pending')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('admin.common_filter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.settings_page.testimonials.filter_all')}</SelectItem>
                  <SelectItem value="approved">{t('admin.settings_page.testimonials.filter_approved')}</SelectItem>
                  <SelectItem value="pending">{t('admin.settings_page.testimonials.filter_pending')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Testimonials List */}
            {testimonialLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('admin.settings_page.testimonials.loading')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials
                  .filter(t => {
                    if (testimonialSearch) {
                      const search = testimonialSearch.toLowerCase();
                      return (t.user?.name || '').toLowerCase().includes(search) || 
                             t.description.toLowerCase().includes(search) ||
                             (t.user?.email || '').toLowerCase().includes(search);
                    }
                    if (testimonialFilter === 'approved') return t.status === 'resolved';
                    if (testimonialFilter === 'pending') return t.status !== 'resolved';
                    return true;
                  })
                  .map((testimonial) => (
                    <div 
                      key={testimonial.id} 
                      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                        selectedHomepageTestimonials.includes(testimonial.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => testimonial.status === 'resolved' && handleToggleHomepageTestimonial(testimonial.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{testimonial.user?.name || t('general.anonymous')}</h4>
                            {selectedHomepageTestimonials.includes(testimonial.id) && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{t('admin.settings_page.testimonials.show_on_home')}</Badge>
                            )}
                            {testimonial.status !== 'resolved' && (
                              <Badge variant="secondary">{t('admin.settings_page.testimonials.pending')}</Badge>
                            )}
                            {testimonial.priority === 'high' && (
                              <Badge variant="default">{t('admin.settings_page.testimonials.featured')}</Badge>
                            )}
                          </div>
                          {testimonial.user?.email && (
                            <p className="text-sm text-muted-foreground">
                              {testimonial.user.email}
                            </p>
                          )}
                          <p className="text-sm mt-2">{testimonial.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Rating: {testimonial.rating || 'N/A'}/5</span>
                            <span>Status: {testimonial.status}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleTestimonialApproval(testimonial)}
                          >
                            {testimonial.status === 'resolved' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant={testimonial.priority === 'high' ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleTestimonialFeatured(testimonial)}
                          >
                            Star
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTestimonial(testimonial.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                {testimonials.filter(t => {
                  if (testimonialSearch) {
                    const search = testimonialSearch.toLowerCase();
                    return (t.user?.name || '').toLowerCase().includes(search) || 
                           t.description.toLowerCase().includes(search) ||
                           (t.user?.email || '').toLowerCase().includes(search);
                  }
                  if (testimonialFilter === 'approved') return t.status === 'resolved';
                  if (testimonialFilter === 'pending') return t.status !== 'resolved';
                  return true;
                }).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('admin.settings_page.testimonials.no_reviews')}
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Video Carousel Section Settings */}
        <TabsContent value="videos" className="mt-6 space-y-6">
          {/* All Videos from Database */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Homepage Video Carousel</h2>
                <p className="text-muted-foreground">Select which videos to display in the homepage carousel</p>
              </div>
            </div>

            {/* Selected Videos Info */}
            {selectedHomepageVideos.length > 0 && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {selectedHomepageVideos.length} video{selectedHomepageVideos.length !== 1 ? 's' : ''} selected for homepage
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click on videos below to add or remove them from the homepage carousel
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSelectedHomepageVideos([]);
                      // Save empty array to settings
                      try {
                        const updateData: SettingsUpdateRequest[] = [{
                          key: 'homepage_video_ids',
                          value: JSON.stringify([]),
                          group: 'homepage'
                        }];
                        await settingsApi.bulkUpdate(updateData);
                        toast.success('Homepage videos cleared');
                      } catch (error) {
                        console.error('Error clearing homepage videos:', error);
                        toast.error('Failed to clear homepage videos');
                      }
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="Search videos..."
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={videoFilter} onValueChange={(value) => setVideoFilter(value as 'all' | 'published' | 'draft')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Videos</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Videos List */}
            {videoLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading videos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {videos
                  .filter(v => {
                    if (videoSearch) {
                      const search = videoSearch.toLowerCase();
                      return (v.title || '').toLowerCase().includes(search) || 
                             (v.description || '').toLowerCase().includes(search);
                    }
                    if (videoFilter === 'published') return v.status === 'published';
                    if (videoFilter === 'draft') return v.status === 'draft';
                    return true;
                  })
                  .map((video) => (
                    <div 
                      key={video.id} 
                      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                        selectedHomepageVideos.includes(video.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleHomepageVideo(video.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{video.title || 'Untitled Video'}</h4>
                            {selectedHomepageVideos.includes(video.id) && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Show on Homepage</Badge>
                            )}
                            {video.status !== 'published' && (
                              <Badge variant="secondary">{video.status}</Badge>
                            )}
                            {video.visibility && (
                              <Badge variant="default">{video.visibility}</Badge>
                            )}
                          </div>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {video.category && (
                              <span>Category: {typeof video.category === 'object' && video.category ? video.category.name : String(video.category)}</span>
                            )}
                            {video.duration && (
                              <span>Duration: {Math.floor(video.duration / 60)}m</span>
                            )}
                            {video.views !== undefined && (
                              <span>Views: {video.views}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {videos.filter(v => {
                  if (videoSearch) {
                    const search = videoSearch.toLowerCase();
                    return (v.title || '').toLowerCase().includes(search) || 
                           (v.description || '').toLowerCase().includes(search);
                  }
                  if (videoFilter === 'published') return v.status === 'published';
                  if (videoFilter === 'draft') return v.status === 'draft';
                  return true;
                }).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No videos found
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* FAQ Management */}
        <TabsContent value="faq" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t('admin.faq_management')}</h2>
              <p className="text-muted-foreground">{t('admin.faq_manage_questions')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.settings_page.faq.editing_in_locale', { locale: contentLocale.toUpperCase() })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* FAQ List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t('admin.faq_tab_faqs')}</h3>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetFaqForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('admin.faq_create_new')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('admin.faq_create_new')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="question">{t('admin.faq_placeholder_question')}</Label>
                        <Input
                          id="question"
                          value={faqFormData.question}
                          onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                          placeholder={t('admin.faq_placeholder_question')}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="answer">{t('admin.faq_placeholder_answer')}</Label>
                        <Textarea
                          id="answer"
                          value={faqFormData.answer}
                          onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                          placeholder={t('admin.faq_placeholder_answer')}
                          rows={4}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category">{t('support.category')}</Label>
                        <Select value={faqFormData.category} onValueChange={(value) => setFaqFormData({ ...faqFormData, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.faq_placeholder_category')} />
                          </SelectTrigger>
                          <SelectContent>
                            {faqCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sort_order">{t('admin.faq_label_sort_order')}</Label>
                        <Input
                          id="sort_order"
                          type="number"
                          value={faqFormData.sort_order}
                          onChange={(e) => setFaqFormData({ ...faqFormData, sort_order: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={handleCreateFaq}>
                          {t('admin.faq_create')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {faqLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {faqs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('admin.faq_no_available')}</p>
                  ) : (
                    faqs.map((faq) => (
                      <Card key={faq.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{faq.question}</h4>
                            <Badge variant={faq.is_active ? "default" : "secondary"}>
                                {faq.is_active ? t('admin.users_active') : t('admin.coupons_inactive')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{faq.answer}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{t('support.category')}: {faq.category}</span>
                              <span>{t('admin.faq_label_sort_order')}: {faq.sort_order}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleFaqStatus(faq)}
                            >
                              {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(faq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFaq(faq.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Category Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('admin.faq_tab_categories')}</h3>
              <Card className="p-6">
                <div className="space-y-6">
                  {/* Add New Category */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('admin.faq_placeholder_new_category')}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin.faq_add_category')}
                    </Button>
                  </div>

                  {/* Categories List */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {t('admin.faq_existing_categories')}
                    </h4>
                    <div className="space-y-2">
                      {faqCategories.map((category) => (
                        <div
                          key={category}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          {editingCategory === category ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editCategoryValue}
                                onChange={(e) => setEditCategoryValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveEditCategory(category)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveEditCategory(category)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditCategory}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium capitalize">{category}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEditCategory(category)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteCategory(category)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {faqCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('admin.faq_no_categories')}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit FAQ</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-question">{t('admin.faq_placeholder_question')}</Label>
                  <Input
                    id="edit-question"
                    value={faqFormData.question}
                    onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                    placeholder={t('admin.faq_placeholder_question')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-answer">{t('admin.faq_placeholder_answer')}</Label>
                  <Textarea
                    id="edit-answer"
                    value={faqFormData.answer}
                    onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                    placeholder={t('admin.faq_placeholder_answer')}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">{t('support.category')}</Label>
                  <Select value={faqFormData.category} onValueChange={(value) => setFaqFormData({ ...faqFormData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {faqCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sort_order">{t('admin.faq_label_sort_order')}</Label>
                  <Input
                    id="edit-sort_order"
                    type="number"
                    value={faqFormData.sort_order}
                    onChange={(e) => setFaqFormData({ ...faqFormData, sort_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is_active"
                    checked={faqFormData.is_active}
                    onChange={(e) => setFaqFormData({ ...faqFormData, is_active: e.target.checked })}
                  />
                  <Label htmlFor="edit-is_active">{t('admin.users_active')}</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleUpdateFaq}>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common.update')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.general.title')}</h2>
            
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            {/* Always show form fields for common settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={settingsMultilingual.site_name?.[contentLocale] || settings.general?.find(s => s && s.key === 'site_name')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      site_name: {
                        ...(prev.site_name || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('general', 'site_name', e.target.value);
                  }}
                  placeholder={`Enter site name in ${contentLocale.toUpperCase()}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_tagline">Site Tagline</Label>
                <Input
                  id="site_tagline"
                  value={settingsMultilingual.site_tagline?.[contentLocale] || settings.general?.find(s => s && s.key === 'site_tagline')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      site_tagline: {
                        ...(prev.site_tagline || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('general', 'site_tagline', e.target.value);
                  }}
                  placeholder={`Enter site tagline in ${contentLocale.toUpperCase()}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.general?.find(s => s && s.key === 'contact_email')?.value || ''}
                  onChange={(e) => updateSetting('general', 'contact_email', e.target.value)}
                  placeholder="support@sacrart.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={settings.general?.find(s => s && s.key === 'contact_phone')?.value || ''}
                  onChange={(e) => updateSetting('general', 'contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            
            {/* Save button */}
            <div className="flex justify-end pt-4 border-t mt-6">
              <Button 
                onClick={() => handleSaveSettings('general')}
                disabled={saving}
                className="flex items-center"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('admin.common_save')}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Footer Settings */}
        <TabsContent value="footer" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.footer.title')}</h2>
            
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            {/* Always show form fields for footer settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer_copyright">Footer Copyright</Label>
                <Input
                  id="footer_copyright"
                  value={settingsMultilingual.footer_copyright?.[contentLocale] || settings.footer?.find(s => s && s.key === 'footer_copyright')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      footer_copyright: {
                        ...(prev.footer_copyright || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('footer', 'footer_copyright', e.target.value);
                  }}
                  placeholder={`Enter footer copyright text in ${contentLocale.toUpperCase()}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_description">Footer Description</Label>
                <Textarea
                  id="footer_description"
                  value={settingsMultilingual.footer_description?.[contentLocale] || settings.footer?.find(s => s && s.key === 'footer_description')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      footer_description: {
                        ...(prev.footer_description || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('footer', 'footer_description', e.target.value);
                  }}
                  placeholder={`Enter footer description in ${contentLocale.toUpperCase()}`}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_address">Footer Address</Label>
                <Textarea
                  id="footer_address"
                  value={settingsMultilingual.footer_address?.[contentLocale] || settings.footer?.find(s => s && s.key === 'footer_address')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      footer_address: {
                        ...(prev.footer_address || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('footer', 'footer_address', e.target.value);
                  }}
                  placeholder={`Enter footer address in ${contentLocale.toUpperCase()}`}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_social_facebook">Facebook Address (URL)</Label>
                <Input
                  id="footer_social_facebook"
                  type="url"
                  value={settings.footer?.find(s => s && s.key === 'footer_social_facebook')?.value || ''}
                  onChange={(e) => updateSetting('footer', 'footer_social_facebook', e.target.value)}
                  placeholder="https://www.facebook.com/yourpage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_social_instagram">Instagram Address (URL)</Label>
                <Input
                  id="footer_social_instagram"
                  type="url"
                  value={settings.footer?.find(s => s && s.key === 'footer_social_instagram')?.value || ''}
                  onChange={(e) => updateSetting('footer', 'footer_social_instagram', e.target.value)}
                  placeholder="https://www.instagram.com/yourpage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_social_twitter">Twitter Address (URL)</Label>
                <Input
                  id="footer_social_twitter"
                  type="url"
                  value={settings.footer?.find(s => s && s.key === 'footer_social_twitter')?.value || ''}
                  onChange={(e) => updateSetting('footer', 'footer_social_twitter', e.target.value)}
                  placeholder="https://www.twitter.com/yourpage"
                />
              </div>
            </div>
            
            {/* Save button */}
            <div className="flex justify-end pt-4 border-t mt-6">
              <Button 
                onClick={() => handleSaveSettings('footer')}
                disabled={saving}
                className="flex items-center"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('admin.common_save')}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('admin.settings_page.contact.title')}</h2>
            
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            {/* Always show form fields for contact settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.general?.find(s => s && s.key === 'contact_email')?.value || ''}
                  onChange={(e) => updateSetting('general', 'contact_email', e.target.value)}
                  placeholder="support@sacrart.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={settings.general?.find(s => s && s.key === 'contact_phone')?.value || ''}
                  onChange={(e) => updateSetting('general', 'contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_address">Contact Address</Label>
                <Textarea
                  id="contact_address"
                  value={settingsMultilingual.contact_address?.[contentLocale] || settings.general?.find(s => s && s.key === 'contact_address')?.value || ''}
                  onChange={(e) => {
                    setSettingsMultilingual(prev => ({
                      ...prev,
                      contact_address: {
                        ...(prev.contact_address || { en: '', es: '', pt: '' }),
                        [contentLocale]: e.target.value,
                      },
                    }));
                    updateSetting('general', 'contact_address', e.target.value);
                  }}
                  placeholder={`Enter contact address in ${contentLocale.toUpperCase()}`}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            
            {/* Save button */}
            <div className="flex justify-end pt-4 border-t mt-6">
              <Button 
                onClick={() => handleSaveSettings('general')}
                disabled={saving}
                className="flex items-center"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('admin.common_save')}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;