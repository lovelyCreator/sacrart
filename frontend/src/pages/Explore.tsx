import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Play,
  Heart,
} from 'lucide-react';
import { videoApi, Video, categoryApi, Category } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';

const Explore = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [newReleases, setNewReleases] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVisibility, setSelectedVisibility] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Format video duration
  const formatVideoDuration = (seconds: number | string | null | undefined): string => {
    if (!seconds) return '';
    const numSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
    if (isNaN(numSeconds) || numSeconds <= 0) return '';
    
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getPublic(locale);
        if (response.success) {
          setCategories(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    // Fetch videos
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Fetch all published videos
        const response = await videoApi.getPublic({ 
          status: 'published',
          sort_by: 'created_at',
          sort_order: 'desc',
          per_page: 100
        });
        
        const videosData = Array.isArray(response.data) 
          ? response.data 
          : response.data?.data || [];
        
        setVideos(videosData);
        
        // Get new releases (sorted by created_at desc, first 10)
        const sortedByDate = [...videosData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNewReleases(sortedByDate.slice(0, 10));
        
        // Get trending (sorted by views desc, first 10)
        const sortedByViews = [...videosData].sort((a, b) => 
          (b.views || 0) - (a.views || 0)
        );
        setTrendingVideos(sortedByViews.slice(0, 10));

        // Load user favorites if authenticated
        if (user) {
          try {
            const favoritesResponse = await userProgressApi.getFavoritesList();
            if (favoritesResponse.success && favoritesResponse.data) {
              const favoritesData = Array.isArray(favoritesResponse.data) 
                ? favoritesResponse.data 
                : favoritesResponse.data?.data || favoritesResponse.data || [];
              const favoriteVideoIds = new Set<number>(
                favoritesData.map((fav: any) => Number(fav.video_id))
              );
              setFavorites(favoriteVideoIds);
            }
          } catch (error) {
            console.error('Failed to load favorites:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setVideos([]);
        setNewReleases([]);
        setTrendingVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchVideos();
  }, [user, locale]);

  useEffect(() => {
    let filtered = [...videos];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.short_description && item.short_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        if (item.category) {
          return item.category.name.toLowerCase() === selectedCategory.toLowerCase() || 
                 item.category.id.toString() === selectedCategory;
        }
        return false;
      });
    }

    // Visibility filter
    if (selectedVisibility !== 'all') {
      filtered = filtered.filter(item => item.visibility === selectedVisibility);
    }

    // Sort
    switch (selectedSort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'rating':
        filtered.sort((a, b) => {
          const ratingA = parseFloat(String(a.rating || '0'));
          const ratingB = parseFloat(String(b.rating || '0'));
          return ratingB - ratingA;
        });
        break;
      case 'duration':
        filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        break;
      case 'popular':
      default:
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
    }

    setFilteredVideos(filtered);
    
    // Update new releases and trending based on filtered results
    const sortedByDate = [...filtered].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setNewReleases(sortedByDate.slice(0, 10));
    
    const sortedByViews = [...filtered].sort((a, b) => 
      (b.views || 0) - (a.views || 0)
    );
    setTrendingVideos(sortedByViews.slice(0, 10));
  }, [videos, searchTerm, selectedCategory, selectedVisibility, selectedSort]);

  const handleVideoClick = (videoId: number) => {
    navigateWithLocale(`/video/${videoId}`);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    if (!user) {
      toast.error(t('video.please_sign_in_favorites'));
      return;
    }
    try {
      const response = await userProgressApi.toggleFavorite(videoId);
      if (response.success && response.data) {
        const isFavoriteNow = response.data.is_favorite === true || response.data.is_favorite === 1;
        const newFavorites = new Set(favorites);
        if (isFavoriteNow) {
          newFavorites.add(videoId);
        } else {
          newFavorites.delete(videoId);
        }
        setFavorites(newFavorites);
        toast.success(isFavoriteNow ? t('video.added_to_favorites') : t('video.removed_from_favorites'));
      }
    } catch (error: any) {
      toast.error(error.message || t('video.failed_update_favorites'));
    }
  };

  // Video Card Component matching code.html design
  const VideoCard = ({ video }: { video: Video }) => {
    const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || '');
    const isFavorite = favorites.has(video.id);
    
    return (
      <div 
        className="min-w-[240px] w-[240px] md:min-w-[280px] md:w-[280px] snap-start group relative cursor-pointer"
        onClick={() => handleVideoClick(video.id)}
      >
        <div className="aspect-video overflow-hidden rounded-[6px] relative bg-[#18181b] shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/50">
          {thumbnailUrl ? (
            <img
              alt={video.title || ''}
              src={thumbnailUrl}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          {/* Card gradient overlay */}
          <div className="absolute inset-0 card-gradient opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 border border-white/20 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="text-white h-8 w-8 md:h-10 md:w-10" fill="currentColor" />
            </div>
          </div>
          {/* Favorite button */}
          {user && (
            <button
              onClick={(e) => handleToggleFavorite(e, video.id)}
              className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-full p-2 hover:bg-black/80"
            >
              <Heart 
                className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`}
              />
            </button>
          )}
          {/* Duration badge */}
          {video.duration && (
            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
              {formatVideoDuration(video.duration)}
            </div>
          )}
        </div>
        <div className="mt-2.5 px-0.5">
          <h3 className="font-bold text-[15px] text-white group-hover:text-primary transition-colors leading-tight tracking-tight line-clamp-2">
            {video.title || ''}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 font-medium tracking-wide line-clamp-1">
            {video.category?.name || video.series_title || video.instructor?.name || t('explore.video', 'Video')}
            {video.series_title && video.category?.name && ' • '}
            {video.series_title && !video.category?.name && video.series_title}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="pt-32 min-h-screen pb-12 bg-[#0f0f0f] font-display">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 min-h-screen pb-12 bg-[#0f0f0f]">
      {/* Header Section - Matching code.html */}
      <section className="container mx-auto px-6 md:px-12 mb-16">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto pt-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-8 text-center tracking-tight">
            {t('explore.title', '¿Qué te gustaría ver hoy?')}
          </h1>
          
          {/* Search Input */}
          <div className="w-full relative mb-8 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6 md:h-8 md:w-8 group-focus-within:text-white transition-colors" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18181b] border border-white/10 rounded-[4px] py-4 pl-14 pr-6 text-base md:text-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-xl shadow-black/50"
              placeholder={t('explore.search_placeholder', 'Títulos, artistas, técnicas, materiales...')}
              type="text"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-transform hover:scale-105 ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {t('explore.all', 'Todo')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all hover:border-white/20 hover:text-white ${
                  selectedCategory === category.name
                    ? 'bg-primary text-white shadow-lg shadow-primary/10'
                    : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* New Releases Section */}
      {newReleases.length > 0 && (
        <section className="container mx-auto px-6 md:px-12 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('explore.new_releases', 'Novedades esta semana')}
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {newReleases.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      {trendingVideos.length > 0 && (
        <section className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('explore.trending', 'Trending en SACRART')}
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {trendingVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* All Results Section - Show when there's a search or filter */}
      {(searchTerm || selectedCategory !== 'all' || selectedVisibility !== 'all') && filteredVideos.length > 0 && (
        <section className="container mx-auto px-6 md:px-12 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('explore.results', 'Resultados')} ({filteredVideos.length})
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* No Results */}
      {filteredVideos.length === 0 && (searchTerm || selectedCategory !== 'all' || selectedVisibility !== 'all') && (
        <section className="container mx-auto px-6 md:px-12">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-[#18181b] rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('explore.no_videos', 'No se encontraron videos')}</h3>
            <p className="text-gray-400 mb-4">
              {t('explore.try_different_filters', 'Intenta con diferentes filtros o términos de búsqueda')}
            </p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedVisibility('all');
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {t('explore.clear_filters', 'Limpiar filtros')}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
};

export default Explore;
