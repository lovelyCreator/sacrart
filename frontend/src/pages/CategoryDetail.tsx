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

  // Helper to get image URL
  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
        
        // Fetch videos/series for this category
        try {
          // Fetch videos for this category (videos are grouped by series)
          const videosResponse = await videoApi.getPublic({
            category_id: parseInt(id),
            per_page: 100,
            status: 'published'
          });
          
          // Check if there's pagination info
          let videosData: any[] = [];
          let hasMoreData = false;
          
          if (Array.isArray(videosResponse.data)) {
            videosData = videosResponse.data;
            hasMoreData = false; // If it's a simple array, no pagination
          } else if (videosResponse.data?.data) {
            videosData = Array.isArray(videosResponse.data.data) ? videosResponse.data.data : [];
            // Check pagination info
            const paginationInfo = videosResponse.data;
            hasMoreData = paginationInfo?.last_page 
              ? (paginationInfo.current_page || 1) < paginationInfo.last_page 
              : false;
          }
          
          setHasMore(hasMoreData);
          
          // Group videos by series_id to create series cards
          const seriesMap = new Map<number, any>();
          
          videosData.forEach((video: any) => {
            const seriesId = video.series_id || video.id; // Use series_id if available, otherwise use video id
            
            if (!seriesMap.has(seriesId)) {
              seriesMap.set(seriesId, {
                id: seriesId,
                title: video.series_title || video.title,
                description: video.description,
                thumbnail_url: video.thumbnail_url || video.intro_image_url,
                cover_image: video.cover_image || video.intro_image,
                episode_count: 0,
                videos_count: 0,
                instructor: video.instructor,
                created_at: video.created_at,
                videos: []
              });
            }
            
            const series = seriesMap.get(seriesId)!;
            series.episode_count += 1;
            series.videos_count += 1;
            series.videos.push(video);
          });
          
          // Convert map to array and sort by creation date (newest first)
          const seriesArray = Array.from(seriesMap.values()).sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          setSeries(seriesArray);
        } catch (error) {
          console.error('Error fetching videos:', error);
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
    <main className="pt-24 sm:pt-28 md:pt-32 min-h-screen pb-12 bg-[#0f0f0f]">
      {/* Category Header Section */}
      <section className="container mx-auto px-6 md:px-12 mb-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-primary uppercase mb-1">
            <span className="w-4 h-[1px] bg-primary/70"></span>
            <span>{t('category.main_category', 'Categoría Principal')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-2 tracking-tight leading-[1.1]">
            {category.name}
          </h1>
          <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed font-normal">
            {category.description || category.short_description || t('category.default_description', 'Descubre los secretos ancestrales del arte sacro. Sumérgete en colecciones exclusivas de maestros artesanos.')}
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
                    alt={item.title || 'Series thumbnail'}
                    src={getImageUrl(item.thumbnail_url || item.cover_image || '')}
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
                    {item.title || t('category.untitled', 'Sin título')}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1.5 font-medium tracking-wide uppercase">
                    {formatEpisodeCount(item.episode_count || item.videos_count)} 
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

