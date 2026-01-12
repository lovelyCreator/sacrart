import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import { userProgressApi } from '@/services/userProgressApi';
import { Button } from '@/components/ui/button';

const MyListSearch = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [myList, setMyList] = useState<any[]>([]);
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { navigateWithLocale, getPathWithLocale } = useLocale();
  const navigate = useNavigate();

  // Helper to get image URL
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Load user's favorites list
  useEffect(() => {
    const loadMyList = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await userProgressApi.getFavoritesList();
        if (response.success && response.data) {
          const favoritesData = Array.isArray(response.data) ? response.data : [];
          setMyList(favoritesData);
        } else if (Array.isArray(response)) {
          setMyList(response);
        } else if (response.data && Array.isArray(response.data)) {
          setMyList(response.data);
        } else {
          setMyList([]);
        }
      } catch (error) {
        console.error('Error loading my list:', error);
        setMyList([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyList();
  }, [user]);

  // Filter list based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredList(myList);
      return;
    }

    const query = searchTerm.toLowerCase().trim();
    const filtered = myList.filter((item: any) => {
      const video = item.video || item;
      const title = (video.title || '').toLowerCase();
      const description = (video.description || video.short_description || '').toLowerCase();
      const seriesName = (video.series?.name || '').toLowerCase();
      const categoryName = (video.category?.name || '').toLowerCase();
      
      return title.includes(query) || 
             description.includes(query) || 
             seriesName.includes(query) || 
             categoryName.includes(query);
    });
    
    setFilteredList(filtered);
  }, [searchTerm, myList]);

  // Update search term when URL params change
  useEffect(() => {
    const query = searchParams.get('search') || '';
    setSearchTerm(query);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(getPathWithLocale(`/my-list-search?search=${encodeURIComponent(searchTerm.trim())}`));
    } else {
      navigate(getPathWithLocale('/my-list-search'));
    }
  };

  const handleVideoClick = (videoId: number) => {
    navigateWithLocale(`/episode/${videoId}`);
  };

  const handleRemoveFromList = async (e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    try {
      await userProgressApi.toggleFavorite(videoId);
      // Reload the list
      const response = await userProgressApi.getFavoritesList();
      if (response.success && response.data) {
        const favoritesData = Array.isArray(response.data) ? response.data : [];
        setMyList(favoritesData);
      }
    } catch (error) {
      console.error('Error removing from list:', error);
    }
  };

  if (!user) {
    return (
      <main className="pt-32 min-h-screen pb-12 bg-[#0f0f0f]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-white mb-4">{t('profile.sign_in_required', 'Sign in required')}</h1>
            <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
              {t('common.sign_in', 'Sign In')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 min-h-screen pb-12 bg-[#0f0f0f]">
      <div className="container mx-auto px-6 md:px-12">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto pt-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              {t('profile.my_list', 'Mi Lista')}
            </h1>
          </div>
          
          {/* Search Input */}
          <form onSubmit={handleSearch} className="w-full relative mb-8 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6 md:h-8 md:w-8 group-focus-within:text-white transition-colors" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18181b] border border-white/10 rounded-[4px] py-4 pl-14 pr-6 text-base md:text-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-xl shadow-black/50"
              placeholder={t('profile.search_activity', 'Search your videos...')}
              type="text"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  navigate(getPathWithLocale('/my-list-search'));
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            )}
          </form>

          {/* Results Count */}
          {searchTerm && (
            <div className="text-sm text-gray-400 mb-4">
              {filteredList.length} {t('common.results', 'results')} {t('common.for', 'for')} "{searchTerm}"
            </div>
          )}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {searchTerm 
                ? t('profile.no_search_results', 'No videos match your search')
                : t('profile.no_favorites', 'No hay videos en tu lista')}
            </h2>
            <p className="text-gray-400">
              {searchTerm 
                ? t('profile.try_different_search', 'Try a different search term')
                : t('profile.add_videos_to_list', 'Add videos to your list to see them here')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredList.map((item: any) => {
              const video = item.video || item;
              const thumbnail = getImageUrl(video.thumbnail_url || video.poster_url || video.intro_image_url || video.intro_image || '');
              
              return (
                <div
                  key={item.id || video.id}
                  onClick={() => handleVideoClick(video.id)}
                  className="relative group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden relative border border-white/5 hover:border-white/20 transition-all bg-[#151515]">
                    {thumbnail ? (
                      <img
                        alt={video.title || 'Video'}
                        className="object-cover w-full h-full hover:scale-110 transition-transform duration-700"
                        src={thumbnail}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#151515] flex items-center justify-center">
                        <i className="fa-solid fa-video text-4xl text-gray-600"></i>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={(e) => handleRemoveFromList(e, video.id)}
                        className="bg-black/60 hover:bg-red-600 text-white w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md border border-white/10 transition-colors"
                        title={t('profile.remove_from_list', 'Remove from list')}
                      >
                        <i className="fa-solid fa-xmark text-base"></i>
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                      <h5 className="text-xs font-serif font-bold text-white leading-tight line-clamp-2">
                        {video.title || t('profile.no_title', 'Sin título')}
                      </h5>
                      {video.duration && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {Math.floor(video.duration / 60)}h {video.duration % 60}m
                        </p>
                      )}
                    </div>
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                        <i className="fa-solid fa-play text-2xl text-white ml-1"></i>
                      </div>
                    </div>
                  </div>
                  {/* Title below thumbnail (always visible) */}
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
                      {video.title || t('profile.no_title', 'Sin título')}
                    </h3>
                    {(video.series?.name || video.category?.name) && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {video.series?.name || video.category?.name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyListSearch;
