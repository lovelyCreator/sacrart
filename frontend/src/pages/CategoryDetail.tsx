import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { categoryApi, videoApi, seriesApi, Category } from '@/services/videoApi';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import { Play } from 'lucide-react';

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getPathWithLocale, locale } = useLocale();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [filters, setFilters] = useState<string[]>([]);
  
  // Helper to get series title with multilingual support
  const getSeriesTitle = (serie: any): string => {
    // Check if series has translations object
    if (serie.translations && serie.translations.title) {
      const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
      return serie.translations.title[localeKey] || serie.translations.title.en || serie.title || '';
    }
    
    // Check for direct multilingual columns
    const localeKey = locale.substring(0, 2);
    const titleKey = `title_${localeKey}`;
    if (serie[titleKey]) {
      return serie[titleKey];
    }
    
    // Fallback to main title field
    return serie.title || '';
  };
  
  // Helper to get series description with multilingual support
  const getSeriesDescription = (serie: any): string => {
    // Check if series has translations object
    if (serie.translations && serie.translations.description) {
      const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
      return serie.translations.description[localeKey] || serie.translations.description.en || serie.description || '';
    }
    
    // Check for direct multilingual columns
    const localeKey = locale.substring(0, 2);
    const descKey = `description_${localeKey}`;
    if (serie[descKey]) {
      return serie[descKey];
    }
    
    // Fallback to main description field
    return serie.description || '';
  };
  
  // Helper to get category name with multilingual support
  const getCategoryName = (cat: Category | any): string => {
    // Check if category has translations object
    if ((cat as any).translations && (cat as any).translations.name) {
      const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
      return (cat as any).translations.name[localeKey] || (cat as any).translations.name.en || cat.name || '';
    }
    
    // Check for direct multilingual columns
    const localeKey = locale.substring(0, 2);
    const nameKey = `name_${localeKey}`;
    if ((cat as any)[nameKey]) {
      return (cat as any)[nameKey];
    }
    
    // Fallback to main name field
    return cat.name || '';
  };

  // Helper to get image URL
  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // Fetch category and series data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch category
        const categoryResponse = await categoryApi.getPublic(locale);
        let categories: Category[] = [];
        if (categoryResponse && categoryResponse.data) {
          if (Array.isArray(categoryResponse.data)) {
            categories = categoryResponse.data;
          } else if (categoryResponse.data && typeof categoryResponse.data === 'object' && 'data' in categoryResponse.data) {
            const nestedData = (categoryResponse.data as any).data;
            categories = Array.isArray(nestedData) ? nestedData : [];
          }
        }
        const foundCategory = categories.find((c: Category) => c.id === parseInt(id));
        
        if (foundCategory) {
          setCategory(foundCategory);
          
          // Extract filters from category description or use default filters
          // For now, using static filters as shown in code.html
          setFilters(['all', 'cristos', 'virgenes', 'imaginería-menor', 'bloque', 'talla-de-cuerpos', 'manos-y-pies']);
        }
        
        // Fetch series for this category
        try {
          // Fetch series directly for this category
          // Note: We filter by status='published' for public view, but you can remove this to see all series
          const seriesResponse = await seriesApi.getPublic({
            category_id: parseInt(id),
            per_page: 100
            // Removed status filter to see all series - backend will filter by 'published' for public requests
          });
          
          // Check if there's pagination info
          let seriesData: any[] = [];
          let hasMoreData = false;
          
          if (seriesResponse && seriesResponse.success) {
            const responseData = seriesResponse.data;
            
            if (responseData) {
              // Handle paginated response (Laravel pagination)
              // Structure: { data: [...], current_page, last_page, per_page, total, ... }
              if (responseData.data && Array.isArray(responseData.data)) {
                // Paginated response: { data: { data: [...], current_page, last_page, ... } }
                seriesData = responseData.data;
                const paginationInfo = responseData;
                hasMoreData = paginationInfo?.last_page 
                  ? (paginationInfo.current_page || 1) < paginationInfo.last_page 
                  : false;
              } else if (Array.isArray(responseData)) {
                // Direct array response (shouldn't happen with pagination, but handle it)
                seriesData = responseData;
                hasMoreData = false;
              }
            }
          }
          
          // Debug logging
          console.log('=== Category Detail Debug ===');
          console.log('Category ID:', id);
          console.log('Series API Response:', seriesResponse);
          console.log('Response Data:', seriesResponse?.data);
          console.log('Response Data Type:', typeof seriesResponse?.data);
          console.log('Is Array:', Array.isArray(seriesResponse?.data));
          console.log('Has Nested Data:', !!(seriesResponse?.data as any)?.data);
          console.log('Nested Data Type:', typeof (seriesResponse?.data as any)?.data);
          console.log('Nested Data Is Array:', Array.isArray((seriesResponse?.data as any)?.data));
          console.log('Extracted Series Count:', seriesData.length);
          console.log('Extracted Series Data:', seriesData);
          
          if (seriesData.length === 0) {
            console.warn('⚠️ No series found!');
            console.warn('Full API Response:', JSON.stringify(seriesResponse, null, 2));
            if (seriesResponse?.success) {
              console.warn('API call was successful but no series in response. Check:');
              console.warn('1. Are series in the database for category_id =', id, '?');
              console.warn('2. Do series have status = "published"? (Backend filters by published for public requests)');
              console.warn('3. Is the response structure correct?');
            }
          } else {
            console.log('✅ Found', seriesData.length, 'series');
          }
          
          setHasMore(hasMoreData);
          
          // Sort series by sort_order or creation date (newest first)
          const sortedSeries = seriesData.sort((a, b) => {
            // First sort by sort_order if available
            if (a.sort_order !== undefined && b.sort_order !== undefined) {
              return (a.sort_order || 0) - (b.sort_order || 0);
            }
            // Then by creation date (newest first)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          setSeries(sortedSeries);
        } catch (error) {
          console.error('Error fetching series:', error);
          setSeries([]);
        }
      } catch (error) {
        console.error('Error fetching category data:', error);
        setCategory(null);
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, locale]);

  const handleSeriesClick = (seriesId: number) => {
    // Navigate to series detail page
    navigate(getPathWithLocale(`/series/${seriesId}`));
  };

  const formatEpisodeCount = (count: number | undefined): string => {
    if (!count || count === 0) return '0 Capítulos';
    return `${count} ${count === 1 ? 'Capítulo' : 'Capítulos'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center font-display">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            {t('common.loading', 'Cargando...')}
          </span>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center font-display">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('category.not_found', 'Categoría no encontrada')}</h2>
          <Button onClick={() => navigate(getPathWithLocale('/'))}>
            {t('common.home', 'Volver al inicio')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-24 sm:pt-28 md:pt-32 min-h-screen pb-12 bg-[#0f0f0f] font-display">
      {/* Category Header Section */}
      <section className="container mx-auto px-6 md:px-12 mb-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-primary uppercase mb-1">
            <span className="w-4 h-[1px] bg-primary/70"></span>
            <span>{t('category.main_category', 'Categoría Principal')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-2 tracking-tight leading-[1.1]">
            {getCategoryName(category)}
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed font-normal">
            {(() => {
              // Check if category has translations object
              if ((category as any).translations && (category as any).translations.description) {
                const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
                return (category as any).translations.description[localeKey] || (category as any).translations.description.en || category.description || '';
              }
              
              // Check for direct multilingual columns
              const localeKey = locale.substring(0, 2);
              const descKey = `description_${localeKey}`;
              if ((category as any)[descKey]) {
                return (category as any)[descKey];
              }
              
              // Fallback to main description field
              return category.description || category.short_description || t('category.default_description', 'Descubre los secretos ancestrales del arte sacro. Sumérgete en colecciones exclusivas de maestros artesanos.');
            })()}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mt-8 flex flex-wrap gap-2 items-center">
          {filters.map((filter) => {
            const isActive = selectedFilter === filter;
            const filterLabel = filter === 'all' 
              ? t('category.filter.all', 'Todo')
              : filter === 'cristos'
              ? t('category.filter.cristos', 'Cristos')
              : filter === 'virgenes'
              ? t('category.filter.virgenes', 'Vírgenes')
              : filter === 'imaginería-menor'
              ? t('category.filter.imaginería_menor', 'Imaginería Menor')
              : filter === 'bloque'
              ? t('category.filter.bloque', 'Bloque')
              : filter === 'talla-de-cuerpos'
              ? t('category.filter.talla_cuerpos', 'Talla de Cuerpos')
              : filter === 'manos-y-pies'
              ? t('category.filter.manos_pies', 'Manos y Pies')
              : filter;
            
            return (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/10 transition-transform hover:scale-105'
                    : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {filterLabel}
              </button>
            );
          })}
        </div>
      </section>

      {/* Series Grid Section */}
      <section className="container mx-auto px-6 md:px-12">
        {series.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
            {series.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSeriesClick(item.id)}
                className="group relative cursor-pointer"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-[4px] relative bg-[#18181b] shadow-2xl transition-all duration-300">
                  <img
                    alt={getSeriesTitle(item) || 'Series thumbnail'}
                    src={getImageUrl(item.thumbnail || item.cover_image || item.thumbnail_url || '')}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
                    }}
                  />
                  {/* Badge - Show "Nuevo" for recently created items */}
                  {item.created_at && new Date(item.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                    <div className="absolute top-2 left-2 bg-primary px-1.5 py-0.5 rounded-[2px] text-[9px] font-extrabold text-white uppercase tracking-wider shadow-md">
                      {t('category.new', 'Nuevo')}
                    </div>
                  )}
                  {/* Play Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <i className="fa-solid fa-play text-white text-3xl ml-1"></i>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-[15px] text-white group-hover:text-primary transition-colors leading-tight tracking-tight line-clamp-2">
                    {getSeriesTitle(item) || t('category.untitled', 'Sin título')}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1.5 font-medium tracking-wide uppercase">
                    {formatEpisodeCount(item.video_count || item.videos_count || 0)} 
                    {item.instructor && (
                      <>
                        <span className="mx-1 text-gray-700">•</span>
                        {typeof item.instructor === 'string' ? item.instructor : item.instructor?.name || ''}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">{t('category.no_series', 'No hay series disponibles en esta categoría')}</p>
          </div>
        )}

        {/* Loading More Indicator - Only show when loading more content */}
        {loadingMore && hasMore && series.length > 0 && (
          <div className="flex flex-col items-center justify-center mt-24 mb-10 gap-4">
            <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              {t('category.loading_more', 'Cargando más series...')}
            </span>
          </div>
        )}
      </section>
    </main>
  );
};

export default CategoryDetail;

