import { useState, useEffect, useMemo, memo, useRef, forwardRef } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { liveArchiveVideoApi, LiveArchiveVideo } from '@/services/videoApi';
import { toast } from 'sonner';
import { Play, ChevronLeft, ChevronRight, Search, History, Mic, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS as en } from 'date-fns/locale/en-US';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { useAuth } from '@/contexts/AuthContext';

const DirectosArchive = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [latestVideo, setLatestVideo] = useState<LiveArchiveVideo | null>(null);
  const [currentSeasonVideos, setCurrentSeasonVideos] = useState<LiveArchiveVideo[]>([]);
  const [archiveVideos, setArchiveVideos] = useState<LiveArchiveVideo[]>([]);
  const [talksVideos, setTalksVideos] = useState<LiveArchiveVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showClearButton, setShowClearButton] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  
  const availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Reset year to 'all' if current year is not in available years
  useEffect(() => {
    if (selectedYear !== 'all' && !availableYears.includes(selectedYear)) {
      setSelectedYear('all');
    }
  }, [selectedYear, availableYears]);

  // Get locale for date-fns
  const getDateLocale = () => {
    const locale = localStorage.getItem('i18nextLng') || 'es';
    if (locale === 'en') return en;
    if (locale === 'pt') return pt;
    return es;
  };

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: getDateLocale() });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        
        // Build filter parameters
        const filterParams: Record<string, any> = {
          per_page: 1000,
        };
        
        // Add year filter
        if (selectedYear && selectedYear !== 'all' && availableYears.includes(selectedYear)) {
          filterParams.year = selectedYear;
        }
        
        // Add theme filter (from tags)
        if (selectedTheme && selectedTheme !== 'all') {
          filterParams.theme = selectedTheme;
        }
        
        // Add era filter (from tags or section)
        if (selectedEra && selectedEra !== 'all') {
          filterParams.era = selectedEra;
        }
        
        // Add search filter
        if (debouncedSearchQuery.trim()) {
          filterParams.search = debouncedSearchQuery.trim();
        }
        
        // Fetch all published live archive videos with filters
        const response = await liveArchiveVideoApi.getPublic(filterParams);

        console.log('📦 Live Archive API Response:', response);
        
        if (response.success && response.data) {
          // Handle paginated response structure: { data: { data: [...], total, per_page, current_page } }
          const paginatedData = response.data;
          const videos = (paginatedData.data || paginatedData || []) as LiveArchiveVideo[];
          console.log('📹 Videos found:', videos.length, videos);
          
          // Debug: Check first video's section field
          if (videos.length > 0) {
            const firstVideo = videos[0] as any;
            console.log('🔍 First video section check:', {
              id: firstVideo.id,
              title: firstVideo.title,
              section: firstVideo.section,
              sectionType: typeof firstVideo.section,
              hasSection: 'section' in firstVideo,
              allKeys: Object.keys(firstVideo),
              rawVideo: firstVideo
            });
          }
          
          if (videos.length === 0) {
            console.warn('⚠️ No videos returned from API. Response structure:', {
              hasData: !!response.data,
              dataType: typeof response.data,
              dataKeys: response.data ? Object.keys(response.data) : [],
              fullResponse: response
            });
          }

          // Sort videos to ensure latest is first (by published_at or created_at)
          const sortedVideos = [...videos].sort((a, b) => {
            const dateA = new Date(a.published_at || a.created_at || 0).getTime();
            const dateB = new Date(b.published_at || b.created_at || 0).getTime();
            return dateB - dateA; // Descending order (newest first)
          });


          // Latest video (most recent) - always show in header
          const latestVideo = sortedVideos.length > 0 ? sortedVideos[0] : null;
          setLatestVideo(latestVideo);

          // Filter videos by section field
          // Mapping: Admin section values → Frontend sections
          // - 'current_season' → "Esta Temporada" (Current Season videos)
          // - 'twitch_classics' → "Los Clásicos de Twitch" (Archive videos)
          // - 'talks_questions' → "Charlas y Preguntas" (Talks videos)
          
          // "Esta Temporada" - videos with section = 'current_season'
          // Include all videos with this section, even if it's the latest video
          const currentSeason = sortedVideos.filter((video: LiveArchiveVideo) => {
            const section = (video as any).section;
            return section === 'current_season';
          });
          console.log('📹 Current Season videos (current_season):', currentSeason.length, currentSeason);
          setCurrentSeasonVideos(currentSeason);

          // "Los Clásicos de Twitch" (Archive) - videos with section = 'twitch_classics'
          // Include all videos with this section, even if it's the latest video
          const archive = sortedVideos.filter((video: LiveArchiveVideo) => {
            const section = (video as any).section;
            const isMatch = section === 'twitch_classics';
            if (isMatch) {
              console.log('✅ Found twitch_classics video:', { id: video.id, title: video.title, section, sectionType: typeof section });
            }
            return isMatch;
          });
          console.log('📹 Archive videos (twitch_classics):', archive.length, archive);
          if (archive.length === 0) {
            console.log('⚠️ No twitch_classics videos found. All videos sections:', sortedVideos.map(v => ({
              id: v.id,
              title: v.title,
              section: (v as any).section,
              sectionType: typeof (v as any).section,
              sectionValue: String((v as any).section),
              sectionEquals: (v as any).section === 'twitch_classics',
              sectionStrict: (v as any).section === 'twitch_classics' ? 'MATCH' : 'NO MATCH'
            })));
          }
          setArchiveVideos(archive);

          // "Charlas y Preguntas" (Talks) - videos with section = 'talks_questions'
          // Include all videos with this section, even if it's the latest video
          const talks = sortedVideos.filter((video: LiveArchiveVideo) => {
            const section = (video as any).section;
            const isMatch = section === 'talks_questions';
            if (isMatch) {
              console.log('✅ Found talks_questions video:', { id: video.id, title: video.title, section, sectionType: typeof section });
            }
            return isMatch;
          });
          console.log('📹 Talks videos (talks_questions):', talks.length, talks);
          if (talks.length === 0) {
            console.log('⚠️ No talks_questions videos found. All videos sections:', sortedVideos.map(v => ({
              id: v.id,
              title: v.title,
              section: (v as any).section,
              sectionType: typeof (v as any).section,
              sectionValue: String((v as any).section)
            })));
          }
          setTalksVideos(talks);
          
          // Debug: Log all videos and their sections
          console.log('📦 All videos with sections:', sortedVideos.map(v => ({
            id: v.id,
            title: v.title,
            section: (v as any).section,
            sectionType: typeof (v as any).section,
            sectionValue: JSON.stringify((v as any).section),
            published_at: v.published_at,
            created_at: v.created_at
          })));
          
          // Debug: Check if section field exists on videos
          console.log('🔍 Section field check:', {
            firstVideo: sortedVideos[0] ? {
              id: sortedVideos[0].id,
              title: sortedVideos[0].title,
              hasSection: 'section' in sortedVideos[0],
              section: (sortedVideos[0] as any).section,
              allKeys: Object.keys(sortedVideos[0] || {})
            } : null,
            videosWithSection: sortedVideos.filter(v => (v as any).section === 'twitch_classics').length
          });
        } else {
          // No videos found
          setLatestVideo(null);
          setCurrentSeasonVideos([]);
          setArchiveVideos([]);
          setTalksVideos([]);
        }
      } catch (error: any) {
        console.error('Error loading directos archive:', error);
        toast.error(error.message || t('directos.error_load'));
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [t, selectedEra, selectedYear, selectedTheme, debouncedSearchQuery]);

  // Fetch progress for all videos
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || currentSeasonVideos.length === 0 && archiveVideos.length === 0 && talksVideos.length === 0) {
        return;
      }

      const allVideos = [...currentSeasonVideos, ...archiveVideos, ...talksVideos];
      const progressMap: Record<number, number> = {};

      try {
        await Promise.all(
          allVideos.map(async (video) => {
            try {
              const progressResponse = await liveArchiveVideoApi.getProgress(video.id);
              if (progressResponse.success && progressResponse.data) {
                const progress = progressResponse.data.progress_percentage || 0;
                progressMap[video.id] = progress;
                console.log(`✅ Progress loaded for video ${video.id}: ${progress}%`);
              } else {
                console.debug(`No progress found for video ${video.id}`);
              }
            } catch (error) {
              // Silently fail for individual progress fetches
              console.debug('Failed to fetch progress for video', video.id, error);
            }
          })
        );
        setVideoProgress(progressMap);
      } catch (error) {
        console.error('Error fetching video progress:', error);
      }
    };

    fetchProgress();
  }, [user, currentSeasonVideos, archiveVideos, talksVideos]);

  const handleVideoClick = (video: LiveArchiveVideo) => {
    navigateWithLocale(`/live-archive/${video.id}`);
  };

  const VideoCard = memo(({ video, isArchive = false, showProgress = false, videoProgress, handleVideoClick }: { 
    video: LiveArchiveVideo; 
    isArchive?: boolean; 
    showProgress?: boolean;
    videoProgress: Record<number, number>;
    handleVideoClick: (video: LiveArchiveVideo) => void;
  }) => {
    const thumbnailUrl = getImageUrl(video.bunny_thumbnail_url || video.thumbnail_url || '');
    const progress = videoProgress[video.id] || 0;
    
    return (
      <div
        onClick={() => handleVideoClick(video)}
        className={`min-w-[300px] w-[300px] md:min-w-[360px] md:w-[360px] snap-start group relative cursor-pointer ${
          isArchive ? 'md:min-w-[280px] md:w-[280px] min-w-[260px] w-[260px]' : ''
        }`}
      >
        <div className={`aspect-video overflow-hidden rounded-[4px] relative bg-[#18181b] shadow-lg border border-white/5 ${
          isArchive ? 'filter sepia-[0.2]' : ''
        }`}>
          {thumbnailUrl ? (
            <img
              alt={video.title || ''}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                isArchive ? 'opacity-80' : ''
              }`}
              src={thumbnailUrl}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          <div className={`absolute inset-0 ${
            isArchive ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-black/20 group-hover:bg-black/10 transition-colors'
          }`}></div>
          
          {showProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
              <div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          
          {isArchive && (
            <div className="absolute top-2 left-2 text-[#9146FF] opacity-80">
              <History className="h-4 w-4" />
            </div>
          )}
          
          <span className={`absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] tracking-wide ${
            isArchive ? 'font-mono text-[#9146FF]' : ''
          }`}>
            {formatDuration(video.duration || 0)}
          </span>
        </div>
        
        <div className={`mt-3 flex gap-3 items-start ${isArchive ? 'mt-2.5 px-0.5' : ''}`}>
          {!isArchive && (
            <div className="w-9 h-9 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden border border-white/10">
              <div className="w-full h-full bg-gradient-to-br from-[#A05245] to-[#8a4539] flex items-center justify-center text-white font-bold text-xs">
                S
              </div>
            </div>
          )}
          <div className="flex-1">
            <h3 className={`font-bold text-white group-hover:text-[#A05245] transition-colors leading-snug line-clamp-2 ${
              isArchive ? 'text-[13px] text-gray-200 group-hover:text-[#9146FF]' : 'text-sm'
            }`}>
              {video.title || ''}
            </h3>
            {!isArchive ? (
              <>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                  {t('directos.sacrart_live')} • {formatDate(video.published_at || video.created_at || null)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {video.tags?.[0] || t('directos.directo')}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wide">
                {(video.published_at || video.created_at) ? new Date(video.published_at || video.created_at || '').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  });
  VideoCard.displayName = 'VideoCard';

  const TalksVideoCard = memo(({ video, videoProgress, handleVideoClick }: { 
    video: LiveArchiveVideo;
    videoProgress: Record<number, number>;
    handleVideoClick: (video: LiveArchiveVideo) => void;
  }) => {
    const thumbnailUrl = getImageUrl(video.bunny_thumbnail_url || video.thumbnail_url || '');
    const progress = videoProgress[video.id] || 0;
    
    return (
      <div
        onClick={() => handleVideoClick(video)}
        className="min-w-[300px] w-[300px] md:min-w-[360px] md:w-[360px] snap-start group relative cursor-pointer"
      >
        <div className="aspect-video overflow-hidden rounded-[4px] relative bg-[#18181b] shadow-lg border border-white/5">
          {thumbnailUrl ? (
            <img
              alt={video.title || ''}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 grayscale-[0.3] group-hover:grayscale-0"
              src={thumbnailUrl}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Mic className="h-10 w-10 text-white/50 group-hover:text-[#A05245] transition-colors" />
          </div>
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
              <div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] tracking-wide">
            {formatDuration(video.duration || 0)}
          </span>
        </div>
        <div className="mt-3">
          <h3 className="font-bold text-sm text-white group-hover:text-[#A05245] transition-colors leading-snug line-clamp-2">
            {video.title || ''}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">
            {video.tags?.some(tag => tag.toLowerCase().includes('podcast')) ? t('directos.podcast_visual') : 
             video.tags?.some(tag => tag.toLowerCase().includes('chat')) ? t('directos.just_chatting') : 
             t('directos.interviews')} • {formatDate(video.published_at || video.created_at || null)}
          </p>
        </div>
      </div>
    );
  });
  TalksVideoCard.displayName = 'TalksVideoCard';

  // All hooks must be called before any conditional returns
  const latestThumbnail = useMemo(() => {
    return latestVideo ? getImageUrl(latestVideo.bunny_thumbnail_url || latestVideo.thumbnail_url || '') : '';
  }, [latestVideo]);

  // Memoize hero section to prevent re-renders when searchQuery changes
  const heroSection = useMemo(() => (
    <section className="relative w-full h-[65vh] md:h-[75vh] flex items-end">
        <div className="absolute inset-0 w-full h-full">
          {latestThumbnail ? (
            <img
              alt="Último Directo Background"
              className="w-full h-full object-cover object-center opacity-60"
              src={latestThumbnail}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent"></div>
        </div>
        <div className="container mx-auto px-6 md:px-12 relative z-10 pb-16 md:pb-24">
          <div className="max-w-3xl">
            {latestVideo ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {t('directos.live_replay')}
                  </span>
                  <span className="text-gray-300 text-xs font-medium tracking-wide">
                    {formatDate(latestVideo.published_at || latestVideo.created_at || null)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  {t('directos.latest_directo')}: <br /> {latestVideo.title || ''}
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  {latestVideo.description || ''}
                </p>
                <button
                  onClick={() => handleVideoClick(latestVideo)}
                  className="group bg-[#A05245] hover:bg-red-700 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:shadow-[#A05245]/20 hover:-translate-y-0.5"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>{t('directos.watch_replay')} ({formatDuration(latestVideo.duration || 0)})</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {t('directos.directos_archive')}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  {t('directos.archive_title')}
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  {t('directos.archive_description')}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
  ), [latestVideo, latestThumbnail, t]);

  // Memoize filter dropdowns separately - exclude searchQuery to prevent re-renders when typing
  const filterDropdowns = useMemo(() => (
    <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
      {/* Era Filter */}
      <Select value={selectedEra} onValueChange={setSelectedEra}>
        <SelectTrigger className="w-[160px] h-9 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-medium rounded-full">
          <span className="text-white">
            {t('directos.era')}: <SelectValue>
              {selectedEra === 'all' ? t('directos.all') : (selectedEra === 'vintage' ? t('directos.vintage_era') : selectedEra === 'current' ? t('directos.current_era') : selectedEra)}
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="bg-[#18181b] border-white/10 text-white z-50">
          <SelectItem value="all" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.all')}</SelectItem>
          <SelectItem value="vintage" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.vintage_era')}</SelectItem>
          <SelectItem value="current" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.current_era')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Year Filter */}
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[130px] h-9 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-gray-300 hover:text-white text-xs font-medium rounded-full">
          <span className="text-gray-300">
            {t('directos.year')}: <SelectValue>
              {selectedYear === 'all' ? t('directos.all') : selectedYear}
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="bg-[#18181b] border-white/10 text-white z-50">
          <SelectItem value="all" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.all')}</SelectItem>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year} className="text-white focus:bg-[#27272a] cursor-pointer">
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Theme Filter */}
      <Select value={selectedTheme} onValueChange={setSelectedTheme}>
        <SelectTrigger className="w-[180px] h-9 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-gray-300 hover:text-white text-xs font-medium rounded-full">
          <span className="text-gray-300">
            {t('directos.theme')}: <SelectValue>
              {selectedTheme === 'all' ? t('directos.all') : (selectedTheme === 'talla' ? t('directos.theme_talla') : selectedTheme === 'modelado' ? t('directos.theme_modelado') : selectedTheme === 'policromia' ? t('directos.theme_policromia') : selectedTheme === 'tecnica_mixta' ? t('directos.theme_tecnica_mixta') : selectedTheme)}
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="bg-[#18181b] border-white/10 text-white z-50">
          <SelectItem value="all" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.all')}</SelectItem>
          <SelectItem value="talla" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.theme_talla')}</SelectItem>
          <SelectItem value="modelado" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.theme_modelado')}</SelectItem>
          <SelectItem value="policromia" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.theme_policromia')}</SelectItem>
          <SelectItem value="tecnica_mixta" className="text-white focus:bg-[#27272a] cursor-pointer">{t('directos.theme_tecnica_mixta')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ), [selectedEra, setSelectedEra, selectedYear, setSelectedYear, selectedTheme, setSelectedTheme, availableYears, t]);

  // Conditional return must come AFTER all hooks
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
      {heroSection}
      {/* Sticky Filters */}
      <div className="sticky top-20 z-40 w-full bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5 shadow-lg">
        <div className="container mx-auto px-6 md:px-12 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {filterDropdowns}
            <div className="flex items-center border-b border-white/10 focus-within:border-transparent transition-colors py-1 w-full md:w-64">
              <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                ref={searchInputRef}
                className="bg-transparent border-none text-sm text-white placeholder-gray-500 w-full focus:ring-0 px-2 focus:outline-none"
                placeholder={t('directos.search_archive')}
                type="text"
                defaultValue={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only update clear button visibility, minimal re-render
                  setShowClearButton(value.length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    setSearchQuery(value);
                    setDebouncedSearchQuery(value);
                    setShowClearButton(value.length > 0);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  setShowClearButton(value.length > 0);
                }}
              />
              {showClearButton && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setShowClearButton(false);
                    if (searchInputRef.current) {
                      searchInputRef.current.value = '';
                    }
                  }}
                  className="text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Video Sections */}
      <div className="pt-8 pb-16 space-y-12">
        {/* Current Season */}
        <section className="container mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {t('directos.this_season')} ({currentYear})
              <span className="bg-[#A05245]/20 text-[#A05245] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#A05245]/20">
                {t('directos.new')}
              </span>
            </h2>
            {currentSeasonVideos.length > 0 && (
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>
          {currentSeasonVideos.length > 0 ? (
            <div className="flex overflow-x-auto gap-5 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {currentSeasonVideos.map((video) => (
                <VideoCard key={video.id} video={video} showProgress={true} videoProgress={videoProgress} handleVideoClick={handleVideoClick} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No videos in this section yet.</p>
          )}
        </section>

        {/* Archive Section */}
        <section className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">{t('directos.twitch_classics')}</h2>
            <div className="bg-[#9146FF]/10 border border-[#9146FF]/30 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#9146FF] rounded-sm"></span>
              <span className="text-[9px] font-bold text-[#9146FF] uppercase tracking-wider">{t('directos.vintage_era')}</span>
            </div>
          </div>
          {archiveVideos.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {archiveVideos.map((video) => (
                <VideoCard key={video.id} video={video} isArchive={true} videoProgress={videoProgress} handleVideoClick={handleVideoClick} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No videos in this section yet.</p>
          )}
        </section>

        {/* Talks Section */}
        <section className="container mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">{t('directos.talks_questions')}</h2>
          </div>
          {talksVideos.length > 0 ? (
            <div className="flex overflow-x-auto gap-5 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {talksVideos.map((video) => (
                <TalksVideoCard key={video.id} video={video} videoProgress={videoProgress} handleVideoClick={handleVideoClick} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No videos in this section yet.</p>
          )}
        </section>

      </div>
    </main>
  );
};

export default DirectosArchive;

