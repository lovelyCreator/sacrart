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
  Filter, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Folder,
  Video as VideoIcon,
  Link,
  Crown,
  Star,
  Zap,
  Calendar,
  Clock,
  TrendingUp,
  PlayCircle,
  RefreshCw,
  Languages,
  ThumbsUp,
  ThumbsDown,
  Subtitles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/hooks/useLocale';
import { seriesApi, videoApi, categoryApi, Series, Video, Category } from '@/services/videoApi';
import FileUpload from '@/components/admin/FileUpload';
import LanguageTabs from '@/components/admin/LanguageTabs';

// Using types from videoApi

// Multilingual data structure
interface MultilingualData {
  en: string;
  es: string;
  pt: string;
}

const ContentManagement = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { locale: urlLocale } = useLocale();
  // Use global site language for display, separate locale only for modal form inputs
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(urlLocale as 'en' | 'es' | 'pt' || 'en');
  // Get current site language for displaying table items - use useMemo to make it reactive
  const displayLocale = useMemo(() => {
    const lang = i18n.language || urlLocale || 'en';
    return lang.substring(0, 2) as 'en' | 'es' | 'pt';
  }, [i18n.language, urlLocale]);
  
  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    // If already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Prepend VITE_SERVER_BASE_URL
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || '';
    return baseUrl ? `${baseUrl}/${imagePath}` : imagePath;
  };
  
  const [activeTab, setActiveTab] = useState('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [series, setSeries] = useState<Series[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<Series[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multilingual state for series
  const [seriesMultilingual, setSeriesMultilingual] = useState<{
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
  
  // Multilingual state for videos
  const [videoMultilingual, setVideoMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
    short_description: MultilingualData;
    intro_description: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    short_description: { en: '', es: '', pt: '' },
    intro_description: { en: '', es: '', pt: '' },
  });
  
  // Media management state
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<any[]>([]);

  useEffect(() => {
    fetchContent();
  }, []); // Only fetch on mount, not when contentLocale changes

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      // Don't change the global locale - use the current site locale for API calls
      // contentLocale is only for modal form inputs, not for API fetching
      
      // Fetch data from API in parallel
      const [categoriesResponse, seriesResponse, videosResponse] = await Promise.allSettled([
        categoryApi.getAll({ with_counts: true }),
        seriesApi.getAll({ per_page: 100 }),
        videoApi.getAll({ per_page: 100 })
      ]);
      

      let categoriesData: any[] = [];

      // Handle categories - Categories are separate from Series
      if (categoriesResponse.status === 'fulfilled') {
        const response = categoriesResponse.value;
        if (response.success) {
          // Handle paginated response
          if (response.data?.data && Array.isArray(response.data.data)) {
            categoriesData = response.data.data;
          } else if (Array.isArray(response.data)) {
            categoriesData = response.data;
          } else {
            categoriesData = [];
          }
        } else {
          categoriesData = [];
        }
        // Ensure translations are loaded for each category
        const categoriesWithTranslations = categoriesData.map((cat: any) => {
          // If translations aren't loaded, try to construct from multilingual columns
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
        // Initialize filtered categories if we're on the categories tab
        if (activeTab === 'categories') {
          setFilteredCategories(categoriesWithTranslations);
        }
      } else {
        console.error('Failed to fetch categories:', categoriesResponse.reason);
        setCategories([]);
        if (activeTab === 'categories') {
          setFilteredCategories([]);
        }
      }

      // Handle series (Note: series = category in backend)
      if (seriesResponse.status === 'fulfilled') {
        const response = seriesResponse.value;
        
        // Handle different response structures
        let seriesData = [];
        if (Array.isArray(response.data)) {
          seriesData = response.data;
        } else if (response.data?.data) {
          seriesData = Array.isArray(response.data.data) ? response.data.data : [];
        } else {
          console.error('Unexpected series response structure:', response);
          seriesData = [];
        }
        
        
        // Ensure translations are loaded for each series
        const seriesWithTranslations = seriesData.map((serie: any) => {
          // If translations aren't loaded, try to construct from multilingual columns
          if (!serie.translations && (serie.title_en || serie.title_es || serie.title_pt)) {
            serie.translations = {
              title: {
                en: serie.title_en || serie.title || '',
                es: serie.title_es || '',
                pt: serie.title_pt || '',
              },
              description: {
                en: serie.description_en || serie.description || '',
                es: serie.description_es || '',
                pt: serie.description_pt || '',
              },
              short_description: {
                en: serie.short_description_en || serie.short_description || '',
                es: serie.short_description_es || '',
                pt: serie.short_description_pt || '',
              },
            };
          }
          return serie;
        });
        setSeries(seriesWithTranslations);
        setFilteredSeries(seriesWithTranslations);
      } else {
        console.error('Failed to fetch series:', seriesResponse.reason);
        setSeries([]);
        setFilteredSeries([]);
      }

      // Handle videos
      if (videosResponse.status === 'fulfilled') {
        const response = videosResponse.value;
        
        // Handle paginated response structure
        let videosData: any[] = [];
        if (response && response.success && response.data) {
          // Laravel pagination returns { data: [...], total: ..., per_page: ... }
          if (Array.isArray(response.data)) {
            videosData = response.data;
          } else if (response.data && Array.isArray(response.data.data)) {
            videosData = response.data.data;
          } else {
            console.error('Unexpected videos response structure:', response);
            videosData = [];
          }
        } else {
          console.error('Videos response not successful or missing data:', response);
          videosData = [];
        }
        
        // Ensure translations are loaded for each video
        const videosWithTranslations = videosData.map((video: any) => {
          // If translations aren't loaded, try to construct from multilingual columns
          if (!video.translations && (video.title_en || video.title_es || video.title_pt)) {
            video.translations = {
              title: {
                en: video.title_en || video.title || '',
                es: video.title_es || '',
                pt: video.title_pt || '',
              },
              description: {
                en: video.description_en || video.description || '',
                es: video.description_es || '',
                pt: video.description_pt || '',
              },
              short_description: {
                en: video.short_description_en || video.short_description || '',
                es: video.short_description_es || '',
                pt: video.short_description_pt || '',
              },
              intro_description: {
                en: video.intro_description_en || video.intro_description || '',
                es: video.intro_description_es || '',
                pt: video.intro_description_pt || '',
              },
            };
          }
          // Ensure is_featured_process is explicitly set (handle null, undefined, 0, false)
          // Convert to boolean: true if 1 or true, false otherwise
          if (video.is_featured_process === undefined || video.is_featured_process === null) {
            video.is_featured_process = false;
          } else {
            // Convert to boolean: handle both 1/0 and true/false
            video.is_featured_process = video.is_featured_process === true || video.is_featured_process === 1;
          }
          return video;
        });
        setVideos(videosWithTranslations);
        setFilteredVideos(videosWithTranslations);
      } else {
        console.error('Failed to fetch videos:', videosResponse.reason);
        setVideos([]);
        setFilteredVideos([]);
      }
      
      toast.success('Content loaded successfully');
      
    } catch (error: any) {
      console.error('Error loading content:', error);
      toast.error(`Failed to load content: ${error.message}`);
      
      // Set empty arrays as fallback
      setCategories([]);
      setSeries([]);
      setVideos([]);
      setFilteredSeries([]);
      setFilteredVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

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
  const getCategoryName = (category: Category): string => {
    return getTranslatedValue(category, 'name', displayLocale);
  };

  const getCategoryDescription = (category: Category): string => {
    return getTranslatedValue(category, 'description', displayLocale);
  };

  const getSeriesTitle = (serie: Series): string => {
    return getTranslatedValue(serie, 'title', displayLocale);
  };

  const getSeriesDescription = (serie: Series): string => {
    return getTranslatedValue(serie, 'description', displayLocale);
  };

  const getVideoTitle = (video: Video): string => {
    return getTranslatedValue(video, 'title', displayLocale);
  };

  const getVideoDescription = (video: Video): string => {
    return getTranslatedValue(video, 'description', displayLocale);
  };

  useEffect(() => {
    // Filter categories
    if (activeTab === 'categories') {
      if (categories && categories.length > 0) {
        const filtered = categories.filter(category => {
          const name = getCategoryName(category);
          const description = getCategoryDescription(category);
          return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase());
        });
        // Force update by creating new array reference
        setFilteredCategories([...filtered]);
      } else {
        setFilteredCategories([]);
      }
    }

    // Filter series
    if (activeTab === 'series' && series) {
      const filtered = series.filter(serie => {
        const title = getSeriesTitle(serie);
        const description = getSeriesDescription(serie);
        return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase());
      });
      // Force update by creating new array reference
      setFilteredSeries([...filtered]);
    }

    // Filter videos
    if (activeTab === 'videos') {
      if (videos && videos.length > 0) {
        const filtered = videos.filter(video => {
          const title = getVideoTitle(video);
          const description = getVideoDescription(video);
          return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase());
        });
        // Force update by creating new array reference
        setFilteredVideos([...filtered]);
      } else {
        setFilteredVideos([]);
      }
    }
  }, [categories, series, videos, searchTerm, activeTab, displayLocale]); // Use displayLocale instead of contentLocale

  // Re-filter when site language changes
  useEffect(() => {
    // Force re-filter when displayLocale changes (when user changes site language)
    if (activeTab === 'categories' && categories.length > 0) {
      const filtered = categories.filter(category => {
        const name = getCategoryName(category);
        const description = getCategoryDescription(category);
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredCategories([...filtered]);
    } else if (activeTab === 'series' && series.length > 0) {
      const filtered = series.filter(serie => {
        const title = getSeriesTitle(serie);
        const description = getSeriesDescription(serie);
        return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredSeries([...filtered]);
    } else if (activeTab === 'videos' && videos.length > 0) {
      const filtered = videos.filter(video => {
        const title = getVideoTitle(video);
        const description = getVideoDescription(video);
        return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredVideos([...filtered]);
    }
  }, [displayLocale, activeTab, categories, series, videos, searchTerm]); // Trigger when site language changes

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'premium':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'basic':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'freemium':
        return <Zap className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const colors = {
      premium: 'bg-yellow-100 text-yellow-800',
      basic: 'bg-blue-100 text-blue-800',
      freemium: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[visibility as keyof typeof colors]}`}>
        {getVisibilityIcon(visibility)}
        <span className="ml-1 capitalize">{visibility}</span>
      </span>
    );
  };

  const getVideoCategoryName = (video: Video): string => {
    // First try to get category from video's category_id (if available)
    if (video.category_id) {
      const category = categories.find(c => c.id === video.category_id);
      if (category) return getCategoryName(category);
    }
    // Otherwise, get category from the series
    if (video.series_id) {
      const videoSeries = series.find(s => s.id === video.series_id);
      if (videoSeries && videoSeries.category_id) {
        const category = categories.find(c => c.id === videoSeries.category_id);
        if (category) return getCategoryName(category);
      }
    }
    return t('admin.content_uncategorized', 'Uncategorized');
  };

  const getStatusBadge = (status?: string | null) => {
    if (!status) {
      return (
        <Badge variant="secondary">
          <EyeOff className="h-3 w-3 mr-1" />
          {t('admin.content_draft')}
        </Badge>
      );
    }

    const variants = {
      published: 'default',
      draft: 'secondary',
      archived: 'outline'
    } as const;

    const statusLabels = {
      published: t('admin.content_published'),
      draft: t('admin.content_draft'),
      archived: t('admin.content_archived')
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'published' && <Eye className="h-3 w-3 mr-1" />}
        {status === 'draft' && <EyeOff className="h-3 w-3 mr-1" />}
        {statusLabels[status as keyof typeof statusLabels] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown')}
      </Badge>
    );
  };

  const handleEditSeries = (serie: Series) => {
    // Ensure all fields are properly mapped since series = category
    // Map 'name' to 'title' if title is missing, and ensure all fields have values
    const mappedSeries: Series = {
      ...serie,
      title: serie.title || serie.name || '',
      name: serie.name || serie.title || '',
      description: serie.description || '',
      short_description: serie.short_description || '',
      visibility: serie.visibility || 'freemium',
      status: serie.status || 'draft',
      category_id: serie.category_id || serie.id || 1,
      instructor_id: serie.instructor_id || null,
      thumbnail: serie.thumbnail || null,
      cover_image: serie.cover_image || null,
      trailer_url: serie.trailer_url || null,
      meta_title: serie.meta_title || null,
      meta_description: serie.meta_description || null,
      meta_keywords: serie.meta_keywords || null,
      video_count: serie.video_count || 0,
      total_duration: serie.total_duration || 0,
      total_views: serie.total_views || 0,
      rating: serie.rating || '0',
      rating_count: serie.rating_count || 0,
      price: serie.price || '0',
      is_free: serie.is_free ?? true,
      published_at: serie.published_at || null,
      featured_until: serie.featured_until || null,
      is_featured: serie.is_featured ?? false,
      ...(serie as any),
      sort_order: serie.sort_order || 0,
      tags: serie.tags || null,
      image: (serie as any)?.image || null,
      created_at: serie.created_at || '',
      updated_at: serie.updated_at || '',
    };
    setSelectedSeries(mappedSeries);
    
    // Load multilingual data from series (check if translations exist)
    const translations = (serie as any)?.translations || {};
    setSeriesMultilingual({
      title: {
        en: translations.title?.en || serie.title || serie.name || '',
        es: translations.title?.es || '',
        pt: translations.title?.pt || '',
      },
      description: {
        en: translations.description?.en || serie.description || '',
        es: translations.description?.es || '',
        pt: translations.description?.pt || '',
      },
      short_description: {
        en: translations.short_description?.en || serie.short_description || '',
        es: translations.short_description?.es || '',
        pt: translations.short_description?.pt || '',
      },
    });
    
    setIsSeriesDialogOpen(true);
  };

  const handleAddCategory = () => {
    setSelectedCategory({
      id: 0,
      name: '',
      slug: '',
      description: '',
      color: '',
      icon: '',
      image: null,
      is_active: true,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    
    // Load multilingual data from category (check if translations exist)
    const translations = (category as any)?.translations || {};
    setCategoryMultilingual({
      name: {
        en: translations.name?.en || category.name || '',
        es: translations.name?.es || '',
        pt: translations.name?.pt || '',
      },
      description: {
        en: translations.description?.en || category.description || '',
        es: translations.description?.es || '',
        pt: translations.description?.pt || '',
      },
    });
    
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm(t('admin.content_confirm_delete_category', 'Are you sure you want to delete this category?'))) {
      return;
    }

    try {
      const response = await categoryApi.delete(categoryId);
      if (response.success) {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setFilteredCategories(prev => prev.filter(c => c.id !== categoryId));
        toast.success(t('admin.content_category_deleted', 'Category deleted successfully'));
      } else {
        toast.error(t('admin.content_category_delete_failed', 'Failed to delete category'));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('admin.content_category_delete_failed', 'Failed to delete category'));
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;

    // Validate that at least English name is provided
    if (!categoryMultilingual.name.en?.trim()) {
      toast.error(t('admin.content_category_name_required', 'Category name is required'));
      return;
    }

    // Validate that sort_order is unique
    const sortOrder = selectedCategory.sort_order || 0;
    const existingCategory = categories.find(
      c => c.id !== selectedCategory.id && c.sort_order === sortOrder
    );
    if (existingCategory) {
      toast.error(t('admin.content_sort_order_duplicate', `Sort order ${sortOrder} is already used by another category. Please choose a different number.`));
      return;
    }

    try {
      setIsSubmitting(true);
      
      const categoryData: any = {
        name: categoryMultilingual.name.en, // Default to English
        description: categoryMultilingual.description.en || '',
        color: selectedCategory.color || '',
        icon: selectedCategory.icon || '',
        sort_order: sortOrder,
        // Include multilingual translations
        translations: {
          name: categoryMultilingual.name,
          description: categoryMultilingual.description,
        },
      };

      // Handle image file upload if needed
      let formData: FormData | null = null;
      const categoryImage = selectedCategory.image;
      // Check if image is an object with a 'file' property (uploaded file)
      if (categoryImage !== null && 
          categoryImage !== undefined &&
          typeof categoryImage === 'object' && 
          !Array.isArray(categoryImage) &&
          'file' in categoryImage) {
        const imageFile = categoryImage as { file: File };
        formData = new FormData();
        formData.append('name', categoryData.name);
        if (categoryData.description) formData.append('description', categoryData.description);
        if (categoryData.color) formData.append('color', categoryData.color);
        if (categoryData.icon) formData.append('icon', categoryData.icon);
        formData.append('sort_order', String(categoryData.sort_order));
        formData.append('image_file', imageFile.file);
        // Append translations as JSON string
        formData.append('translations', JSON.stringify(categoryData.translations));
      }

      let response;
      if (selectedCategory.id && selectedCategory.id > 0) {
        // Update category
        response = await categoryApi.update(selectedCategory.id, formData || categoryData);
      } else {
        // Create category
        response = await categoryApi.create(formData || categoryData);
      }

      if (response && response.success) {
        const savedCategory = response.data;
        if (selectedCategory.id) {
          setCategories(prev => prev.map(c => c.id === selectedCategory.id ? savedCategory : c));
          setFilteredCategories(prev => prev.map(c => c.id === selectedCategory.id ? savedCategory : c));
          toast.success(t('admin.content_category_updated', 'Category updated successfully'));
        } else {
          setCategories(prev => [savedCategory, ...prev]);
          setFilteredCategories(prev => [savedCategory, ...prev]);
          toast.success(t('admin.content_category_created', 'Category created successfully'));
          
          // Refetch categories to ensure we have the latest data from the database
          setTimeout(() => {
            fetchContent();
          }, 500);
        }
        setIsCategoryDialogOpen(false);
        setSelectedCategory(null);
      } else {
        toast.error(t('admin.content_category_save_failed', 'Failed to save category'));
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      const errorMessage = error?.message || error?.data?.message || t('admin.content_category_save_failed', 'Failed to save category');
      toast.error(errorMessage);
      
      // Log full error details for debugging
      if (error?.response) {
        console.error('API Error Response:', error.response);
      }
      if (error?.data) {
        console.error('Error Data:', error.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSeries = () => {
    // Check if categories exist
    if (categories.length === 0) {
      toast.error(t('admin.content_no_categories_create_first', 'Please create a category first before creating a series.'));
      setActiveTab('categories');
      return;
    }
    
    setSelectedSeries({
      id: 0,
      name: '',
      title: '',
      slug: '',
      description: '',
      short_description: '',
      visibility: 'freemium',
      status: 'draft',
      category_id: categories[0]?.id || null, // Default to first category
      instructor_id: 1,
      thumbnail: null,
      cover_image: null,
      trailer_url: null,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      video_count: 0,
      total_duration: 0,
      total_views: 0,
      rating: '0',
      rating_count: 0,
      price: '0',
      is_free: true,
      published_at: null,
      featured_until: null,
      is_featured: false,
      sort_order: 0,
      tags: null,
      created_at: '',
      updated_at: '',
    });
    
    // Initialize multilingual data
    setSeriesMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
      short_description: { en: '', es: '', pt: '' },
    });
    
    setIsSeriesDialogOpen(true);
  };

  const handleSaveSeries = async () => {
    if (!selectedSeries) return;

    // Validate that at least English title is provided
    if (!seriesMultilingual.title.en?.trim()) {
      toast.error('Title in English is required');
      return;
    }

    // Validate that category is selected
    if (!selectedSeries.category_id) {
      toast.error(t('admin.content_category_required', 'Please select a category for this series.'));
      return;
    }

    try {
      setIsSubmitting(true);
      // Prepare series payload with multilingual data
      const seriesPayload: any = {
        title: seriesMultilingual.title.en, // Default to English
        name: seriesMultilingual.title.en, // Category name
        description: seriesMultilingual.description.en || '', // Ensure not null (database requires it)
        short_description: seriesMultilingual.short_description.en || null,
        visibility: selectedSeries.visibility || 'freemium',
        status: selectedSeries.status || 'draft',
        category_id: selectedSeries.category_id || null,
        thumbnail: (selectedSeries as any)?.thumbnail || null,
        cover_image: (selectedSeries as any)?.cover_image || null,
        trailer_url: (selectedSeries as any)?.trailer_url || null,
        is_homepage_featured: (selectedSeries as any)?.is_homepage_featured || false,
        // Include multilingual translations
        translations: {
          title: seriesMultilingual.title,
          description: seriesMultilingual.description,
          short_description: seriesMultilingual.short_description,
        },
      };
      
      let response;
      if (selectedSeries.id && selectedSeries.id > 0) {
        // Update series
        response = await seriesApi.update(selectedSeries.id, seriesPayload);
      } else {
        // Create series
        response = await seriesApi.create(seriesPayload);
      }
      
      if (response.success) {
        const savedSeries = response.data;
        if (selectedSeries.id) {
          setSeries(prev => prev.map(s => s.id === selectedSeries.id ? savedSeries : s));
          setFilteredSeries(prev => prev.map(s => s.id === selectedSeries.id ? savedSeries : s));
          toast.success(t('admin.content_series_updated'));
        } else {
          setSeries(prev => [savedSeries, ...prev]);
          setFilteredSeries(prev => [savedSeries, ...prev]);
          toast.success(t('admin.content_series_created'));
        }
        setIsSeriesDialogOpen(false);
        setSelectedSeries(null);
      } else {
        toast.error(response.message || "Failed to save series");
      }
    } catch (error: any) {
      console.error('Error saving series:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to save series: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVideo = (video: Video) => {
    // Ensure is_featured_process is explicitly set (handle boolean, number, or undefined)
    const isFeatured = !!(video as any).is_featured_process;
    setSelectedVideo({
      ...video,
      is_featured_process: isFeatured,
    });
    
    // Load multilingual data from video (check if translations exist)
    const translations = (video as any)?.translations || {};
    setVideoMultilingual({
      title: {
        en: translations.title?.en || video.title || '',
        es: translations.title?.es || '',
        pt: translations.title?.pt || '',
      },
      description: {
        en: translations.description?.en || video.description || '',
        es: translations.description?.es || '',
        pt: translations.description?.pt || '',
      },
      short_description: {
        en: translations.short_description?.en || video.short_description || '',
        es: translations.short_description?.es || '',
        pt: translations.short_description?.pt || '',
      },
      intro_description: {
        en: translations.intro_description?.en || video.intro_description || '',
        es: translations.intro_description?.es || '',
        pt: translations.intro_description?.pt || '',
      },
    });
    
    setIsVideoDialogOpen(true);
  };

  const handleAddVideo = () => {
    // Check if series exist
    if (series.length === 0) {
      toast.error(t('admin.content_no_series_create_first', 'Please create a series first before creating an episode.'));
      setActiveTab('series');
      return;
    }
    const defaultSeries = series.length > 0 ? series[0] : null;
    setSelectedVideo({
      id: 0,
      title: '',
      slug: '',
      description: '',
      short_description: null,
      category_id: defaultSeries?.category_id || null, // Videos have both category_id and series_id
      series_id: defaultSeries?.id || null,
      instructor_id: null,
      video_url: null,
      video_file_path: null,
      thumbnail: null,
      intro_image: null,
      intro_description: null,
      duration: 0,
      file_size: null,
      video_format: null,
      video_quality: null,
      bunny_video_id: null,
      bunny_video_url: null,
      bunny_embed_url: '',
      bunny_thumbnail_url: null,
      streaming_urls: null,
      hls_url: null,
      dash_url: null,
      visibility: 'freemium',
      status: 'draft',
      is_free: true,
      price: null,
      episode_number: null,
      sort_order: 0,
      tags: null,
      views: 0,
      unique_views: 0,
      rating: '0',
      rating_count: 0,
      completion_rate: 0,
      published_at: null,
      scheduled_at: null,
      downloadable_resources: null,
      allow_download: false,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      processing_status: 'pending',
      processing_error: null,
      processed_at: null,
      created_at: '',
      updated_at: '',
    });
    
    // Initialize multilingual data
    setVideoMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
      short_description: { en: '', es: '', pt: '' },
      intro_description: { en: '', es: '', pt: '' },
    });
    
    setIsVideoDialogOpen(true);
  };

  // Load Player.js library for Bunny.net iframe control
  useEffect(() => {
    // Check if Player.js is already loaded
    if ((window as any).playerjs) {
      return;
    }

    // Load Player.js script
    const script = document.createElement('script');
    script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Player.js library loaded in admin panel');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Player.js library');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src*="playerjs"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Fetch duration for an existing video using Player.js and update it
  const fetchAndUpdateVideoDuration = async (video: Video) => {
    if (!video.bunny_embed_url) {
      toast.error('No Bunny.net embed URL found for this video');
      return;
    }

    try {
      // Convert /play/ URLs to /embed/ URLs for Player.js
      let playerUrl = video.bunny_embed_url;
      if (playerUrl.includes('/play/')) {
        const playMatch = playerUrl.match(/\/play\/(\d+)\/([^/?]+)/);
        if (playMatch) {
          const libraryId = playMatch[1];
          const videoId = playMatch[2];
          playerUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
        }
      }

      toast.info(`Fetching duration for "${getVideoTitle(video)}"...`);
      const duration = await fetchDurationWithPlayerJs(playerUrl);
      
      if (duration && duration > 0) {
        // Update duration via API
        const response = await videoApi.updateDuration(video.id, Math.floor(duration));
        if (response.success) {
          // Update local state
          setVideos(prev => prev.map(v => 
            v.id === video.id 
              ? { ...v, duration: Math.floor(duration) }
              : v
          ));
          toast.success(`Duration updated: ${Math.floor(duration / 60)}m ${duration % 60}s`);
        } else {
          toast.error('Failed to update duration in database');
        }
      } else {
        toast.warning('Could not fetch duration. Please try again or enter it manually.');
      }
    } catch (error: any) {
      console.error('Error fetching/updating video duration:', error);
      toast.error('Error fetching duration: ' + (error.message || 'Unknown error'));
    }
  };

  // DEPRECATED: Fetch duration using Player.js (client-side fallback)
  // Note: This is no longer the primary method. Backend API is used instead.
  // Kept only as a last resort if backend completely fails.
  const fetchDurationWithPlayerJs = async (embedUrl: string): Promise<number | null> => {
    return new Promise((resolve) => {
      // Wait for Player.js to be available
      const checkPlayerJs = () => {
        if (!(window as any).playerjs) {
          setTimeout(checkPlayerJs, 100);
          return;
        }

        try {
          // Create a temporary hidden iframe to get duration
          const tempIframe = document.createElement('iframe');
          tempIframe.src = embedUrl;
          tempIframe.style.display = 'none';
          tempIframe.style.width = '1px';
          tempIframe.style.height = '1px';
          tempIframe.style.position = 'absolute';
          tempIframe.style.left = '-9999px';
          document.body.appendChild(tempIframe);

          const player = new (window as any).playerjs.Player(tempIframe);

          player.on('ready', () => {
            player.getDuration((duration: number) => {
              console.log('📹 Duration fetched via Player.js:', duration, 'seconds');
              // Clean up
              document.body.removeChild(tempIframe);
              resolve(duration > 0 ? duration : null);
            });
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            if (document.body.contains(tempIframe)) {
              document.body.removeChild(tempIframe);
            }
            resolve(null);
          }, 10000);
        } catch (error) {
          console.error('Error using Player.js to get duration:', error);
          resolve(null);
        }
      };

      checkPlayerJs();
    });
  };

  const fetchBunnyVideoMetadata = async (embedUrl?: string, videoId?: string) => {
    if (!embedUrl && !videoId) {
      return;
    }

    // Always use backend API to fetch duration (server-side, more reliable)
    // Duration will be automatically saved to database when video is created/updated
    try {
      const response = await videoApi.getBunnyVideoMetadata(videoId, embedUrl);
      
      if (response.success && response.data) {
        const { duration, file_size, thumbnail_url } = response.data;
        
        // Update selectedVideo with fetched metadata
        setSelectedVideo(prev => ({
          ...prev!,
          duration: duration || prev?.duration || 0,
          file_size: file_size || prev?.file_size || null,
          bunny_thumbnail_url: thumbnail_url || prev?.bunny_thumbnail_url || null,
        }));
        
        if (duration && duration > 0) {
          toast.success(`Video duration fetched from server: ${Math.floor(duration / 60)}m ${duration % 60}s`);
        } else {
          toast.warning('Duration not available. It will be fetched automatically when you save the video.');
        }
        return; // Success
      }
    } catch (error: any) {
      // Only log non-404 errors (404 is expected for videos not yet in Bunny.net)
      if (!error.message?.includes('Video not found')) {
        console.error('Failed to fetch duration from server:', error);
      }
      
      // Show helpful error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        toast.error('Bunny.net API key not configured. Duration will be set to 0. Please configure API credentials.');
      } else {
        toast.warning(`Could not fetch duration: ${errorMessage}. Duration will be fetched automatically when you save the video.`);
      }
      
      // Note: Duration will still be fetched automatically by backend when video is saved
      // So we don't need Player.js fallback here - backend handles it
    }
  };

  const handleSaveVideo = async () => {
    if (!selectedVideo) return;

    // Validate required fields
    if (!videoMultilingual.title.en?.trim()) {
      toast.error('Title in English is required');
      return;
    }
    
    if (!selectedVideo.series_id) {
      toast.error(t('admin.content_series_required'));
      return;
    }

    // For Bunny.net-only integration, require at least an embed URL
    if (!selectedVideo.bunny_embed_url?.trim()) {
      toast.error('Bunny.net embed URL is required');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create payload with both category_id and series_id (videos belong to both Category and Series)
      const { bunny_video_id, bunny_video_url, bunny_embed_url, bunny_thumbnail_url, ...restVideoData } = selectedVideo;
      
      // Get category_id from the selected series if not already set
      const categoryId = selectedVideo.category_id || 
        (selectedVideo.series_id ? series.find(s => s.id === selectedVideo.series_id)?.category_id : null);
      
      if (!categoryId) {
        toast.error(t('admin.content_category_required', 'Category is required for videos.'));
        return;
      }
      
      // Build payload with multilingual translations
      const payload: any = {
        ...restVideoData,
        title: videoMultilingual.title.en, // Default to English
        description: videoMultilingual.description.en,
        short_description: videoMultilingual.short_description.en || null,
        intro_description: videoMultilingual.intro_description.en || null,
        category_id: categoryId, // Videos belong to Category
        series_id: selectedVideo.series_id, // Videos belong to Series
        // Include multilingual translations
        translations: {
          title: videoMultilingual.title,
          description: videoMultilingual.description,
          short_description: videoMultilingual.short_description,
          intro_description: videoMultilingual.intro_description,
        },
      };
      
      // Only include bunny fields if they have actual non-empty values
      // This prevents errors if the database doesn't have these columns
      if (bunny_embed_url && bunny_embed_url.trim()) {
        payload.bunny_embed_url = bunny_embed_url;
      }
      if (bunny_video_id && bunny_video_id.trim()) {
        payload.bunny_video_id = bunny_video_id;
      }
      if (bunny_video_url && bunny_video_url.trim()) {
        payload.bunny_video_url = bunny_video_url;
      }
      if (bunny_thumbnail_url && bunny_thumbnail_url.trim()) {
        payload.bunny_thumbnail_url = bunny_thumbnail_url;
      }

      let response;
      if (selectedVideo.id) {
        response = await videoApi.update(selectedVideo.id, payload);
      } else {
        response = await videoApi.create(payload);
      }

      if (response.success) {
        const savedVideo = response.data;
        // Ensure is_featured_process is included in the saved video (explicitly set it)
        if (savedVideo) {
          savedVideo.is_featured_process = savedVideo.is_featured_process !== undefined 
            ? savedVideo.is_featured_process 
            : (selectedVideo.is_featured_process || false);
        }
        if (selectedVideo.id) {
          // Create a new object to ensure React detects the change
          const updatedVideo = { ...savedVideo, is_featured_process: savedVideo.is_featured_process || false };
          setVideos(prev => prev.map(v => v.id === selectedVideo.id ? updatedVideo : v));
          setFilteredVideos(prev => prev.map(v => v.id === selectedVideo.id ? updatedVideo : v));
          toast.success(t('admin.content_video_updated'));
        } else {
          const newVideo = { ...savedVideo, is_featured_process: savedVideo.is_featured_process || false };
          setVideos(prev => [newVideo, ...prev]);
          setFilteredVideos(prev => [newVideo, ...prev]);
          toast.success(t('admin.content_video_created'));
        }
        setIsVideoDialogOpen(false);
        setSelectedVideo(null);
      } else {
        toast.error(response.message || "Failed to save video");
      }
    } catch (error: any) {
      console.error('Error saving video:', error);
      const errorMessage = error.message || 'Failed to save video';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeries = async (seriesId: number) => {
    if (!confirm(t('admin.content_series_delete_confirm'))) {
      return;
    }

    try {
      const response = await seriesApi.delete(seriesId);
      
      if (response.success) {
        setSeries(prev => prev.filter(s => s.id !== seriesId));
        setFilteredSeries(prev => prev.filter(s => s.id !== seriesId));
        toast.success(t('admin.content_series_deleted'));
      } else {
        toast.error(response.message || "Failed to delete series");
      }
    } catch (error: any) {
      console.error('Error deleting series:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to delete series: ${errorMessage}`);
    }
  };

  // Handle transcription processing
  const [processingTranscription, setProcessingTranscription] = useState<Record<number, boolean>>({});
  
  const handleProcessTranscription = async (videoId: number) => {
    if (!confirm('Process transcriptions for this video? This will generate captions in English, Spanish, and Portuguese using Deepgram AI.')) {
      return;
    }

    setProcessingTranscription(prev => ({ ...prev, [videoId]: true }));

    try {
      const result = await videoApi.processTranscription(videoId, ['en', 'es', 'pt'], 'en');
      
      if (result.success) {
        toast.success(result.message || 'Transcription processing completed successfully!');
        // Refresh videos list to show updated transcription status
        fetchContent();
      } else {
        toast.error(result.message || 'Failed to process transcription');
      }
    } catch (error: any) {
      console.error('Transcription processing error:', error);
      toast.error(error.message || 'An error occurred while processing transcription');
    } finally {
      setProcessingTranscription(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm(t('admin.content_video_delete_confirm'))) {
      return;
    }

    try {
      const response = await videoApi.delete(videoId);
      if (response.success) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        setFilteredVideos(prev => prev.filter(v => v.id !== videoId));
        toast.success(t('admin.content_video_deleted'));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video");
    }
  };

  const handleToggleFeaturedProcess = async (videoId: number) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const currentStatus = !!(video as any).is_featured_process;
    const newStatus = !currentStatus;
    
    try {
      const response = await videoApi.update(videoId, {
        is_featured_process: newStatus
      });

      if (response.success) {
        const updatedVideo = response.data;
        // Ensure is_featured_process is included
        if (updatedVideo) {
          (updatedVideo as any).is_featured_process = newStatus;
        }
        setVideos(prev => prev.map(v => v.id === videoId ? updatedVideo : v));
        setFilteredVideos(prev => prev.map(v => v.id === videoId ? updatedVideo : v));
        toast.success(newStatus 
          ? 'Video added to Featured Process' 
          : 'Video removed from Featured Process'
        );
      } else {
        toast.error(response.message || 'Failed to update featured status');
      }
    } catch (error: any) {
      console.error('Error toggling featured process:', error);
      toast.error(error.message || 'Failed to update featured status');
    }
  };

  const handleToggleCategoryHomepageFeatured = async (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const currentStatus = (category as any)?.is_homepage_featured || false;
    const newStatus = !currentStatus;
    
    try {
      // If setting to featured, first unset any other featured category
      if (newStatus) {
        const otherFeatured = categories.find(c => c.id !== categoryId && (c as any)?.is_homepage_featured);
        if (otherFeatured) {
          try {
            await categoryApi.update(otherFeatured.id!, { is_homepage_featured: false } as any);
          } catch (error) {
            console.error('Error unsetting other featured category:', error);
          }
        }
      }

      const response = await categoryApi.update(categoryId, { is_homepage_featured: newStatus } as any);
      if (response.success) {
        const updatedCategory = response.data;
        // Update the category in the list
        setCategories(prev => prev.map(c => {
          if (c.id === categoryId) {
            return { ...c, ...updatedCategory, is_homepage_featured: newStatus };
          }
          // If setting a new featured category, unset any other featured category
          if (newStatus && (c as any)?.is_homepage_featured) {
            return { ...c, is_homepage_featured: false };
          }
          return c;
        }));
        setFilteredCategories(prev => prev.map(c => {
          if (c.id === categoryId) {
            return { ...c, ...updatedCategory, is_homepage_featured: newStatus };
          }
          // If setting a new featured category, unset any other featured category
          if (newStatus && (c as any)?.is_homepage_featured) {
            return { ...c, is_homepage_featured: false };
          }
          return c;
        }));
        toast.success(newStatus ? 'Category set as homepage featured' : 'Category removed from homepage');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update homepage featured status");
    }
  };

  const handleToggleHomepageFeatured = async (seriesId: number) => {
    const serie = series.find(s => s.id === seriesId);
    if (!serie) return;

    const currentStatus = (serie as any)?.is_homepage_featured || false;
    const newStatus = !currentStatus;
    
    try {
      // If setting to featured, first unset any other featured series
      if (newStatus) {
        const otherFeatured = series.find(s => s.id !== seriesId && (s as any)?.is_homepage_featured);
        if (otherFeatured) {
          try {
            await seriesApi.update(otherFeatured.id, { is_homepage_featured: false } as any);
          } catch (error) {
            console.error('Error unsetting other featured series:', error);
          }
        }
      }

      const response = await seriesApi.update(seriesId, { is_homepage_featured: newStatus } as any);
      if (response.success) {
        const updatedSeries = response.data;
        // Update the series in the list
        setSeries(prev => prev.map(s => {
          if (s.id === seriesId) {
            return { ...s, ...updatedSeries, is_homepage_featured: newStatus };
          }
          // If setting a new featured series, unset any other featured series
          if (newStatus && (s as any)?.is_homepage_featured) {
            return { ...s, is_homepage_featured: false };
          }
          return s;
        }));
        setFilteredSeries(prev => prev.map(s => {
          if (s.id === seriesId) {
            return { ...s, ...updatedSeries, is_homepage_featured: newStatus };
          }
          // If setting a new featured series, unset any other featured series
          if (newStatus && (s as any)?.is_homepage_featured) {
            return { ...s, is_homepage_featured: false };
          }
          return s;
        }));
        toast.success(newStatus ? 'Series set as homepage featured' : 'Series removed from homepage');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update homepage featured status");
    }
  };

  const handleAddEpisodeToSeries = (seriesId: number) => {
    const selectedSerie = series.find(s => s.id === seriesId);
    if (!selectedSerie) {
      toast.error('Series not found');
      return;
    }
    
    setSelectedVideo({
      id: 0,
      title: '',
      slug: '',
      description: '',
      short_description: null,
      category_id: selectedSerie.category_id || undefined,
      series_id: seriesId,
      instructor_id: null,
      video_url: null,
      video_file_path: null,
      thumbnail: null,
      intro_image: null,
      intro_description: null,
      duration: 0,
      file_size: null,
      video_format: null,
      video_quality: null,
      bunny_video_id: null,
      bunny_video_url: null,
      bunny_embed_url: '',
      bunny_thumbnail_url: null,
      streaming_urls: null,
      hls_url: null,
      dash_url: null,
      visibility: 'freemium',
      status: 'draft',
      is_free: true,
      price: null,
      episode_number: null,
      sort_order: 0,
      tags: null,
      views: 0,
      unique_views: 0,
      likes_count: 0,
      dislikes_count: 0,
      rating: '0',
      rating_count: 0,
      completion_rate: 0,
      published_at: null,
      scheduled_at: null,
      downloadable_resources: null,
      allow_download: false,
      meta_title: null,
      meta_description: null,
      meta_keywords: null,
      created_at: '',
      updated_at: '',
    } as Video);
    
    setIsVideoDialogOpen(true);
  };

  const handleToggleSeriesStatus = async (seriesId: number) => {
    const serie = series.find(s => s.id === seriesId);
    if (!serie) return;

    const newStatus = serie.status === 'published' ? 'draft' : 'published';
    
    try {
      // Use seriesApi to update the status
      const response = await seriesApi.update(seriesId, { status: newStatus });
      if (response.success) {
        // Map category response to series format
        const categoryData = response.data;
        const seriesData: Series = {
          ...categoryData,
          title: (categoryData as any).title || categoryData.name || '',
          status: (categoryData as any).status || newStatus,
          visibility: (categoryData as any).visibility || serie.visibility || 'freemium',
          video_count: (categoryData as any).video_count || serie.video_count || 0,
          total_duration: (categoryData as any).total_duration || serie.total_duration || 0,
          total_views: (categoryData as any).total_views || serie.total_views || 0,
          category_id: categoryData.id,
          instructor_id: (categoryData as any).instructor_id || serie.instructor_id || null,
          thumbnail: (categoryData as any).thumbnail || serie.thumbnail || null,
          cover_image: (categoryData as any).cover_image || serie.cover_image || null,
          trailer_url: (categoryData as any).trailer_url || serie.trailer_url || null,
          meta_title: (categoryData as any).meta_title || serie.meta_title || null,
          meta_description: (categoryData as any).meta_description || serie.meta_description || null,
          meta_keywords: (categoryData as any).meta_keywords || serie.meta_keywords || null,
          rating: (categoryData as any).rating || serie.rating || '0',
          rating_count: (categoryData as any).rating_count || serie.rating_count || 0,
          price: (categoryData as any).price || serie.price || '0',
          is_free: (categoryData as any).is_free ?? serie.is_free ?? true,
          published_at: (categoryData as any).published_at || serie.published_at || null,
          featured_until: (categoryData as any).featured_until || serie.featured_until || null,
          is_featured: (categoryData as any).is_featured ?? serie.is_featured ?? false,
          tags: (categoryData as any).tags || serie.tags || null,
        } as Series;
        setSeries(prev => prev.map(s => s.id === seriesId ? seriesData : s));
        setFilteredSeries(prev => prev.map(s => s.id === seriesId ? seriesData : s));
        toast.success(`Series ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update series status");
    }
  };

  const handleToggleVideoStatus = async (videoId: number) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const newStatus = video.status === 'published' ? 'draft' : 'published';
    
    try {
      const response = await videoApi.update(videoId, { status: newStatus });
      if (response.success) {
        setVideos(prev => prev.map(v => v.id === videoId ? response.data : v));
        setFilteredVideos(prev => prev.map(v => v.id === videoId ? response.data : v));
        toast.success(`Video ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update video status");
    }
  };

  const formatPrice = (price: string | number | null | undefined): string => {
    if (price === null || price === undefined) return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.content_management')}</h1>
          <p className="text-muted-foreground">{t('admin.common_loading')}</p>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
                <div className="space-x-2 flex">
                  <div className="h-8 w-8 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('admin.content_management')}</h1>
          <p className="text-muted-foreground">{t('admin.content_management')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={fetchContent} disabled={isLoading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('admin.common_refresh')}</span>
          </Button>
          {activeTab === 'categories' && (
            <Button onClick={handleAddCategory} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.content_add_category', 'Add Category')}</span>
              <span className="sm:hidden">{t('admin.content_categories', 'Categories')}</span>
            </Button>
          )}
          {activeTab === 'series' && (
            <Button onClick={handleAddSeries} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.content_add_series')}</span>
              <span className="sm:hidden">{t('admin.content_series')}</span>
            </Button>
          )}
          {activeTab === 'videos' && (
            <Button variant="outline" onClick={handleAddVideo} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.content_add_episode')}</span>
              <span className="sm:hidden">{t('admin.content_episode')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('categories')}
          className="flex items-center"
          size="sm"
        >
          <Folder className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.content_categories', 'Categories')}</span>
        </Button>
        <Button
          variant={activeTab === 'series' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('series')}
          className="flex items-center"
          size="sm"
        >
          <Folder className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.content_series')}</span>
        </Button>
        <Button
          variant={activeTab === 'videos' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('videos')}
          className="flex items-center"
          size="sm"
        >
          <VideoIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.content_videos')}</span>
        </Button>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('admin.content_search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">{t('admin.content_table_category', 'Category')}</TableHead>
                    <TableHead className="w-[150px]">{t('admin.content_table_description', 'Description')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_sort_order', 'Sort Order')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_series', 'Series')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_homepage', 'Homepage')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_created', 'Created')}</TableHead>
                    <TableHead className="w-[70px]">{t('admin.content_table_actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody key={`categories-${displayLocale}`}>
                  {filteredCategories && filteredCategories.length > 0 ? filteredCategories.map((category) => (
                    <TableRow key={`category-${category.id}-${displayLocale}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            {getImageUrl(category.image) ? (
                              <img src={getImageUrl(category.image)!} alt={getCategoryName(category)} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Folder className="h-6 w-6" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{getCategoryName(category)}</div>
                            {category.color && (
                              <div className="flex items-center gap-2 mt-1">
                                <div 
                                  className="w-4 h-4 rounded-full border border-border" 
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="text-xs text-muted-foreground">{category.color}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {getCategoryDescription(category) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{category.sort_order || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {(() => {
                            const seriesCount = series.filter(s => s.category_id === category.id).length;
                            return seriesCount || 0;
                          })()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(category as any).is_homepage_featured ? (
                          <Badge variant="default" className="bg-primary text-white">
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatDate(category.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('admin.content_actions', 'Actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('admin.content_edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleCategoryHomepageFeatured(category.id!)}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              {(category as any).is_homepage_featured 
                                ? 'Remove from Homepage' 
                                : 'Set as Homepage Featured'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCategory(category.id!)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('admin.content_delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {categories.length === 0 ? t('admin.content_no_categories', 'No categories found. Create your first category!') : t('admin.content_no_categories_match', 'No categories match your search criteria.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredCategories && filteredCategories.length > 0 ? filteredCategories.map((category) => (
              <Card key={`category-mobile-${category.id}-${displayLocale}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      {getImageUrl(category.image) ? (
                        <img src={getImageUrl(category.image)!} alt={category.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Folder className="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1 line-clamp-1">{getCategoryName(category)}</h3>
                      {getCategoryDescription(category) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{getCategoryDescription(category)}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(category.created_at)}
                        </span>
                        <span>{t('admin.content_table_sort_order', 'Sort Order')}: {category.sort_order || 0}</span>
                        <span>{t('admin.content_table_series', 'Series')}: {series.filter(s => s.category_id === category.id).length || 0}</span>
                        {(category as any).is_homepage_featured && (
                          <Badge variant="default" className="bg-primary text-white text-xs">
                            Homepage
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('admin.content_actions', 'Actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('admin.content_edit', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleCategoryHomepageFeatured(category.id!)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        {(category as any).is_homepage_featured 
                          ? 'Remove from Homepage' 
                          : 'Set as Homepage Featured'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCategory(category.id!)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('admin.content_delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            )) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {categories.length === 0 ? t('admin.content_no_categories', 'No categories found. Create your first category!') : t('admin.content_no_categories_match', 'No categories match your search criteria.')}
                </p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Series Tab */}
      {activeTab === 'series' && (
        <>
          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t('admin.content_table_series', 'Series')}</TableHead>
                    <TableHead className="w-[150px]">{t('admin.content_table_category', 'Category')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_episodes')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_duration')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_visibility')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_status')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_homepage', 'Homepage')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_created')}</TableHead>
                    <TableHead className="w-[70px]">{t('admin.content_table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody key={`series-${displayLocale}`}>
                  {filteredSeries && filteredSeries.length > 0 ? filteredSeries.map((serie) => (
                    <TableRow key={`series-${serie.id}-${displayLocale}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <Folder className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{getSeriesTitle(serie) || 'Series'}</div>
                            <div className="text-sm text-muted-foreground truncate">{getSeriesDescription(serie)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {serie.category_id ? (() => {
                            const category = categories.find(c => c.id === serie.category_id);
                            return category ? getCategoryName(category) : `Category #${serie.category_id}`;
                          })() : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{serie.video_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {serie.total_duration ? (() => {
                            const hours = Math.floor(serie.total_duration / 3600);
                            const minutes = Math.floor((serie.total_duration % 3600) / 60);
                            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                          })() : '0m'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getVisibilityBadge(serie.visibility)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(serie.status)}
                      </TableCell>
                      <TableCell>
                        {(serie as any)?.is_homepage_featured ? (
                          <Badge variant="default" className="bg-primary text-white">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatDate(serie.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-popover border-border shadow-lg">
                            <DropdownMenuLabel className="font-semibold px-3 py-2">{t('admin.common_actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleEditSeries(serie)}
                        className="px-3 py-2 cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Series
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleAddEpisodeToSeries(serie.id)}
                        className="px-3 py-2 cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Episode
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleHomepageFeatured(serie.id)}
                        className="px-3 py-2 cursor-pointer"
                      >
                        {(serie as any)?.is_homepage_featured ? (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Remove from Homepage
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Set as Homepage Featured
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleSeriesStatus(serie.id)}
                        className="px-3 py-2 cursor-pointer"
                      >
                              {serie.status === 'published' ? (
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
                            <DropdownMenuItem 
                              onClick={() => handleDeleteSeries(serie.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 px-3 py-2 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Series
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {series.length === 0 ? 'No series found. Create your first series!' : 'No series match your search criteria.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredSeries && filteredSeries.length > 0 ? filteredSeries.map((serie) => (
              <Card key={`series-mobile-${serie.id}-${displayLocale}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Folder className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1 line-clamp-1">{getSeriesTitle(serie) || 'Series'}</h3>
                      <p className="text-sm text-muted-foreground mb-1 line-clamp-1">
                        {t('admin.content_table_category', 'Category')}: {serie.category_id ? (() => {
                          const category = categories.find(c => c.id === serie.category_id);
                          return category ? getCategoryName(category) : `Category #${serie.category_id}`;
                        })() : '-'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex items-center text-sm bg-muted px-2 py-1 rounded">
                          <VideoIcon className="h-3 w-3 mr-1" />
                          {serie.video_count} episodes
                        </div>
                        <div className="flex items-center text-sm bg-muted px-2 py-1 rounded">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.floor(serie.total_duration / 60)}m
                        </div>
                        {getVisibilityBadge(serie.visibility)}
                        {getStatusBadge(serie.status)}
                        {(serie as any)?.is_homepage_featured && (
                          <Badge variant="default" className="bg-primary text-white">
                            <Star className="h-3 w-3 mr-1" />
                            Homepage
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created {formatDate(serie.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover border-border shadow-lg">
                      <DropdownMenuLabel className="font-semibold px-3 py-2">Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleEditSeries(serie)}
                              className="px-3 py-2 cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Series
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAddEpisodeToSeries(serie.id)}
                              className="px-3 py-2 cursor-pointer"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Episode
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleToggleHomepageFeatured(serie.id)}
                              className="px-3 py-2 cursor-pointer"
                            >
                              {(serie as any)?.is_homepage_featured ? (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  Remove from Homepage
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  Set as Homepage Featured
                                </>
                              )}
                            </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleSeriesStatus(serie.id)}
                        className="px-3 py-2 cursor-pointer"
                      >
                        {serie.status === 'published' ? (
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
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSeries(serie.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 px-3 py-2 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Series
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            )) : (
              <Card className="p-8 text-center">
                <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {series.length === 0 ? 'No series found. Create your first series!' : 'No series match your search criteria.'}
                </p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <>
          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">{t('admin.content_table_episode')}</TableHead>
                    <TableHead className="w-[150px]">{t('admin.content_table_category', 'Category')}</TableHead>
                    <TableHead className="w-[150px]">{t('admin.content_table_series')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_duration')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.content_table_views')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_visibility')}</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_status')}</TableHead>
                    <TableHead className="w-[100px]">Featured</TableHead>
                    <TableHead className="w-[120px]">{t('admin.content_table_uploaded')}</TableHead>
                    <TableHead className="w-[70px]">{t('admin.content_table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody key={`videos-${displayLocale}`}>
                  {filteredVideos && filteredVideos.length > 0 ? filteredVideos.map((video) => (
                    <TableRow key={`video-${video.id}-${displayLocale}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <VideoIcon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{getVideoTitle(video)}</div>
                            {video.duration && video.duration > 0 ? (
                              <div className="text-sm text-muted-foreground">
                                {Math.floor(video.duration / 60) > 0 
                                  ? `${Math.floor(video.duration / 60)}m ${video.duration % 60}s`
                                  : `${video.duration}s`}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">No duration</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block">
                          {getVideoCategoryName(video)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block">
                          {series.find(s => s.id === video.series_id) ? getSeriesTitle(series.find(s => s.id === video.series_id)!) : `Series #${video.series_id}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {video.duration && video.duration > 0 
                            ? (Math.floor(video.duration / 60) > 0 
                                ? `${Math.floor(video.duration / 60)}m ${video.duration % 60}s`
                                : `${video.duration}s`)
                            : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm font-medium">
                          <TrendingUp className="h-4 w-4 mr-1 text-muted-foreground" />
                          {(video.views || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getVisibilityBadge(video.visibility)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(video.status)}
                      </TableCell>
                      <TableCell>
                        {((video as any).is_featured_process === true || (video as any).is_featured_process === 1) ? (
                          <Badge variant="default" className="bg-primary text-white">
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatDate(video.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('admin.content_actions', 'Actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditVideo(video)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('admin.content_edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleFeaturedProcess(video.id)}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              {!!(video as any).is_featured_process 
                                ? 'Remove from Featured Process' 
                                : 'Add to Featured Process'}
                            </DropdownMenuItem>
                            {video.bunny_embed_url && (!video.duration || video.duration === 0) && (
                            <DropdownMenuItem 
                                onClick={() => fetchAndUpdateVideoDuration(video)}
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                Fetch Duration
                            </DropdownMenuItem>
                              )}
                            {video.bunny_video_id && (
                              <DropdownMenuItem 
                                onClick={() => handleProcessTranscription(video.id)}
                                disabled={processingTranscription[video.id]}
                              >
                                {processingTranscription[video.id] ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Subtitles className="mr-2 h-4 w-4" />
                                )}
                                Process Captions (AI)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVideo(video.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('admin.content_delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {videos.length === 0 ? 'No videos found. Create your first video!' : 'No videos match your search criteria.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredVideos && filteredVideos.length > 0 ? filteredVideos.map((video) => (
              <Card key={`video-mobile-${video.id}-${displayLocale}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <VideoIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1 line-clamp-1">{getVideoTitle(video)}</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Category: {getVideoCategoryName(video)}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Series: {series.find(s => s.id === video.series_id) ? getSeriesTitle(series.find(s => s.id === video.series_id)!) : `Series #${video.series_id}`}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex items-center text-sm bg-muted px-2 py-1 rounded">
                          <Clock className="h-3 w-3 mr-1" />
                          {video.duration && video.duration > 0 
                            ? (Math.floor(video.duration / 60) > 0 
                                ? `${Math.floor(video.duration / 60)}m ${video.duration % 60}s`
                                : `${video.duration}s`)
                            : 'N/A'}
                        </div>
                        <div className="flex items-center text-sm bg-muted px-2 py-1 rounded">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {(video.views || 0).toLocaleString()} views
                        </div>
                        {getVisibilityBadge(video.visibility)}
                        {getStatusBadge(video.status)}
                        {!!(video as any).is_featured_process && (
                          <Badge variant="default" className="bg-primary text-white">
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        Uploaded {formatDate(video.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('admin.content_actions', 'Actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditVideo(video)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('admin.content_edit', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleFeaturedProcess(video.id)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        {!!(video as any).is_featured_process 
                          ? 'Remove from Featured Process' 
                          : 'Add to Featured Process'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteVideo(video.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('admin.content_delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            )) : (
              <Card className="p-8 text-center">
                <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {videos.length === 0 ? 'No videos found. Create your first video!' : 'No videos match your search criteria.'}
                </p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_categories', 'Total de Categorías')}</p>
              <p className="text-2xl font-bold">{categories?.length || 0}</p>
            </div>
            <Folder className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_series')}</p>
              <p className="text-2xl font-bold">{series?.length || 0}</p>
            </div>
            <Folder className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_episodes')}</p>
              <p className="text-2xl font-bold">{videos?.length || 0}</p>
            </div>
            <VideoIcon className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_views')}</p>
              <p className="text-2xl font-bold">{videos?.reduce((sum, video) => sum + (video?.views || 0), 0).toLocaleString() || '0'}</p>
            </div>
            <Eye className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_likes', 'Total Likes')}</p>
              <p className="text-2xl font-bold">{videos?.reduce((sum, video) => sum + (video?.likes_count || 0), 0).toLocaleString() || '0'}</p>
            </div>
            <ThumbsUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_total_dislikes', 'Total Dislikes')}</p>
              <p className="text-2xl font-bold">{videos?.reduce((sum, video) => sum + (video?.dislikes_count || 0), 0).toLocaleString() || '0'}</p>
            </div>
            <ThumbsDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.content_published_count')}</p>
              <p className="text-2xl font-bold">{videos?.filter(v => v?.status === 'published').length || 0}</p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) {
          setSelectedCategory(null);
          // Reset multilingual data when closing
          setCategoryMultilingual({
            name: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCategory?.id ? t('admin.content_edit_category', 'Edit Category') : t('admin.content_create_category', 'Create Category')}</DialogTitle>
            <DialogDescription>
              {selectedCategory?.id ? t('admin.content_edit_category_desc', 'Make changes to the category here.') : t('admin.content_create_category_desc', 'Fill in the details to create a new category.')}
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs */}
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
                className="mb-4"
              />
              
              {/* Name - Multilingual */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryName" className="text-right">
                  {t('admin.content_label_name', 'Name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="categoryName"
                  value={categoryMultilingual.name[contentLocale]}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    name: { ...categoryMultilingual.name, [contentLocale]: e.target.value }
                  })}
                  className="col-span-3"
                  placeholder={`Enter category name in ${contentLocale.toUpperCase()}`}
                />
              </div>
              
              {/* Description - Multilingual */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="categoryDescription" className="text-right pt-2">
                  {t('admin.content_label_description', 'Description')}
                </Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryMultilingual.description[contentLocale]}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    description: { ...categoryMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  className="col-span-3"
                  placeholder={`Enter category description in ${contentLocale.toUpperCase()}`}
                  rows={4}
                />
              </div>
              
              {/* Color */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryColor" className="text-right">
                  {t('admin.content_label_color', 'Color')}
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="categoryColor"
                    type="color"
                    value={selectedCategory.color || '#000000'}
                    onChange={(e) => setSelectedCategory({...selectedCategory, color: e.target.value})}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={selectedCategory.color || ''}
                    onChange={(e) => setSelectedCategory({...selectedCategory, color: e.target.value})}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
              
              {/* Icon */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryIcon" className="text-right">
                  {t('admin.content_label_icon', 'Icon')}
                </Label>
                <Input
                  id="categoryIcon"
                  value={selectedCategory.icon || ''}
                  onChange={(e) => setSelectedCategory({...selectedCategory, icon: e.target.value})}
                  className="col-span-3"
                  placeholder={t('admin.content_category_icon_placeholder', 'Icon name or class')}
                />
              </div>
              
              {/* Image Upload */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryImage" className="text-right">
                  {t('admin.content_label_image', 'Image')}
                </Label>
                <div className="col-span-3 space-y-2">
                  <FileUpload
                    type="image"
                    accept="image/*"
                    onFileSelect={(file) => {
                      if (file) {
                        setSelectedCategory({...selectedCategory, image: { file } as any});
                      } else {
                        setSelectedCategory({...selectedCategory, image: null});
                      }
                    }}
                    label={t('admin.content_upload_image', 'Upload Image')}
                    currentFile={typeof selectedCategory.image === 'string' ? getImageUrl(selectedCategory.image) : null}
                  />
                  {selectedCategory.image && typeof selectedCategory.image === 'string' && getImageUrl(selectedCategory.image) && (
                    <div className="mt-2">
                      <img src={getImageUrl(selectedCategory.image)!} alt={selectedCategory.name} className="w-32 h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort Order */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categorySortOrder" className="text-right">
                  {t('admin.content_label_sort_order', 'Sort Order')}
                </Label>
                <Input
                  id="categorySortOrder"
                  type="number"
                  value={selectedCategory.sort_order || 0}
                  onChange={(e) => setSelectedCategory({...selectedCategory, sort_order: parseInt(e.target.value) || 0})}
                  className="col-span-3"
                  min="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} disabled={isSubmitting}>
              {t('admin.common_cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSubmitting}>
              {isSubmitting ? t('admin.common_saving', 'Saving...') : (selectedCategory?.id ? t('admin.common_save_changes', 'Save Changes') : t('admin.common_create', 'Create Category'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Series Dialog */}
      <Dialog open={isSeriesDialogOpen} onOpenChange={(open) => {
        setIsSeriesDialogOpen(open);
        if (!open) {
          setSelectedSeries(null);
          // Reset multilingual data when closing
          setSeriesMultilingual({
            title: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
            short_description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSeries?.id ? t('admin.content_edit_series') : t('admin.content_create_series')}</DialogTitle>
            <DialogDescription>
              {selectedSeries?.id ? t('admin.content_edit_series_desc') : t('admin.content_create_series_desc')} {t('admin.content_series_save_desc')}
            </DialogDescription>
          </DialogHeader>
          {selectedSeries && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs */}
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
                className="mb-4"
              />
              
              {/* Title - Multilingual */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  {t('admin.content_label_title')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={seriesMultilingual.title[contentLocale]}
                  onChange={(e) => setSeriesMultilingual({
                    ...seriesMultilingual,
                    title: { ...seriesMultilingual.title, [contentLocale]: e.target.value }
                  })}
                  className="col-span-3"
                  placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
                />
              </div>
              
              {/* Description - Multilingual */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  {t('admin.content_label_description')}
                </Label>
                <Textarea
                  id="description"
                  value={seriesMultilingual.description[contentLocale]}
                  onChange={(e) => setSeriesMultilingual({
                    ...seriesMultilingual,
                    description: { ...seriesMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  className="col-span-3"
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={4}
                />
              </div>
              
              {/* Short Description - Multilingual */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="short_description" className="text-right pt-2">
                  Short Description
                </Label>
                <Textarea
                  id="short_description"
                  value={seriesMultilingual.short_description[contentLocale]}
                  onChange={(e) => setSeriesMultilingual({
                    ...seriesMultilingual,
                    short_description: { ...seriesMultilingual.short_description, [contentLocale]: e.target.value }
                  })}
                  className="col-span-3"
                  placeholder={`Enter short description in ${contentLocale.toUpperCase()}`}
                  rows={2}
                />
              </div>
              {/* Category Selection - Required */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  {t('admin.content_label_category', 'Category')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedSeries.category_id?.toString() || ''}
                  onValueChange={(value) => setSelectedSeries({...selectedSeries, category_id: parseInt(value)})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t('admin.content_select_category', 'Select a category')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {categories.length === 0 ? (
                      <SelectItem value="" disabled>
                        {t('admin.content_no_categories_available', 'No categories available. Please create a category first.')}
                      </SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()} className="focus:bg-accent">
                          {getCategoryName(category)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="visibility" className="text-right">
                  {t('admin.content_label_visibility')}
                </Label>
                <Select
                  value={selectedSeries.visibility || 'freemium'}
                  onValueChange={(value) => setSelectedSeries({...selectedSeries, visibility: value as 'freemium' | 'basic' | 'premium'})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="freemium" className="focus:bg-accent">Freemium</SelectItem>
                    <SelectItem value="basic" className="focus:bg-accent">Basic</SelectItem>
                    <SelectItem value="premium" className="focus:bg-accent">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  {t('admin.content_label_status')}
                </Label>
                <Select
                  value={selectedSeries.status || 'draft'}
                  onValueChange={(value) => setSelectedSeries({...selectedSeries, status: value as 'draft' | 'published' | 'archived'})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="draft" className="focus:bg-accent">Draft</SelectItem>
                    <SelectItem value="published" className="focus:bg-accent">Published</SelectItem>
                    <SelectItem value="archived" className="focus:bg-accent">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="thumbnail" className="text-right">
                  Thumbnail URL (Bunny.net)
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="thumbnail"
                    value={(selectedSeries as any)?.thumbnail || ''}
                    onChange={(e) => setSelectedSeries({...selectedSeries, thumbnail: e.target.value} as Series)}
                    placeholder="https://vz-xxx.b-cdn.net/thumbnail.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the Bunny.net thumbnail URL from your dashboard.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="coverImage" className="text-right">
                  Cover Image URL (Bunny.net)
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="coverImage"
                    value={(selectedSeries as any)?.cover_image || ''}
                    onChange={(e) => setSelectedSeries({...selectedSeries, cover_image: e.target.value} as Series)}
                    placeholder="https://vz-xxx.b-cdn.net/cover.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the Bunny.net cover image URL from your dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSeriesDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveSeries} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedSeries?.id ? 'Save Changes' : 'Create Series')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={(open) => {
        setIsVideoDialogOpen(open);
        if (!open) {
          setSelectedVideo(null);
          // Reset multilingual data when closing
          setVideoMultilingual({
            title: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
            short_description: { en: '', es: '', pt: '' },
            intro_description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.id ? 'Edit Episode' : 'Add New Episode'}</DialogTitle>
            <DialogDescription>
              {selectedVideo?.id ? 'Make changes to the episode here.' : 'Fill in the details to create a new episode.'} Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs */}
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
                className="mb-4"
              />
              
              {/* Two Column Layout: Left - Text Fields, Right - Images */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Text Inputs */}
                <div className="space-y-4">
                  {/* Title - Multilingual */}
                  <div className="space-y-2">
                    <Label htmlFor="videoTitle">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="videoTitle"
                      value={videoMultilingual.title[contentLocale]}
                      onChange={(e) => setVideoMultilingual({
                        ...videoMultilingual,
                        title: { ...videoMultilingual.title, [contentLocale]: e.target.value }
                      })}
                      placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
                    />
                  </div>
                  
                  {/* Description - Multilingual */}
                  <div className="space-y-2">
                    <Label htmlFor="videoDescription">Description</Label>
                    <Textarea
                      id="videoDescription"
                      value={videoMultilingual.description[contentLocale]}
                      onChange={(e) => setVideoMultilingual({
                        ...videoMultilingual,
                        description: { ...videoMultilingual.description, [contentLocale]: e.target.value }
                      })}
                      placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                      rows={4}
                    />
                  </div>
                  
                  {/* Short Description - Multilingual */}
                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short Description</Label>
                    <Textarea
                      id="shortDescription"
                      value={videoMultilingual.short_description[contentLocale] || ''}
                      onChange={(e) => setVideoMultilingual({
                        ...videoMultilingual,
                        short_description: { ...videoMultilingual.short_description, [contentLocale]: e.target.value }
                      })}
                      placeholder={`Enter short description in ${contentLocale.toUpperCase()}`}
                      rows={2}
                    />
                  </div>
                  
                  {/* Intro Description - Multilingual */}
                  <div className="space-y-2">
                    <Label htmlFor="introDescription">Intro Description</Label>
                    <Textarea
                      id="introDescription"
                      value={videoMultilingual.intro_description[contentLocale] || ''}
                      onChange={(e) => setVideoMultilingual({
                        ...videoMultilingual,
                        intro_description: { ...videoMultilingual.intro_description, [contentLocale]: e.target.value }
                      })}
                      placeholder={`Enter intro description in ${contentLocale.toUpperCase()}`}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Right Column: Image Previews and URLs */}
                <div className="space-y-4">
                  {/* Intro Image */}
                  <div className="space-y-2">
                    <Label htmlFor="introImage">Intro Image URL (Bunny.net)</Label>
                    <Input
                      id="introImage"
                      value={selectedVideo.intro_image || ''}
                      onChange={(e) => setSelectedVideo({...selectedVideo, intro_image: e.target.value})}
                      placeholder="https://vz-xxx.b-cdn.net/intro.jpg"
                      disabled={isSubmitting}
                    />
                    {selectedVideo.intro_image && (
                      <div className="mt-2 border rounded-lg overflow-hidden bg-muted/50">
                        <img 
                          src={selectedVideo.intro_image} 
                          alt="Intro preview" 
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Paste the Bunny.net intro image URL from your dashboard.
                    </p>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail URL (Bunny.net)</Label>
                    <Input
                      id="thumbnail"
                      value={selectedVideo.thumbnail || selectedVideo.bunny_thumbnail_url || ''}
                      onChange={(e) => setSelectedVideo({
                        ...selectedVideo,
                        thumbnail: e.target.value,
                        bunny_thumbnail_url: e.target.value
                      })}
                      placeholder="https://vz-xxx.b-cdn.net/thumbnail.jpg"
                      disabled={isSubmitting}
                    />
                    {(selectedVideo.thumbnail || selectedVideo.bunny_thumbnail_url) && (
                      <div className="mt-2 border rounded-lg overflow-hidden bg-muted/50">
                        <img 
                          src={selectedVideo.thumbnail || selectedVideo.bunny_thumbnail_url || ''} 
                          alt="Thumbnail preview" 
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Paste the Bunny.net thumbnail URL from your dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bunny.net Video Settings */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Bunny.net Video Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bunnyEmbedUrl">
                      Bunny Embed URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bunnyEmbedUrl"
                      value={selectedVideo.bunny_embed_url || ''}
                      onChange={(e) => {
                        setSelectedVideo({
                        ...selectedVideo,
                        bunny_embed_url: e.target.value,
                        });
                      }}
                      onBlur={() => {
                        if (selectedVideo.bunny_embed_url || selectedVideo.bunny_video_id) {
                          fetchBunnyVideoMetadata(selectedVideo.bunny_embed_url || undefined, selectedVideo.bunny_video_id || undefined);
                        }
                      }}
                      placeholder="https://iframe.mediadelivery.net/embed/{library}/{video}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the Bunny.net embed URL from your Bunny dashboard.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunnyVideoId">Bunny Video ID (optional)</Label>
                    <Input
                      id="bunnyVideoId"
                      value={selectedVideo.bunny_video_id || ''}
                      onChange={(e) => {
                        const videoId = e.target.value;
                        setSelectedVideo({
                      ...selectedVideo,
                          bunny_video_id: videoId,
                        });
                        // Fetch metadata if video ID is provided
                        if (videoId) {
                          setTimeout(() => {
                            fetchBunnyVideoMetadata(selectedVideo.bunny_embed_url || undefined, videoId);
                          }, 1000);
                        }
                      }}
                      onBlur={() => {
                        if (selectedVideo.bunny_video_id || selectedVideo.bunny_embed_url) {
                          fetchBunnyVideoMetadata(selectedVideo.bunny_embed_url || undefined, selectedVideo.bunny_video_id || undefined);
                        }
                      }}
                      placeholder="Video GUID from Bunny (optional)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Video ID will be auto-extracted from embed URL.
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Settings */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Video Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoSeries">
                      Series <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedVideo.series_id?.toString() || ''}
                      onValueChange={(value) => {
                        const seriesId = parseInt(value);
                        const selectedSeries = series.find(s => s.id === seriesId);
                        setSelectedVideo({
                          ...selectedVideo,
                          series_id: seriesId,
                          category_id: selectedSeries?.category_id || null // Update category_id from selected series
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.content_label_select_series', 'Select a series')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {series.length === 0 ? (
                          <SelectItem value="" disabled>
                            {t('admin.content_no_series_available', 'No series available. Please create a series first.')}
                          </SelectItem>
                        ) : (
                          series.map((serie) => (
                            <SelectItem key={serie.id} value={serie.id.toString()} className="focus:bg-accent">
                              <div className="flex flex-col">
                                <span className="font-medium">{getSeriesTitle(serie)}</span>
                                {getSeriesDescription(serie) && (
                                  <span className="text-sm text-muted-foreground line-clamp-1">{getSeriesDescription(serie)}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="videoVisibility">Visibility</Label>
                    <Select
                      value={selectedVideo.visibility}
                      onValueChange={(value) => setSelectedVideo({...selectedVideo, visibility: value as 'freemium' | 'basic' | 'premium'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="freemium" className="focus:bg-accent">Freemium</SelectItem>
                        <SelectItem value="basic" className="focus:bg-accent">Basic</SelectItem>
                        <SelectItem value="premium" className="focus:bg-accent">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="videoStatus">Status</Label>
                    <Select
                      value={selectedVideo.status}
                      onValueChange={(value) => setSelectedVideo({...selectedVideo, status: value as 'draft' | 'published' | 'archived'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="draft" className="focus:bg-accent">Draft</SelectItem>
                        <SelectItem value="published" className="focus:bg-accent">Published</SelectItem>
                        <SelectItem value="archived" className="focus:bg-accent">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Duration display (read-only, auto-calculated) */}
                {selectedVideo.duration && selectedVideo.duration > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {Math.floor(selectedVideo.duration / 60)}m {selectedVideo.duration % 60}s
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">(Auto-calculated from Bunny.net)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo} disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? 'Saving...' : (selectedVideo?.id ? 'Save Changes' : 'Create Episode')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;