import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { seriesApi, videoApi, Series, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, List } from 'lucide-react';
import { toast } from 'sonner';

const RewindEpisodes = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [series, setSeries] = useState<Series | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Cargar serie y videos
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Cargar serie
        const seriesResponse = await seriesApi.getById(parseInt(id));
        if (seriesResponse.success && seriesResponse.data) {
          setSeries(seriesResponse.data.series);
        }

        // Cargar videos de la serie
        const videosResponse = await videoApi.getPublic({
          category_id: parseInt(id),
          status: 'published',
          sort_by: 'episode',
          sort_order: 'asc',
          per_page: 100,
        });

        if (videosResponse.success && videosResponse.data) {
          const seriesVideos = videosResponse.data.data;
          setVideos(seriesVideos);
          if (seriesVideos.length > 0) {
            setCurrentVideo(seriesVideos[0]);
            setCurrentVideoIndex(0);
          }
        }
      } catch (error: any) {
        console.error('Error loading series data:', error);
        toast.error(error.message || t('rewind.error_load', 'Error al cargar la serie'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, t]);

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video: Video, index: number) => {
    setCurrentVideo(video);
    setCurrentVideoIndex(index);
    setIsPlaying(true);
    if (showBottomSheet) {
      setShowBottomSheet(false);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      handleVideoClick(videos[nextIndex], nextIndex);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1;
      handleVideoClick(videos[prevIndex], prevIndex);
    }
  };

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
        </div>
      </main>
    );
  }

  if (!series || !currentVideo) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{t('rewind.series_not_found', 'Serie no encontrada')}</p>
          <button
            onClick={() => navigateWithLocale('/rewind')}
            className="px-6 py-2 bg-[#A05245] text-white rounded-full hover:bg-[#b56053] transition-colors"
          >
            {t('rewind.back_to_rewind', 'Volver a Rewind')}
          </button>
        </div>
      </main>
    );
  }

  const thumbnailUrl = getImageUrl(
    currentVideo.thumbnail_url || 
    currentVideo.intro_image_url || 
    currentVideo.bunny_thumbnail_url || 
    series.cover_image || 
    series.thumbnail || 
    series.image ||
    ''
  );

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased flex flex-col lg:flex-row overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0A0A0A] z-10"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#A05245]/10 rounded-full blur-[150px] z-0 opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#C5A065]/5 rounded-full blur-[150px] z-0 opacity-40"></div>
      </div>

      {/* Video Player Section */}
      <div className="relative z-10 w-full lg:w-[450px] flex-shrink-0 mx-auto lg:sticky lg:top-24 h-screen lg:h-auto">
        <div className="relative aspect-[9/16] lg:aspect-[9/16] h-full lg:h-auto bg-stone-900 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] border border-white/10 group ring-1 ring-white/5">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={currentVideo.title || ''}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-90"></div>
          <div className="absolute inset-0 bg-black/10"></div>

          {/* Video Info Overlay */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start text-white z-20">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-white/10 rounded-sm shadow-sm">
              S1 • EP{String(currentVideoIndex + 1).padStart(2, '0')}
            </span>
            <button className="text-white/80 hover:text-white transition-colors">
              <span className="material-icons">more_vert</span>
            </button>
          </div>

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-[#A05245] hover:border-[#A05245] transition-all transform hover:scale-110 shadow-2xl"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white ml-0.5" fill="currentColor" />
              ) : (
                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Video Controls Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-30 bg-gradient-to-t from-black via-black/80 to-transparent pt-24">
            <div className="flex justify-end mb-6">
              <button
                onClick={handleNextVideo}
                disabled={currentVideoIndex >= videos.length - 1}
                className="group/btn relative overflow-hidden bg-white text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#A05245] hover:text-white transition-all shadow-lg flex items-center gap-2 transform translate-y-0 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('rewind.next', 'Siguiente')} <span className="hidden group-hover/btn:inline">{t('rewind.episode', 'Episodio')}</span>
                </span>
                <SkipForward className="h-4 w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 mb-4 group/progress">
              <div className="relative h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden group-hover/progress:h-2 transition-all">
                <div className="absolute top-0 left-0 h-full w-[45%] bg-white/10 z-0"></div>
                <div className="absolute top-0 left-0 h-full w-[15%] bg-[#A05245] z-10 shadow-[0_0_10px_rgba(160,82,69,0.8)]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-medium text-gray-400 tracking-wider font-mono">
                <span className="text-white">02:14</span>
                <span>{formatDuration(currentVideo.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center text-gray-200">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-[#A05245] transition-colors transform hover:scale-110"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" />
                  )}
                </button>
                <button className="hover:text-[#A05245] transition-colors transform hover:scale-110">
                  <SkipBack className="h-5 w-5" />
                </button>
                <div className="group/vol flex items-center gap-2">
                  <button className="hover:text-[#A05245] transition-colors">
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300">
                    <div className="h-1 bg-white/30 rounded-full w-14 ml-1">
                      <div className="h-full w-2/3 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-[#A05245] transition-colors text-xs font-bold border border-white/30 rounded px-1">
                  CC
                </button>
                <button className="hover:text-[#A05245] transition-colors transform hover:scale-110">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Desktop */}
      <div className="flex-1 w-full lg:max-w-3xl pt-2 lg:pt-0 relative z-10 px-6 lg:px-12 pb-6 lg:pb-0">
        <div className="mb-10 border-b border-white/10 pb-8 relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A05245] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A05245]"></span>
            </span>
            <span className="text-[#A05245] text-xs font-bold tracking-[0.2em] uppercase">
              {t('rewind.watching_now', 'Viendo Ahora')}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 leading-tight">
            {series.title || series.name || ''}
          </h1>
          <h2 className="text-xl text-gray-200 font-serif mb-5 font-medium tracking-wide">
            {t('rewind.chapter', 'Capítulo {current} de {total}', { 
              current: currentVideoIndex + 1, 
              total: videos.length 
            })} • <span className="text-[#A05245]">{currentVideo.title || ''}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400 font-medium mb-6 tracking-wide">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/5">4K HDR</span>
              <span className="bg-[#A05245]/20 text-[#A05245] px-2 py-0.5 rounded text-[10px] font-bold border border-[#A05245]/20">T +7</span>
            </div>
            <span>{getYear(series.published_at)}</span>
            <span className="text-white/20">•</span>
            <span className="text-white">{series.name || series.title || t('rewind.documentary', 'Documental')}</span>
          </div>
          <p className="text-gray-300 text-base lg:text-lg leading-relaxed font-light font-sans max-w-2xl mb-8">
            {currentVideo.description || currentVideo.short_description || series.description || ''}
          </p>
          <div className="flex gap-6">
            <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white group-hover:bg-white/5 transition-all">
                <span className="material-icons text-xl">add</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('rewind.my_list', 'Mi Lista')}</span>
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.like', 'Me gusta')}>
              <span className="material-icons text-xl text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors">thumb_up_off_alt</span>
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.dislike', 'No me gusta')}>
              <span className="material-icons text-xl text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors">thumb_down_off_alt</span>
            </button>
          </div>
        </div>

        {/* Episodes List - Desktop (always visible) */}
        <div className="hidden lg:block space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-bold text-white tracking-widest flex items-center gap-3">
              <span className="material-icons text-[#A05245]">format_list_numbered</span>
              {t('rewind.episodes_list', 'Lista de Episodios')}
            </h3>
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
              {videos.length} {t('rewind.chapters', 'Capítulos')}
            </span>
          </div>
          <div className="flex flex-col border-t border-white/5">
            {videos.map((video, index) => {
              const isActive = index === currentVideoIndex;
              const isLocked = video.status !== 'published' || video.visibility === 'premium';
              
              return (
                <div
                  key={video.id}
                  onClick={() => !isLocked && handleVideoClick(video, index)}
                  className={`group flex justify-between items-center py-4 border-b ${
                    isActive ? 'border-white/10 text-[#A05245]' : 'border-white/5 text-gray-300 hover:text-white'
                  } cursor-pointer hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-4 font-medium text-lg font-display">
                    {isActive ? (
                      <span className="material-icons text-xl animate-pulse">play_arrow</span>
                    ) : (
                      <span className="w-6 text-center text-sm font-sans text-gray-500 group-hover:text-[#A05245] transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    )}
                    <span className={isActive ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}>
                      {video.title || `${t('rewind.episode', 'Episodio')} ${index + 1}`}
                    </span>
                    {isLocked && (
                      <span className="text-xs uppercase tracking-wider font-sans border border-gray-700 rounded px-1.5 py-0.5">
                        {t('rewind.coming_soon', 'Próximamente')}
                      </span>
                    )}
                  </div>
                  {isLocked ? (
                    <span className="material-icons text-sm text-gray-600">lock</span>
                  ) : (
                    <span className={`font-mono text-sm ${isActive ? 'opacity-100 font-medium' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Button for Mobile - Episodes List */}
      <button
        onClick={() => setShowBottomSheet(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#A05245] text-white px-6 py-3 rounded-full shadow-2xl hover:bg-[#b56053] transition-all flex items-center gap-2 font-bold uppercase tracking-wider text-sm"
      >
        <List className="h-5 w-5" />
        {t('rewind.chapters_list', 'Lista de Capítulos')}
      </button>

      {/* Bottom Sheet for Mobile */}
      {showBottomSheet && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/80 z-40"
            onClick={() => setShowBottomSheet(false)}
          />
          {/* Bottom Sheet */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 rounded-t-3xl max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif font-bold text-white tracking-widest flex items-center gap-3">
                  <span className="material-icons text-[#A05245]">format_list_numbered</span>
                  {t('rewind.episodes_list', 'Lista de Episodios')}
                </h3>
                <button
                  onClick={() => setShowBottomSheet(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="flex flex-col border-t border-white/5 max-h-[60vh] overflow-y-auto">
                {videos.map((video, index) => {
                  const isActive = index === currentVideoIndex;
                  const isLocked = video.status !== 'published' || video.visibility === 'premium';
                  
                  return (
                    <div
                      key={video.id}
                      onClick={() => {
                        if (!isLocked) {
                          handleVideoClick(video, index);
                        }
                      }}
                      className={`group flex justify-between items-center py-4 border-b ${
                        isActive ? 'border-white/10 text-[#A05245]' : 'border-white/5 text-gray-300 hover:text-white'
                      } cursor-pointer hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-4 font-medium text-lg font-display">
                        {isActive ? (
                          <span className="material-icons text-xl animate-pulse">play_arrow</span>
                        ) : (
                          <span className="w-6 text-center text-sm font-sans text-gray-500 group-hover:text-[#A05245] transition-colors">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        )}
                        <span className={isActive ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}>
                          {video.title || `${t('rewind.episode', 'Episodio')} ${index + 1}`}
                        </span>
                        {isLocked && (
                          <span className="text-xs uppercase tracking-wider font-sans border border-gray-700 rounded px-1.5 py-0.5">
                            {t('rewind.coming_soon', 'Próximamente')}
                          </span>
                        )}
                      </div>
                      {isLocked ? (
                        <span className="material-icons text-sm text-gray-600">lock</span>
                      ) : (
                        <span className={`font-mono text-sm ${isActive ? 'opacity-100 font-medium' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>
                          {formatDuration(video.duration)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default RewindEpisodes;



