import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi, Video } from '@/services/videoApi';
import { toast } from 'sonner';
import { Play, ChevronLeft, ChevronRight, Search, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS as en } from 'date-fns/locale/en-US';
import { ptBR as pt } from 'date-fns/locale/pt-BR';

const DirectosArchive = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [latestVideo, setLatestVideo] = useState<Video | null>(null);
  const [currentSeasonVideos, setCurrentSeasonVideos] = useState<Video[]>([]);
  const [archiveVideos, setArchiveVideos] = useState<Video[]>([]);
  const [talksVideos, setTalksVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('Todos');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedTheme, setSelectedTheme] = useState<string>('Talla');
  
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const availableEras = ['Todos', '2025', '2024', '2023', '2022', '2021'];
  const availableThemes = ['Talla', 'Modelado', 'Policromía', 'Técnica Mixta'];

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
        
        // Fetch all published videos
        const response = await videoApi.getPublic({
          status: 'published',
          per_page: 1000,
          sort_by: 'created_at',
          sort_order: 'desc',
        });

        if (response.success && response.data) {
          const videos = Array.isArray(response.data) 
            ? response.data 
            : response.data?.data || [];

          // Filter for "directos" - videos with tags containing "directo", "live", "twitch", or specific categories
          const directosVideos = videos.filter((video: Video) => {
            const tags = video.tags || [];
            const tagString = tags.join(' ').toLowerCase();
            return tagString.includes('directo') || 
                   tagString.includes('live') || 
                   tagString.includes('twitch') ||
                   tagString.includes('charla') ||
                   tagString.includes('q&a');
          });

          // Latest video (most recent)
          if (directosVideos.length > 0) {
            setLatestVideo(directosVideos[0]);
          } else {
            // Add sample latest video
            const sampleLatest: Video = {
              id: 1001,
              title: 'Modelado de Manos en Vivo',
              slug: 'modelado-manos-vivo',
              description: 'Sesión en vivo donde exploramos técnicas avanzadas de modelado de manos en escultura sacra.',
              short_description: 'Técnicas avanzadas de modelado de manos',
              series_id: 1,
              category_id: 1,
              instructor_id: 1,
              video_url: null,
              video_file_path: null,
              video_url_full: null,
              bunny_video_id: null,
              bunny_video_url: null,
              bunny_embed_url: null,
              bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              bunny_player_url: null,
              thumbnail: null,
              thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              intro_image: null,
              intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              intro_description: null,
              duration: 3600,
              file_size: null,
              video_format: null,
              video_quality: null,
              streaming_urls: null,
              hls_url: null,
              dash_url: null,
              visibility: 'freemium',
              status: 'published',
              is_free: true,
              price: null,
              episode_number: null,
              sort_order: 1,
              tags: ['directo', 'live', 'modelado'],
              views: 2500,
              unique_views: 1800,
              rating: '4.9',
              rating_count: 150,
              completion_rate: 85,
              published_at: new Date().toISOString(),
              scheduled_at: null,
              downloadable_resources: null,
              allow_download: false,
              meta_title: null,
              meta_description: null,
              meta_keywords: null,
              processing_status: 'completed',
              processing_error: null,
              processed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setLatestVideo(sampleLatest);
            directosVideos.push(sampleLatest);
          }

          // Current season videos (2025, or current year)
          const currentSeason = directosVideos.filter((video: Video) => {
            if (!video.created_at) return false;
            const videoYear = new Date(video.created_at).getFullYear();
            return videoYear === currentYear;
          });
          
          // Add sample current season videos if none found
          if (currentSeason.length === 0) {
            const sampleCurrentSeason: Video[] = [
              {
                id: 1002,
                title: 'Técnicas de Policromía en Vivo',
                slug: 'tecnicas-policromia-vivo',
                description: 'Aplicación de técnicas tradicionales de policromía en tiempo real.',
                short_description: 'Técnicas de policromía',
                series_id: 1,
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_description: null,
                duration: 2700,
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: null,
                sort_order: 2,
                tags: ['directo', 'policromía'],
                views: 1800,
                unique_views: 1200,
                rating: '4.8',
                rating_count: 95,
                completion_rate: 78,
                published_at: new Date(currentYear, 0, 10).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(currentYear, 0, 10).toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
            setCurrentSeasonVideos(sampleCurrentSeason);
          } else {
            setCurrentSeasonVideos(currentSeason.slice(0, 10));
          }

          // Archive videos (older than current year, with Twitch theme)
          const archive = directosVideos.filter((video: Video) => {
            if (!video.created_at) return false;
            const videoYear = new Date(video.created_at).getFullYear();
            return videoYear < currentYear;
          });
          
          // Add sample archive videos if none found
          if (archive.length === 0) {
            const sampleArchive: Video[] = [
              {
                id: 1003,
                title: 'Clásico Twitch: Talla en Madera',
                slug: 'clasico-twitch-talla',
                description: 'Sesión clásica de talla en madera desde nuestro archivo de Twitch.',
                short_description: 'Talla en madera clásica',
                series_id: 1,
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                intro_description: null,
                duration: 4200,
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: null,
                sort_order: 3,
                tags: ['twitch', 'talla', 'archivo'],
                views: 5000,
                unique_views: 3500,
                rating: '4.7',
                rating_count: 320,
                completion_rate: 72,
                published_at: new Date(2023, 5, 15).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(2023, 5, 15).toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
            setArchiveVideos(sampleArchive);
          } else {
            setArchiveVideos(archive.slice(0, 10));
          }

          // Talks videos (videos with "charla", "q&a", "preguntas" tags)
          const talks = directosVideos.filter((video: Video) => {
            const tags = video.tags || [];
            const tagString = tags.join(' ').toLowerCase();
            return tagString.includes('charla') || 
                   tagString.includes('q&a') || 
                   tagString.includes('preguntas') ||
                   tagString.includes('entrevista');
          });
          
          // Add sample talks if none found
          if (talks.length === 0) {
            const sampleTalks: Video[] = [
              {
                id: 1004,
                title: 'Charla: Historia del Arte Sacro',
                slug: 'charla-historia-arte-sacro',
                description: 'Conversación sobre la historia y evolución del arte sacro en España.',
                short_description: 'Historia del arte sacro',
                series_id: 1,
                category_id: 1,
                instructor_id: 1,
                video_url: null,
                video_file_path: null,
                video_url_full: null,
                bunny_video_id: null,
                bunny_video_url: null,
                bunny_embed_url: null,
                bunny_thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                bunny_player_url: null,
                thumbnail: null,
                thumbnail_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_image: null,
                intro_image_url: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                intro_description: null,
                duration: 1800,
                file_size: null,
                video_format: null,
                video_quality: null,
                streaming_urls: null,
                hls_url: null,
                dash_url: null,
                visibility: 'freemium',
                status: 'published',
                is_free: true,
                price: null,
                episode_number: null,
                sort_order: 4,
                tags: ['charla', 'historia', 'q&a'],
                views: 3200,
                unique_views: 2400,
                rating: '4.9',
                rating_count: 210,
                completion_rate: 88,
                published_at: new Date(currentYear, 1, 5).toISOString(),
                scheduled_at: null,
                downloadable_resources: null,
                allow_download: false,
                meta_title: null,
                meta_description: null,
                meta_keywords: null,
                processing_status: 'completed',
                processing_error: null,
                processed_at: new Date().toISOString(),
                created_at: new Date(currentYear, 1, 5).toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
            setTalksVideos(sampleTalks);
          } else {
            setTalksVideos(talks.slice(0, 10));
          }
        } else {
          // Add sample data if API response fails
          const sampleLatest: Video = {
            id: 1001,
            title: 'Modelado de Manos en Vivo',
            slug: 'modelado-manos-vivo',
            description: 'Sesión en vivo donde exploramos técnicas avanzadas de modelado de manos en escultura sacra.',
            short_description: 'Técnicas avanzadas de modelado de manos',
            series_id: 1,
            category_id: 1,
            instructor_id: 1,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_image: null,
            intro_image_url: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
            intro_description: null,
            duration: 3600,
            file_size: null,
            video_format: null,
            video_quality: null,
            streaming_urls: null,
            hls_url: null,
            dash_url: null,
            visibility: 'freemium',
            status: 'published',
            is_free: true,
            price: null,
            episode_number: null,
            sort_order: 1,
            tags: ['directo', 'live', 'modelado'],
            views: 2500,
            unique_views: 1800,
            rating: '4.9',
            rating_count: 150,
            completion_rate: 85,
            published_at: new Date().toISOString(),
            scheduled_at: null,
            downloadable_resources: null,
            allow_download: false,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            processing_status: 'completed',
            processing_error: null,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setLatestVideo(sampleLatest);
          setCurrentSeasonVideos([sampleLatest]);
          setArchiveVideos([]);
          setTalksVideos([]);
        }
      } catch (error: any) {
        console.error('Error loading directos archive:', error);
        toast.error(error.message || t('directos.error_load', 'Error al cargar el archivo de directos'));
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [t]);

  const handleVideoClick = (video: Video) => {
    navigateWithLocale(`/video/${video.id}`);
  };

  const VideoCard = ({ video, isArchive = false, showProgress = false }: { video: Video; isArchive?: boolean; showProgress?: boolean }) => {
    const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || '');
    const progress = Math.random() * 100; // Sample progress, replace with real data
    
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
                  Sacrart Live • {formatDate(video.created_at)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {video.tags?.[0] || 'Directo'}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wide">
                {video.created_at ? new Date(video.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TalksVideoCard = ({ video }: { video: Video }) => {
    const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || '');
    const progress = Math.random() * 100;
    
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
            <Search className="h-8 w-8 text-white/50 group-hover:text-[#A05245] transition-colors" />
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
            {video.tags?.some(tag => tag.toLowerCase().includes('podcast')) ? 'Podcast Visual' : 
             video.tags?.some(tag => tag.toLowerCase().includes('chat')) ? 'Just Chatting' : 
             'Entrevistas'} • {formatDate(video.created_at)}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  const latestThumbnail = latestVideo ? getImageUrl(latestVideo.intro_image_url || latestVideo.intro_image || latestVideo.thumbnail_url || latestVideo.thumbnail || '') : '';

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased">
      {/* Hero Section */}
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
                    Live Replay
                  </span>
                  <span className="text-gray-300 text-xs font-medium tracking-wide">
                    {formatDate(latestVideo.created_at)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  Último Directo: <br /> {latestVideo.title || 'Modelado de Manos en Vivo'}
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  {latestVideo.description || latestVideo.short_description || 'Acompaña al maestro en esta sesión intensiva donde exploramos técnicas avanzadas de arte sacro.'}
                </p>
                <button
                  onClick={() => handleVideoClick(latestVideo)}
                  className="group bg-[#A05245] hover:bg-red-700 text-white px-8 py-3.5 rounded-[4px] font-semibold text-sm md:text-base flex items-center gap-3 transition-all duration-300 shadow-xl shadow-black/30 hover:shadow-[#A05245]/20 hover:-translate-y-0.5"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>Ver Repetición ({formatDuration(latestVideo.duration || 0)})</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-[2px] uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Directos Archive
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  Archivo de Directos
                </h1>
                <p className="text-gray-300 text-sm md:text-base mb-8 max-w-xl leading-relaxed drop-shadow-md">
                  Explora nuestra colección de directos en vivo, sesiones de trabajo y charlas con el maestro.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Filters */}
      <div className="sticky top-20 z-40 w-full bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5 shadow-lg">
        <div className="container mx-auto px-6 md:px-12 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
              <div className="relative group">
                <button className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  Era: {selectedEra}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-gray-300 hover:text-white text-xs font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  Año: {selectedYear}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] border border-white/10 text-gray-300 hover:text-white text-xs font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  Tema: {selectedTheme}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center border-b border-white/10 focus-within:border-white/50 transition-colors py-1 w-full md:w-64">
              <input
                className="bg-transparent border-none text-sm text-white placeholder-gray-500 w-full focus:ring-0 px-2"
                placeholder="Buscar en archivo..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="text-gray-400 hover:text-white transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Sections */}
      <div className="pt-8 pb-16 space-y-12">
        {/* Current Season */}
        {currentSeasonVideos.length > 0 && (
          <section className="container mx-auto px-6 md:px-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Esta Temporada ({currentYear})
                <span className="bg-[#A05245]/20 text-[#A05245] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#A05245]/20">
                  Nuevo
                </span>
              </h2>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-5 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {currentSeasonVideos.map((video) => (
                <VideoCard key={video.id} video={video} showProgress={true} />
              ))}
            </div>
          </section>
        )}

        {/* Archive Section */}
        {archiveVideos.length > 0 && (
          <section className="container mx-auto px-6 md:px-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Los Clásicos de Twitch (Archivo)</h2>
              <div className="bg-[#9146FF]/10 border border-[#9146FF]/30 px-2 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#9146FF] rounded-sm"></span>
                <span className="text-[9px] font-bold text-[#9146FF] uppercase tracking-wider">Vintage Era</span>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {archiveVideos.map((video) => (
                <VideoCard key={video.id} video={video} isArchive={true} />
              ))}
            </div>
          </section>
        )}

        {/* Talks Section */}
        {talksVideos.length > 0 && (
          <section className="container mx-auto px-6 md:px-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Charlas y Preguntas</h2>
            </div>
            <div className="flex overflow-x-auto gap-5 pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent -mx-6 px-6 md:mx-0 md:px-0">
              {talksVideos.map((video) => (
                <TalksVideoCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default DirectosArchive;

