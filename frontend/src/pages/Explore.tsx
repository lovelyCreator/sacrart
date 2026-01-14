import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Play,
  Heart,
  Lock,
} from 'lucide-react';
import { videoApi, Video, categoryApi, Category } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';
import { isVideoLocked, shouldShowLockIcon, getLockMessageKey } from '@/utils/videoAccess';

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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'trending'>('all');
  const [trendingVideosLast7Days, setTrendingVideosLast7Days] = useState<Video[]>([]);
  const [trendingVideosLoading, setTrendingVideosLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
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

    fetchCategories();
  }, [locale]);

  // Fetch videos - refetch when category changes
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Build query params
        const params: any = { 
          status: 'published',
          sort_by: 'created_at',
          sort_order: 'desc',
          per_page: 1000 // Get more videos to ensure we have all
        };

        // If a category is selected, filter by category_id on backend
        // Backend handles videos through series relationship
        if (selectedCategory !== 'all') {
          params.category_id = parseInt(selectedCategory);
        }

        // Fetch videos
        const response = await videoApi.getPublic(params);
        
        const videosData = Array.isArray(response.data) 
          ? response.data 
          : response.data?.data || [];
        
        setVideos(videosData);
        
        // Clear new releases and trending - they will be fetched separately
        setNewReleases([]);
        setTrendingVideos([]);

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

    fetchVideos();
  }, [user, locale, selectedCategory]);

  // Fetch trending videos (most reproductions in last 7 days) - same as homepage
  useEffect(() => {
    const fetchTrendingVideos = async () => {
      setTrendingVideosLoading(true);
      try {
        // Fetch 10 for section display, or more if trending filter is selected
        const limit = selectedFilter === 'trending' ? 1000 : 10;
        const response = await videoApi.getTrendingLast7Days(limit);
        if (response.success && response.data) {
          const videos = Array.isArray(response.data) ? response.data : [];
          setTrendingVideosLast7Days(videos);
          // Also set trendingVideos for the section display (first 10)
          setTrendingVideos(videos.slice(0, 10));
        } else {
          setTrendingVideosLast7Days([]);
          setTrendingVideos([]);
        }
      } catch (error) {
        console.error('Error fetching trending videos:', error);
        setTrendingVideosLast7Days([]);
        setTrendingVideos([]);
      } finally {
        setTrendingVideosLoading(false);
      }
    };

    // Fetch trending videos when "All" category is selected (for the section display)
    // Or when trending filter is selected (for the filter results)
    if (selectedCategory === 'all' || selectedFilter === 'trending') {
      fetchTrendingVideos();
    } else if (selectedCategory !== 'all') {
      setTrendingVideosLast7Days([]);
      setTrendingVideos([]);
    }
  }, [selectedCategory, selectedFilter, locale]);

  // Fetch new releases (videos from this week - Monday to Sunday) - same as homepage
  useEffect(() => {
    const fetchNewReleases = async () => {
      if (selectedCategory !== 'all') {
        setNewReleases([]);
        return;
      }

      try {
        // Fetch all published videos
        const response = await videoApi.getPublic({ 
          status: 'published',
          sort_by: 'created_at',
          sort_order: 'desc',
          per_page: 1000
        });
        
        const videosData = Array.isArray(response.data) 
          ? response.data 
          : response.data?.data || [];
        
        // Calculate start of this week (Monday) and end of this week (Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to go back to Monday
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0); // Start of Monday
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999); // End of Sunday
        
        // Filter videos from this week (Monday to Sunday)
        const newReleasesData = videosData
          .filter((video: Video) => {
            const videoDate = new Date(video.created_at);
            return videoDate >= startOfWeek && videoDate <= endOfWeek;
          })
          .sort((a: Video, b: Video) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10);
        
        setNewReleases(newReleasesData);
      } catch (error) {
        console.error('Error fetching new releases:', error);
        setNewReleases([]);
      }
    };

    fetchNewReleases();
  }, [selectedCategory, locale]);

  useEffect(() => {
    // Determine which video source to use based on filter
    let sourceVideos = [...videos];
    
    // If trending filter is selected, use trending videos
    if (selectedFilter === 'trending') {
      sourceVideos = [...trendingVideosLast7Days];
    }
    
    let filtered = [...sourceVideos];

    // Filter by "New in this week" (Monday to Sunday of current week)
    if (selectedFilter === 'new') {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to go back to Monday
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0); // Start of Monday
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999); // End of Sunday
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.short_description && item.short_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.series && item.series.category && item.series.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter is now handled by backend when selectedCategory !== 'all'
    // Backend filters videos that belong to series in the selected category
    // No need to filter again on frontend

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
  }, [videos, trendingVideosLast7Days, searchTerm, selectedCategory, selectedVisibility, selectedSort, selectedFilter]);

  const handleVideoClick = (video: Video) => {
    const isLocked = isVideoLocked(video.visibility, user?.subscription_type);
    if (isLocked) {
      toast.error(t('video.locked_content'));
      return;
    }
    navigateWithLocale(`/episode/${video.id}`);
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
    const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || '');
    const isFavorite = favorites.has(video.id);
    const shouldShowLock = shouldShowLockIcon(video.visibility);
    const isLocked = isVideoLocked(video.visibility, user?.subscription_type);
    // Use shouldShowLock for UI display, isLocked for navigation blocking
    const showLockIcon = shouldShowLock;
    
    return (
      <div 
        className={`min-w-[240px] w-[240px] md:min-w-[280px] md:w-[280px] snap-start group relative ${showLockIcon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={(e) => {
          if (isLocked || showLockIcon) {
            e.preventDefault();
            e.stopPropagation();
            if (isLocked) {
              toast.error(t('video.locked_content'));
            }
            return;
          }
          handleVideoClick(video);
        }}
      >
        <div className="aspect-video overflow-hidden rounded-[6px] relative bg-[#18181b] shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/50">
          {thumbnailUrl ? (
            <img
              alt={video.title || ''}
              src={thumbnailUrl}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${showLockIcon ? 'opacity-60' : ''}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2080&auto=format&fit=crop';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          {/* Lock overlay */}
          {showLockIcon && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <Lock className="h-12 w-12 text-white" />
                <span className="text-white text-sm font-semibold">{t(getLockMessageKey(video.visibility))}</span>
              </div>
            </div>
          )}
          {/* Card gradient overlay */}
          {!showLockIcon && (
            <div className="absolute inset-0 card-gradient opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          )}
          {/* Play button on hover */}
          {!showLockIcon && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 border border-white/20 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                <Play className="text-white h-8 w-8 md:h-10 md:w-10" fill="currentColor" />
              </div>
            </div>
          )}
          {/* Favorite button */}
          {user && !showLockIcon && (
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
            {video.category?.name || (video as any).series_title || video.instructor?.name || t('library.video')}
            {(video as any).series_title && video.category?.name && ' • '}
            {(video as any).series_title && !video.category?.name && (video as any).series_title}
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
            {t('explore.title')}
          </h1>
          
          {/* Search Input */}
          <div className="w-full relative mb-8 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6 md:h-8 md:w-8 group-focus-within:text-white transition-colors" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18181b] border border-white/10 rounded-[4px] py-4 pl-14 pr-6 text-base md:text-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-xl shadow-black/50"
              placeholder={t('explore.search_placeholder')}
              type="text"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchTerm(''); // Clear search when selecting All
              }}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-transform hover:scale-105 ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {t('library.all')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id.toString());
                  setSearchTerm(''); // Clear search when selecting a category
                }}
                className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all hover:border-white/20 hover:text-white ${
                  selectedCategory === category.id.toString()
                    ? 'bg-primary text-white shadow-lg shadow-primary/10'
                    : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Filter Pills - New in this week and Trending */}
          {/* <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-4">
            <button
              onClick={() => {
                setSelectedFilter('all');
                setSearchTerm(''); // Clear search when selecting filter
              }}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-transform hover:scale-105 ${
                selectedFilter === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {t('library.all')}
            </button>
            <button
              onClick={() => {
                setSelectedFilter('new');
                setSearchTerm(''); // Clear search when selecting filter
              }}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all hover:border-white/20 hover:text-white ${
                selectedFilter === 'new'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400'
              }`}
            >
              {t('index.new_releases.title')}
            </button>
            <button
              onClick={() => {
                setSelectedFilter('trending');
                setSearchTerm(''); // Clear search when selecting filter
              }}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all hover:border-white/20 hover:text-white ${
                selectedFilter === 'trending'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#18181b] border border-white/10 hover:bg-white/10 text-gray-400'
              }`}
            >
              {t('index.trending.title')}
            </button>
          </div> */}
        </div>
      </section>

      {/* New Releases Section - Only show when no category is selected, no filter, and no search */}
      {newReleases.length > 0 && selectedCategory === 'all' && !searchTerm && selectedFilter === 'all' && (
        <section className="container mx-auto px-6 md:px-12 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('index.new_releases.title')}
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x episode-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {newReleases.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section - Only show when no category is selected, no filter, and no search */}
      {trendingVideos.length > 0 && selectedCategory === 'all' && !searchTerm && selectedFilter === 'all' && (
        <section className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('index.trending.title')}
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x episode-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {trendingVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* All Results Section - Show all videos when category is selected, filter is active, or search is active */}
      {/* When category is selected, filter is active, or search is active, show filtered videos */}
      {((selectedCategory !== 'all') || selectedFilter !== 'all' || searchTerm || selectedVisibility !== 'all') && filteredVideos.length > 0 && (
        <section className="container mx-auto px-6 md:px-12 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {selectedFilter === 'new' 
                ? `${t('index.new_releases.title')} (${filteredVideos.length})`
                : selectedFilter === 'trending'
                  ? `${t('index.trending.title')} (${filteredVideos.length})`
                  : selectedCategory !== 'all'
                    ? `${categories.find(c => c.id.toString() === selectedCategory)?.name || t('library.all')} (${filteredVideos.length})`
                    : `${t('library.all')} (${filteredVideos.length})`
              }
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x episode-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Show all videos when "All" is selected and no search/filters (after New Releases and Trending) */}
      {selectedCategory === 'all' && !searchTerm && selectedVisibility === 'all' && selectedFilter === 'all' && filteredVideos.length > 0 && (
        <section className="container mx-auto px-6 md:px-12 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t('library.all')} ({filteredVideos.length})
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 snap-x episode-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* No Results */}
      {filteredVideos.length === 0 && !loading && (searchTerm || selectedCategory !== 'all' || selectedVisibility !== 'all') && (
        <section className="container mx-auto px-6 md:px-12">
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-[#18181b] rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('explore.no_videos')}</h3>
            <p className="text-gray-400 mb-4">
              {t('explore.try_different_filters')}
            </p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedVisibility('all');
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {t('explore.clear_filters')}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
};

export default Explore;
