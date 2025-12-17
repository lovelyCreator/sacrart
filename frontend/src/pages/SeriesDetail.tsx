import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Lock,
  Calendar,
  Grid3x3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { useTranslation } from 'react-i18next';
import { categoryApi, videoApi } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { toast } from 'sonner';

const SeriesDetail = () => {
  const { id, locale } = useParams<{ id: string; locale?: string }>();
  const [category, setCategory] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<any[]>([]);
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLocale } = useLocale();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        
        // Fetch videos for this category
        const videosResponse = await videoApi.getPublic({ category_id: parseInt(id || '1'), per_page: 100 });
        const videosData = Array.isArray(videosResponse.data) 
          ? videosResponse.data 
          : videosResponse.data?.data || [];
        setVideos(videosData);
        
        // Set first video as active if available
        if (videosData.length > 0) {
          setActiveVideoIndex(0);
        }
        
        // Derive category details from first video's embedded category
        if (videosData.length > 0 && videosData[0].category) {
          setCategory(videosData[0].category);
        } else {
          // Fallback: fetch public categories and find by id
          try {
            const catsRes = await categoryApi.getPublic();
            const cats = Array.isArray(catsRes.data) ? catsRes.data : [];
            const found = cats.find((c: any) => c.id === parseInt(id || '0')) || null;
            setCategory(found);
          } catch (e) {
            setCategory(null);
          }
        }

        // Load user progress
        if (user) {
          try {
            const progRes = await userProgressApi.getSeriesProgress(parseInt(id || '1'));
            const videoProgress = progRes?.data?.video_progress || {};
            const map: Record<number, any> = {};
            Object.values(videoProgress).forEach((p: any) => {
              if (p && typeof p.video_id === 'number') {
                map[p.video_id] = p;
              }
            });
            setProgressMap(map);
          } catch (e) {
            // ignore progress fetch errors
          }
        }

        // Fetch recommended videos (other categories)
        try {
          const recResponse = await videoApi.getPublic({ 
            per_page: 8,
            sort_by: 'created_at',
            sort_order: 'desc'
          });
          const recData = Array.isArray(recResponse.data) 
            ? recResponse.data 
            : recResponse.data?.data || [];
          // Filter out videos from current category
          const filtered = recData.filter((v: any) => v.category_id !== parseInt(id || '0'));
          setRecommendedVideos(filtered.slice(0, 4));
        } catch (e) {
          console.error('Error fetching recommended videos:', e);
        }
        
      } catch (error: any) {
        console.error('Error loading category data:', error);
        toast.error(t('seriesDetail.failed_load_category'));
        setCategory(null);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCategoryData();
    }
  }, [id, location.search, user]);

  const canAccessVideo = (videoVisibility: string) => {
    if (user && (user.role === 'admin' || user.subscription_type === 'admin' || (user as any).is_admin)) {
      return true;
    }
    if (!user) return videoVisibility === 'freemium';
    if (videoVisibility === 'freemium') return true;
    if (videoVisibility === 'basic') return ['basic', 'premium'].includes(user.subscription_type || '');
    if (videoVisibility === 'premium') return user.subscription_type === 'premium';
    return false;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDurationShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}`;
    return `${mins} min`;
  };

  // Helper to get category image URL
  const getCategoryImageUrl = (category: any) => {
    if (!category) return null;
    const imageUrl = category.image_url 
      || category.cover_image_url 
      || category.thumbnail_url 
      || category.image 
      || category.cover_image 
      || category.thumbnail;
    
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
      return imageUrl;
    }
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${API_BASE_URL.replace('/api', '')}/storage/${imageUrl.replace(/^\//, '')}`;
  };

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const handleVideoClick = (video: any, index: number) => {
    if (canAccessVideo(video.visibility)) {
      setActiveVideoIndex(index);
      navigateWithLocale(`/video/${video.id}`);
    }
  };

  const handlePlayFirstVideo = () => {
    if (videos.length > 0 && canAccessVideo(videos[0].visibility)) {
      navigateWithLocale(`/video/${videos[0].id}`);
    }
  };

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
  };

  if (loading) {
    return (
      <main className="flex-grow pt-28 pb-12 px-6 container mx-auto font-display bg-background-dark min-h-screen">
        <div className="animate-pulse">
          <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[600px] mb-16">
            <div className="w-full lg:w-[70%] h-[350px] lg:h-full bg-surface-dark rounded-xl"></div>
            <div className="w-full lg:w-[30%] h-full bg-surface-dark rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="flex-grow pt-28 pb-12 px-6 container mx-auto font-display bg-background-dark min-h-screen text-text-light">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('seriesDetail.category_not_found')}</h1>
          <Button onClick={() => navigateWithLocale('/browse')}>
            {t('seriesDetail.browse_all_categories')}
          </Button>
        </div>
      </main>
    );
  }

  const categoryImageUrl = getCategoryImageUrl(category);
  const params = new URLSearchParams(location.search);
  const filter = params.get('filter');
  const videosToShow = filter === 'progress'
    ? videos.filter((v: any) => {
        const p = progressMap[v.id];
        if (!p) return false;
        const pct = p.progress_percentage ?? 0;
        return pct > 0 && pct < 100;
      })
    : videos;

  return (
    <main className="flex-grow pt-28 pb-12 px-6 container mx-auto font-display bg-background-dark min-h-screen text-text-light">
      {/* Hero Section with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[600px] mb-16">
        {/* Hero Image - 70% */}
        <div 
          className="w-full lg:w-[70%] h-[350px] lg:h-full relative rounded-xl overflow-hidden shadow-2xl group cursor-pointer border border-white/5"
          onClick={handlePlayFirstVideo}
        >
          {categoryImageUrl ? (
            <img
              alt={category.name}
              src={categoryImageUrl}
              className="w-full h-full object-cover opacity-90 transform group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-90"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
            <button className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_30px_rgba(160,82,69,0.4)] hover:bg-[#b55e50] transform hover:scale-110 transition-all">
              <i className="fa-solid fa-play text-[48px] ml-1"></i>
            </button>
          </div>
          {/* Mobile Title */}
          <div className="absolute bottom-0 left-0 p-6 lg:hidden">
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">
              {t('seriesDetail.series_original', 'Serie Original')}
            </span>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">{category.name}</h1>
          </div>
        </div>

        {/* Sidebar - 30% */}
        <div className="w-full lg:w-[30%] flex flex-col h-full bg-surface-dark rounded-xl border border-white/5 overflow-hidden shadow-xl">
          {/* Series Info Header */}
          <div className="p-6 border-b border-white/5 bg-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                {t('seriesDetail.series', 'Serie')}
              </span>
              <span className="text-[10px] text-text-dim border border-white/10 px-1.5 py-0.5 rounded-sm">4K</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">{category.name}</h1>
            <p className="text-sm text-text-dim leading-relaxed line-clamp-3 mb-4 font-light">
              {category.description || t('seriesDetail.no_description', 'Sin descripción')}
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-text-dim">
              <div className="flex items-center gap-1">
                <i className="fa-solid fa-calendar-days text-[16px]"></i>
                <span>{getYear(category.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Grid3x3 className="h-4 w-4" />
                <span>{videos.length} {t('seriesDetail.episodes', 'Episodios')}</span>
              </div>
            </div>
          </div>

          {/* Chapters Header */}
          <div className="px-6 py-3 bg-[#111] border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-xs uppercase tracking-widest">
              {t('seriesDetail.chapters', 'Capítulos')}
            </h3>
            <span className="text-[10px] text-text-dim uppercase tracking-wider">
              {t('seriesDetail.season', 'Temporada')} 1
            </span>
          </div>

          {/* Chapters List */}
          <div className="flex-grow overflow-y-auto chapter-scroll relative bg-[#131313]">
            <div className="divide-y divide-white/5">
              {videosToShow.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-dim">
                  {t('seriesDetail.no_episodes', 'No hay episodios disponibles')}
                </div>
              ) : (
                videosToShow.map((video, index) => {
                  const hasAccess = canAccessVideo(video.visibility);
                  const isActive = activeVideoIndex === index;
                  const progress = progressMap[video.id];
                  const isCompleted = progress && (progress.progress_percentage || 0) >= 100;

                  return (
                    <div
                      key={video.id}
                      onClick={() => handleVideoClick(video, index)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-colors group ${
                        isActive
                          ? 'bg-primary/10 border-l-[3px] border-primary hover:bg-primary/20'
                          : hasAccess
                          ? 'hover:bg-white/5'
                          : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className={`text-lg w-6 text-center transition-colors ${
                        isActive
                          ? 'font-bold text-primary'
                          : 'text-text-dim group-hover:text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-grow">
                        <h4 className={`text-sm mb-0.5 transition-colors ${
                          isActive
                            ? 'font-bold text-white'
                            : 'font-medium text-text-dim group-hover:text-white'
                        }`}>
                          {video.title}
                        </h4>
                        <span className={`text-[11px] transition-colors ${
                          isActive
                            ? 'text-primary font-medium'
                            : 'text-[#555] group-hover:text-[#777]'
                        }`}>
                          {formatDurationShort(video.duration || 0)}
                        </span>
                      </div>
                      {hasAccess ? (
                        <i className={`fa-solid fa-play-circle text-[20px] transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-text-dim/30 group-hover:text-white'
                        }`}></i>
                      ) : (
                        <Lock className="h-5 w-5 text-text-dim/30" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Videos Section */}
      {recommendedVideos.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white border-l-[3px] border-primary pl-3 tracking-wide">
              {t('seriesDetail.recommended_videos', 'Vídeos Recomendados')}
            </h2>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors text-text-dim">
                <i className="fa-solid fa-chevron-left text-[18px]"></i>
              </button>
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors text-text-dim">
                <i className="fa-solid fa-chevron-right text-[18px]"></i>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommendedVideos.map((video) => {
              const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || '');
              const isNew = video.created_at && new Date(video.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              
              return (
                <div
                  key={video.id}
                  className="group cursor-pointer"
                  onClick={() => canAccessVideo(video.visibility) && navigateWithLocale(`/video/${video.id}`)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-surface-dark border border-white/5">
                    {thumbnailUrl ? (
                      <img
                        alt={video.title}
                        src={thumbnailUrl}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5"></div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <i className="fa-solid fa-play-circle text-white text-[48px] drop-shadow-lg"></i>
                    </div>
                    {isNew && (
                      <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                        {t('seriesDetail.new', 'Nuevo')}
                      </span>
                    )}
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                        {formatDurationShort(video.duration)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-200 group-hover:text-primary transition-colors leading-tight">
                    {video.title}
                  </h3>
                  <p className="text-[11px] text-text-dim mt-1 font-medium">
                    {video.category?.name || t('seriesDetail.category', 'Categoría')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default SeriesDetail;
