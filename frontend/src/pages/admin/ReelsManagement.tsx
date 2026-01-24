import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Video as VideoIcon,
  Folder,
  Subtitles,
  Loader2,
  Link,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { reelApi, reelCategoryApi, Reel, ReelCategory } from '@/services/videoApi';
import LanguageTabs from '@/components/admin/LanguageTabs';
import TranslateButton from '@/components/admin/TranslateButton';

interface MultilingualData {
  en: string;
  es: string;
  pt: string;
}

const ReelsManagement = () => {
  const { t, i18n } = useTranslation();
  const { locale: urlLocale } = useLocale();
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(urlLocale as 'en' | 'es' | 'pt' || 'en');
  // Get current site language for displaying table items - use useMemo to make it reactive
  const displayLocale = useMemo(() => {
    const lang = i18n.language || urlLocale || 'en';
    return lang.substring(0, 2) as 'en' | 'es' | 'pt';
  }, [i18n.language, urlLocale]);
  const [activeTab, setActiveTab] = useState<'reels' | 'categories'>('reels');
  
  const [reels, setReels] = useState<Reel[]>([]);
  const [filteredReels, setFilteredReels] = useState<Reel[]>([]);
  const [categories, setCategories] = useState<ReelCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ReelCategory[]>([]);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ReelCategory | null>(null);
  const [isReelDialogOpen, setIsReelDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingTranscription, setProcessingTranscription] = useState<Record<number, boolean>>({});
  const [captionUrls, setCaptionUrls] = useState<Record<number, any>>({});
  const [loadingCaptions, setLoadingCaptions] = useState<Record<number, boolean>>({});

  // Multilingual state for reels
  const [reelMultilingual, setReelMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
    short_description: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    short_description: { en: '', es: '', pt: '' },
  });

  // Multilingual state for categories
  const [categoryMultilingual, setCategoryMultilingual] = useState<{
    name: MultilingualData;
    description: MultilingualData;
  }>({
    name: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
  });

  // Helper function to get translated value from translations object or multilingual columns
  const getTranslatedValue = (item: any, field: string, locale?: 'en' | 'es' | 'pt'): string => {
    // Use the current site language for display (not contentLocale which is only for modals)
    const currentLocale = locale || displayLocale;
    
    // First try to get from translations object
    const translations = (item as any)?.translations || {};
    const fieldTranslations = translations[field] || {};
    if (fieldTranslations[currentLocale]) {
      return fieldTranslations[currentLocale];
    }
    if (fieldTranslations['en']) {
      return fieldTranslations['en'];
    }
    
    // If translations object doesn't have the field, try multilingual columns directly
    const columnName = `${field}_${currentLocale}`;
    if (item[columnName]) {
      return item[columnName];
    }
    const columnNameEn = `${field}_en`;
    if (item[columnNameEn]) {
      return item[columnNameEn];
    }
    
    // Fallback to the main field value
    return item[field] || '';
  };

  // Helper functions for specific fields (use displayLocale for table display)
  const getReelTitle = (reel: Reel): string => {
    return getTranslatedValue(reel, 'title', displayLocale);
  };

  const getCategoryName = (category: ReelCategory): string => {
    return getTranslatedValue(category, 'name', displayLocale);
  };

  useEffect(() => {
    fetchReels();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      if (activeTab === 'reels') {
        const filtered = reels.filter(reel => {
          const title = getReelTitle(reel);
          const categoryName = reel.category ? getCategoryName(reel.category) : '';
          return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (reel.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            categoryName.toLowerCase().includes(searchTerm.toLowerCase());
        });
        setFilteredReels(filtered);
      } else {
        const filtered = categories.filter(cat => {
          const name = getCategoryName(cat);
          const description = getTranslatedValue(cat, 'description', displayLocale);
          return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase());
        });
        setFilteredCategories(filtered);
      }
    } else {
      setFilteredReels(reels);
      setFilteredCategories(categories);
    }
  }, [searchTerm, reels, categories, activeTab, displayLocale]);

  const fetchReels = async () => {
    try {
      const response = await reelApi.getAll({ per_page: 1000 });
      if (response.success) {
        const reelsData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        
        // Load translations for each reel
        const reelsWithTranslations = reelsData.map((reel: any) => {
          if (!reel.translations && (reel.title_en || reel.title_es || reel.title_pt)) {
            reel.translations = {
              title: {
                en: reel.title_en || reel.title || '',
                es: reel.title_es || '',
                pt: reel.title_pt || '',
              },
              description: {
                en: reel.description_en || reel.description || '',
                es: reel.description_es || '',
                pt: reel.description_pt || '',
              },
              short_description: {
                en: reel.short_description_en || reel.short_description || '',
                es: reel.short_description_es || '',
                pt: reel.short_description_pt || '',
              },
            };
          }
          return reel;
        });
        
        setReels(reelsWithTranslations);
        setFilteredReels(reelsWithTranslations);
      }
    } catch (error: any) {
      console.error('Error fetching reels:', error);
      toast.error(error.message || 'Failed to load reels');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await reelCategoryApi.getAll({ per_page: 1000 });
      if (response.success) {
        const categoriesData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        
        // Load translations for each category
        const categoriesWithTranslations = categoriesData.map((cat: any) => {
          if (!cat.translations && (cat.name_en || cat.name_es || cat.name_pt)) {
            cat.translations = {
              name: {
                en: cat.name_en || cat.name || '',
                es: cat.name_es || '',
                pt: cat.name_pt || '',
              },
              description: {
                en: cat.description_en || cat.description || '',
                es: cat.description_es || '',
                pt: cat.description_pt || '',
              },
            };
          }
          return cat;
        });
        
        setCategories(categoriesWithTranslations);
        setFilteredCategories(categoriesWithTranslations);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error(error.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReelDialog = async (reel?: Reel) => {
    if (reel) {
      // Fetch full reel with translations
      try {
        const response = await reelApi.get(reel.id);
        if (response.success) {
          const fullReel = response.data;
          setSelectedReel(fullReel);
          
          // Set multilingual data from translations or individual fields
          if (fullReel.translations) {
            setReelMultilingual(fullReel.translations);
          } else {
            setReelMultilingual({
              title: {
                en: (fullReel as any).title_en || fullReel.title || '',
                es: (fullReel as any).title_es || '',
                pt: (fullReel as any).title_pt || '',
              },
              description: {
                en: (fullReel as any).description_en || fullReel.description || '',
                es: (fullReel as any).description_es || '',
                pt: (fullReel as any).description_pt || '',
              },
              short_description: {
                en: (fullReel as any).short_description_en || fullReel.short_description || '',
                es: (fullReel as any).short_description_es || '',
                pt: (fullReel as any).short_description_pt || '',
              },
            });
          }
        } else {
          setSelectedReel({ ...reel });
          setReelMultilingual({
            title: { en: reel.title || '', es: '', pt: '' },
            description: { en: reel.description || '', es: '', pt: '' },
            short_description: { en: reel.short_description || '', es: '', pt: '' },
          });
        }
      } catch (error) {
        setSelectedReel({ ...reel });
        setReelMultilingual({
          title: { en: reel.title || '', es: '', pt: '' },
          description: { en: reel.description || '', es: '', pt: '' },
          short_description: { en: reel.short_description || '', es: '', pt: '' },
        });
      }
    } else {
      setSelectedReel({
        id: 0,
        title: '',
        slug: '',
        description: '',
        short_description: '',
        visibility: 'freemium',
        status: 'draft',
        is_free: true,
        category_id: null,
        tags: [],
        sort_order: 0,
        views: 0,
        unique_views: 0,
        rating: '0',
        rating_count: 0,
        duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Reel);
      setReelMultilingual({
        title: { en: '', es: '', pt: '' },
        description: { en: '', es: '', pt: '' },
        short_description: { en: '', es: '', pt: '' },
      });
    }
    setIsReelDialogOpen(true);
  };

  const handleOpenCategoryDialog = (category?: ReelCategory) => {
    if (category) {
      setSelectedCategory({ ...category });
      if (category.translations && category.translations.name && category.translations.description) {
        // Ensure all language keys exist
        setCategoryMultilingual({
          name: {
            en: category.translations.name.en || (category as any).name_en || category.name || '',
            es: category.translations.name.es || (category as any).name_es || '',
            pt: category.translations.name.pt || (category as any).name_pt || '',
          },
          description: {
            en: category.translations.description.en || (category as any).description_en || category.description || '',
            es: category.translations.description.es || (category as any).description_es || '',
            pt: category.translations.description.pt || (category as any).description_pt || '',
          },
        });
      } else {
        setCategoryMultilingual({
          name: {
            en: (category as any).name_en || category.name || '',
            es: (category as any).name_es || '',
            pt: (category as any).name_pt || '',
          },
          description: {
            en: (category as any).description_en || category.description || '',
            es: (category as any).description_es || '',
            pt: (category as any).description_pt || '',
          },
        });
      }
    } else {
      setSelectedCategory({
        id: 0,
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '',
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ReelCategory);
      setCategoryMultilingual({
        name: { en: '', es: '', pt: '' },
        description: { en: '', es: '', pt: '' },
      });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveReel = async () => {
    if (!selectedReel) return;

    if (!reelMultilingual.title.en?.trim()) {
      toast.error('Title (English) is required');
      return;
    }

    // Check if at least one video source is provided
    if (!selectedReel.bunny_embed_url?.trim() && 
        !selectedReel.bunny_hls_url?.trim() && 
        !selectedReel.video_url?.trim()) {
      toast.error('At least one video source is required (Embed URL, HLS URL, or Video URL)');
      return;
    }

    // Prepare payload outside try block so it's available in catch block for debugging
    const payload: any = {
      title: reelMultilingual.title.en,
      description: reelMultilingual.description.en || null,
      short_description: reelMultilingual.short_description.en || null,
      bunny_embed_url: selectedReel.bunny_embed_url?.trim() || null,
      bunny_hls_url: selectedReel.bunny_hls_url?.trim() || null,
      // Extract video ID from embed URL or HLS URL
      bunny_video_id: (() => {
        if (selectedReel.bunny_video_id) return selectedReel.bunny_video_id;
        
        // Try to extract from embed URL first
        if (selectedReel.bunny_embed_url) {
          const embedUrl = selectedReel.bunny_embed_url;
          // Format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
          let match = embedUrl.match(/mediadelivery\.net\/embed\/\d+\/([a-f0-9\-]{36})/);
          if (match && match[1]) return match[1];
          
          // Format: https://iframe.mediadelivery.net/embed/{videoId}
          match = embedUrl.match(/mediadelivery\.net\/embed\/([a-f0-9\-]{36})/);
          if (match && match[1]) return match[1];
        }
        
        // Try to extract from HLS URL
        if (selectedReel.bunny_hls_url) {
          const hlsUrl = selectedReel.bunny_hls_url;
          // Try to extract from token_path parameter first (URL encoded or not)
          let match = hlsUrl.match(/token_path=(?:%2F|%252F)?([a-f0-9\-]{36})(?:%2F|%252F)?/);
          // If not found, try to extract from path before playlist.m3u8
          if (!match || !match[1]) {
            match = hlsUrl.match(/\/([a-f0-9\-]{36})\/playlist\.m3u8/);
          }
          if (match && match[1]) return match[1];
        }
        return null;
      })(),
      bunny_video_url: selectedReel.bunny_video_url || null,
      bunny_thumbnail_url: selectedReel.bunny_thumbnail_url || null,
      video_url: selectedReel.video_url || null,
      thumbnail: selectedReel.thumbnail || null,
      intro_image: selectedReel.intro_image || null,
      visibility: selectedReel.visibility,
      status: selectedReel.status,
      is_free: selectedReel.is_free ?? true,
      price: selectedReel.price || null,
      category_id: selectedReel.category_id || null,
      category_tag: selectedReel.category_tag || null,
      tags: selectedReel.tags || [],
      sort_order: selectedReel.sort_order || 0,
      meta_title: selectedReel.meta_title || null,
      meta_description: selectedReel.meta_description || null,
      meta_keywords: selectedReel.meta_keywords || null,
      translations: reelMultilingual,
    };

    try {
      setIsSubmitting(true);

      console.log('🔵 [Frontend] Saving reel with payload:', payload);

      let response;
      if (selectedReel.id) {
        response = await reelApi.update(selectedReel.id, payload);
      } else {
        response = await reelApi.create(payload);
      }

      console.log('🔵 [Frontend] Reel save response:', response);

      if (response.success) {
        const savedReel = response.data;
        
        // Ensure translations are loaded for the saved reel
        if (savedReel && !savedReel.translations) {
          if (savedReel.title_en || savedReel.title_es || savedReel.title_pt) {
            savedReel.translations = {
              title: {
                en: savedReel.title_en || savedReel.title || '',
                es: savedReel.title_es || '',
                pt: savedReel.title_pt || '',
              },
              description: {
                en: savedReel.description_en || savedReel.description || '',
                es: savedReel.description_es || '',
                pt: savedReel.description_pt || '',
              },
              short_description: {
                en: savedReel.short_description_en || savedReel.short_description || '',
                es: savedReel.short_description_es || '',
                pt: savedReel.short_description_pt || '',
              },
            };
          }
        }
        
        // Ensure category translations are loaded
        if (savedReel?.category && !savedReel.category.translations) {
          if (savedReel.category.name_en || savedReel.category.name_es || savedReel.category.name_pt) {
            savedReel.category.translations = {
              name: {
                en: savedReel.category.name_en || savedReel.category.name || '',
                es: savedReel.category.name_es || '',
                pt: savedReel.category.name_pt || '',
              },
              description: {
                en: savedReel.category.description_en || savedReel.category.description || '',
                es: savedReel.category.description_es || '',
                pt: savedReel.category.description_pt || '',
              },
            };
          }
        }
        
        if (selectedReel.id) {
          // Update existing reel in state
          // Handle category: use the one from response (which should have translations loaded),
          // or fetch from local categories if category_id is set but category object is missing
          let updatedCategory = savedReel.category || null;
          if (!updatedCategory && savedReel.category_id) {
            // If category_id is set but category object is missing from response, find it from local categories
            const foundCategory = categories.find(c => c.id === savedReel.category_id);
            if (foundCategory) {
              updatedCategory = { ...foundCategory };
              // Ensure translations are loaded for the category
              if (!updatedCategory.translations) {
                if (updatedCategory.name_en || updatedCategory.name_es || updatedCategory.name_pt) {
                  updatedCategory.translations = {
                    name: {
                      en: updatedCategory.name_en || updatedCategory.name || '',
                      es: updatedCategory.name_es || '',
                      pt: updatedCategory.name_pt || '',
                    },
                    description: {
                      en: updatedCategory.description_en || updatedCategory.description || '',
                      es: updatedCategory.description_es || '',
                      pt: updatedCategory.description_pt || '',
                    },
                  };
                }
              }
            }
          }
          
          const updatedReel = { 
            ...savedReel,
            category: updatedCategory
          };
          setReels(prev => prev.map(r => r.id === selectedReel.id ? updatedReel : r));
          setFilteredReels(prev => prev.map(r => r.id === selectedReel.id ? updatedReel : r));
          toast.success('Reel updated successfully');
        } else {
          // Add new reel to state
          const newReel = { ...savedReel };
          setReels(prev => [newReel, ...prev]);
          setFilteredReels(prev => [newReel, ...prev]);
          toast.success('Reel created successfully');
        }
        
        setIsReelDialogOpen(false);
        setSelectedReel(null);
        setReelMultilingual({
          title: { en: '', es: '', pt: '' },
          description: { en: '', es: '', pt: '' },
          short_description: { en: '', es: '', pt: '' },
        });
      } else {
        toast.error(response.message || 'Failed to save reel');
      }
    } catch (error: any) {
      console.error('Error saving reel:', error);
      
      // Try to extract more detailed error information
      let errorMessage = 'Failed to save reel';
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Log the full error for debugging
      console.error('Full error details:', {
        error,
        selectedReel,
        payload,
        reelMultilingual
      });
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle transcription processing - directly process without modal
  const handleProcessTranscription = async (reelId: number) => {
    setProcessingTranscription(prev => ({ ...prev, [reelId]: true }));

    try {
      const reel = reels.find(r => r.id === reelId);
      if (!reel || (!reel.bunny_video_id && !reel.bunny_embed_url)) {
        toast.error('Reel does not have a Bunny.net video ID or embed URL');
        setProcessingTranscription(prev => ({ ...prev, [reelId]: false }));
        return;
      }

      // Use 'en' as default source language
      const result = await reelApi.processTranscription(
        reelId,
        ['en', 'es', 'pt'], 
        'en'
      );
      
      if (result.success) {
        toast.success(result.message || 'Transcription processing completed successfully!');
        // Refresh reels list to show updated transcription status
        fetchReels();
        // Fetch caption download URLs
        await fetchCaptionUrls(reelId);
      } else {
        toast.error(result.message || 'Failed to process transcription');
      }
    } catch (error: any) {
      console.error('Transcription processing error:', error);
      toast.error(error.message || 'An error occurred while processing transcription');
    } finally {
      setProcessingTranscription(prev => ({ ...prev, [reelId]: false }));
    }
  };

  // Fetch caption download URLs for a reel
  const fetchCaptionUrls = async (reelId: number) => {
    setLoadingCaptions(prev => ({ ...prev, [reelId]: true }));
    
    try {
      const result = await reelApi.getCaptionDownloadUrls(reelId);
      
      if (result.success) {
        setCaptionUrls(prev => ({ ...prev, [reelId]: result.data.caption_urls }));
        toast.success('Caption download URLs generated successfully!');
      } else {
        toast.error('Failed to get caption download URLs');
      }
    } catch (error: any) {
      console.error('Error fetching caption URLs:', error);
      toast.error('Failed to fetch caption URLs');
    } finally {
      setLoadingCaptions(prev => ({ ...prev, [reelId]: false }));
    }
  };

  // Handle caption download
  const handleDownloadCaption = (url: string, filename: string) => {
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloading ${filename}...`);
  };

  // This function is kept for backward compatibility but is no longer used
  const handleConfirmProcessTranscription = async () => {
    // The modal is no longer shown, so this function won't be called
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;

    if (!categoryMultilingual.name.en?.trim()) {
      toast.error('Category name (English) is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: categoryMultilingual.name.en,
        description: categoryMultilingual.description.en || null,
        icon: selectedCategory.icon || null,
        color: selectedCategory.color || null,
        sort_order: selectedCategory.sort_order || 0,
        is_active: selectedCategory.is_active ?? true,
        translations: categoryMultilingual,
      };

      console.log('🔵 [Frontend] handleSaveCategory - Payload:', {
        categoryId: selectedCategory.id,
        payload,
        categoryMultilingual,
        selectedCategory,
      });

      let response;
      if (selectedCategory.id) {
        console.log('🔵 [Frontend] Calling update API for category ID:', selectedCategory.id);
        response = await reelCategoryApi.update(selectedCategory.id, payload);
      } else {
        console.log('🔵 [Frontend] Calling create API');
        response = await reelCategoryApi.create(payload);
      }
      
      console.log('🔵 [Frontend] handleSaveCategory - Response:', response);

      if (response.success) {
        const savedCategory = response.data;
        
        // Ensure translations are loaded for the saved category
        if (savedCategory && !savedCategory.translations) {
          if (savedCategory.name_en || savedCategory.name_es || savedCategory.name_pt) {
            savedCategory.translations = {
              name: {
                en: savedCategory.name_en || savedCategory.name || '',
                es: savedCategory.name_es || '',
                pt: savedCategory.name_pt || '',
              },
              description: {
                en: savedCategory.description_en || savedCategory.description || '',
                es: savedCategory.description_es || '',
                pt: savedCategory.description_pt || '',
              },
            };
          }
        }
        
        if (selectedCategory.id) {
          // Update existing category in state
          const updatedCategory = { ...savedCategory };
          setCategories(prev => prev.map(c => c.id === selectedCategory.id ? updatedCategory : c));
          setFilteredCategories(prev => prev.map(c => c.id === selectedCategory.id ? updatedCategory : c));
          toast.success('Category updated successfully');
        } else {
          // Add new category to state
          const newCategory = { ...savedCategory };
          setCategories(prev => [newCategory, ...prev]);
          setFilteredCategories(prev => [newCategory, ...prev]);
          toast.success('Category created successfully');
        }
        
        setIsCategoryDialogOpen(false);
        setSelectedCategory(null);
        setCategoryMultilingual({
          name: { en: '', es: '', pt: '' },
          description: { en: '', es: '', pt: '' },
        });
      } else {
        toast.error(response.message || 'Failed to save category');
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReel = async (reelId: number) => {
    if (!confirm('Are you sure you want to delete this reel?')) {
      return;
    }

    try {
      const response = await reelApi.delete(reelId);
      if (response.success) {
        toast.success('Reel deleted successfully');
        await fetchReels();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete reel');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await reelCategoryApi.delete(categoryId);
      if (response.success) {
        toast.success('Category deleted successfully');
        await fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleToggleStatus = async (reel: Reel) => {
    const newStatus = reel.status === 'published' ? 'draft' : 'published';
    try {
      const response = await reelApi.update(reel.id, { status: newStatus });
      if (response.success) {
        toast.success(`Reel ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        await fetchReels();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reel status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reels Management</h1>
          <p className="text-muted-foreground">Manage your reels and categories</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'reels' && (
            <Button onClick={() => handleOpenReelDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Reel
            </Button>
          )}
          {activeTab === 'categories' && (
            <Button onClick={() => handleOpenCategoryDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'reels' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reels')}
          className="flex items-center"
          size="sm"
        >
          <VideoIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Reels</span>
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('categories')}
          className="flex items-center"
          size="sm"
        >
          <Folder className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Categories</span>
        </Button>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={activeTab === 'reels' ? 'Search reels...' : 'Search categories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Reels Tab */}
      {activeTab === 'reels' && (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Captions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={`reels-${displayLocale}`}>
                {filteredReels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No reels found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReels.map((reel) => (
                    <TableRow key={`reel-${reel.id}-${displayLocale}`}>
                      <TableCell className="font-medium">{getReelTitle(reel)}</TableCell>
                      <TableCell>
                        {reel.category ? (
                          <Badge variant="outline">{getCategoryName(reel.category)}</Badge>
                        ) : reel.category_tag ? (
                          <Badge variant="outline">{reel.category_tag}</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reel.status === 'published' ? 'default' : 'secondary'}>
                          {reel.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reel.visibility}</Badge>
                      </TableCell>
                      <TableCell>{reel.views || 0}</TableCell>
                      <TableCell>
                        {reel.duration ? `${Math.floor(reel.duration / 60)}:${String(reel.duration % 60).padStart(2, '0')}` : '-'}
                      </TableCell>
                      <TableCell>
                        {captionUrls[reel.id] ? (
                          <div className="flex gap-1">
                            {Object.keys(captionUrls[reel.id]).map(lang => (
                              <Badge key={lang} variant="secondary" className="text-xs">
                                {lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        ) : reel.caption_urls ? (
                          <Badge variant="outline" className="text-xs">
                            <Subtitles className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenReelDialog(reel)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(reel)}>
                              {reel.status === 'published' ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            {reel.bunny_video_id && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleProcessTranscription(reel.id)}
                                  disabled={processingTranscription[reel.id]}
                                >
                                  {processingTranscription[reel.id] ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Subtitles className="mr-2 h-4 w-4" />
                                  )}
                                  Process Captions (AI)
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => fetchCaptionUrls(reel.id)}
                                  disabled={loadingCaptions[reel.id]}
                                >
                                  {loadingCaptions[reel.id] ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Link className="mr-2 h-4 w-4" />
                                  )}
                                  Get Caption URLs
                                </DropdownMenuItem>
                                
                                {captionUrls[reel.id] && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Download Captions</DropdownMenuLabel>
                                    {Object.entries(captionUrls[reel.id]).map(([lang, caption]: [string, any]) => (
                                      <DropdownMenuItem
                                        key={lang}
                                        onClick={() => handleDownloadCaption(caption.url, caption.filename)}
                                        className="text-blue-600"
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        {caption.language_code} ({caption.format.toUpperCase()})
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                )}
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteReel(reel.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={`categories-${displayLocale}`}>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={`category-${category.id}-${displayLocale}`}>
                      <TableCell className="font-medium">{getCategoryName(category)}</TableCell>
                      <TableCell>{category.icon || '-'}</TableCell>
                      <TableCell>
                        {category.color && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.color}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenCategoryDialog(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Edit/Create Reel Dialog */}
      <Dialog open={isReelDialogOpen} onOpenChange={(open) => {
        setIsReelDialogOpen(open);
        if (!open) {
          setSelectedReel(null);
          setReelMultilingual({
            title: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
            short_description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReel?.id ? 'Edit Reel' : 'Create New Reel'}</DialogTitle>
            <DialogDescription>
              {selectedReel?.id ? 'Update reel information' : 'Fill in the details to create a new reel'}
            </DialogDescription>
          </DialogHeader>
          {selectedReel && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs with Translate Button */}
              <div className="flex items-center justify-between mb-4">
                <LanguageTabs 
                  activeLanguage={contentLocale} 
                  onLanguageChange={(lang) => setContentLocale(lang)}
                />
                <TranslateButton
                  fields={{
                    title: reelMultilingual.title[contentLocale] || '',
                    description: reelMultilingual.description[contentLocale] || '',
                    short_description: reelMultilingual.short_description[contentLocale] || '',
                  }}
                  sourceLanguage={contentLocale}
                  onTranslate={(translations) => {
                    setReelMultilingual(prev => ({
                      title: {
                        en: translations.title?.en !== undefined ? translations.title.en : prev.title.en,
                        es: translations.title?.es !== undefined ? translations.title.es : prev.title.es,
                        pt: translations.title?.pt !== undefined ? translations.title.pt : prev.title.pt,
                      },
                      description: {
                        en: translations.description?.en !== undefined ? translations.description.en : prev.description.en,
                        es: translations.description?.es !== undefined ? translations.description.es : prev.description.es,
                        pt: translations.description?.pt !== undefined ? translations.description.pt : prev.description.pt,
                      },
                      short_description: {
                        en: translations.short_description?.en !== undefined ? translations.short_description.en : prev.short_description.en,
                        es: translations.short_description?.es !== undefined ? translations.short_description.es : prev.short_description.es,
                        pt: translations.short_description?.pt !== undefined ? translations.short_description.pt : prev.short_description.pt,
                      },
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={reelMultilingual.title[contentLocale]}
                    onChange={(e) => setReelMultilingual({
                      ...reelMultilingual,
                      title: { ...reelMultilingual.title, [contentLocale]: e.target.value }
                    })}
                    placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={selectedReel.category_id ? selectedReel.category_id.toString() : 'none'}
                    onValueChange={(value) => setSelectedReel({ ...selectedReel, category_id: value && value !== 'none' ? parseInt(value) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={reelMultilingual.description[contentLocale]}
                  onChange={(e) => setReelMultilingual({
                    ...reelMultilingual,
                    description: { ...reelMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={reelMultilingual.short_description[contentLocale]}
                  onChange={(e) => setReelMultilingual({
                    ...reelMultilingual,
                    short_description: { ...reelMultilingual.short_description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter short description in ${contentLocale.toUpperCase()}`}
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Bunny.net Video Settings</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bunnyEmbedUrl">
                      Embed URL (Iframe) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bunnyEmbedUrl"
                      value={selectedReel.bunny_embed_url || selectedReel.bunny_player_url || ''}
                      onChange={(e) => setSelectedReel({ 
                        ...selectedReel, 
                        bunny_embed_url: e.target.value,
                        bunny_player_url: e.target.value,
                      })}
                      placeholder="https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the Bunny.net embed URL (iframe URL). This is the primary method for video playback. Video ID will be auto-extracted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunnyHlsUrl">
                      HLS Video URL <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="bunnyHlsUrl"
                      value={selectedReel.bunny_hls_url || ''}
                      onChange={(e) => setSelectedReel({ ...selectedReel, bunny_hls_url: e.target.value })}
                      placeholder="https://vz-xxxxx.b-cdn.net/{videoId}/playlist.m3u8"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Paste the Bunny.net HLS URL (playlist.m3u8) for advanced use cases. Video ID will be auto-extracted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunnyThumbnailUrl">Thumbnail URL</Label>
                    <Input
                      id="bunnyThumbnailUrl"
                      value={selectedReel.bunny_thumbnail_url || ''}
                      onChange={(e) => setSelectedReel({ ...selectedReel, bunny_thumbnail_url: e.target.value })}
                      placeholder="https://vz-xxx.b-cdn.net/thumbnail.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedReel.status}
                      onValueChange={(value: any) => setSelectedReel({ ...selectedReel, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={selectedReel.visibility}
                      onValueChange={(value: any) => setSelectedReel({ ...selectedReel, visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freemium">Freemium</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={selectedReel.sort_order || 0}
                      onChange={(e) => setSelectedReel({ ...selectedReel, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReelDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveReel} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedReel?.id ? 'Save Changes' : 'Create Reel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) {
          setSelectedCategory(null);
          setCategoryMultilingual({
            name: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCategory?.id ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescription>
              {selectedCategory?.id ? 'Update category information' : 'Fill in the details to create a new category'}
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs with Translate Button */}
              <div className="flex items-center justify-between mb-4">
                <LanguageTabs 
                  activeLanguage={contentLocale} 
                  onLanguageChange={(lang) => setContentLocale(lang)}
                />
                <TranslateButton
                  fields={{
                    name: categoryMultilingual.name[contentLocale] || '',
                    description: categoryMultilingual.description[contentLocale] || '',
                  }}
                  sourceLanguage={contentLocale}
                  onTranslate={(translations) => {
                    setCategoryMultilingual(prev => ({
                      name: {
                        en: translations.name?.en !== undefined ? translations.name.en : prev.name.en,
                        es: translations.name?.es !== undefined ? translations.name.es : prev.name.es,
                        pt: translations.name?.pt !== undefined ? translations.name.pt : prev.name.pt,
                      },
                      description: {
                        en: translations.description?.en !== undefined ? translations.description.en : prev.description.en,
                        es: translations.description?.es !== undefined ? translations.description.es : prev.description.es,
                        pt: translations.description?.pt !== undefined ? translations.description.pt : prev.description.pt,
                      },
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryName">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="categoryName"
                  value={categoryMultilingual.name[contentLocale] || ''}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    name: { ...categoryMultilingual.name, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter category name in ${contentLocale.toUpperCase()}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryMultilingual.description[contentLocale] || ''}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    description: { ...categoryMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={selectedCategory.icon || ''}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, icon: e.target.value })}
                    placeholder="e.g., ⚡, 🎨"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={selectedCategory.color || ''}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, color: e.target.value })}
                    placeholder="#A05245"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={selectedCategory.sort_order || 0}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={selectedCategory.is_active ?? true}
                      onChange={(e) => setSelectedCategory({ ...selectedCategory, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedCategory?.id ? 'Save Changes' : 'Create Category')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ReelsManagement;
