import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { videoApi, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play } from 'lucide-react';
import { toast } from 'sonner';

// Definir categorías/tags iniciales
const REEL_CATEGORIES = [
  { tag: 'procesos', label: 'Procesos', icon: '✨', color: 'yellow-200' },
  { tag: 'preguntas', label: 'Q&A', icon: '🗣️', color: 'white' },
  { tag: 'tips', label: 'Tips Express', icon: '⚡', color: 'yellow-500' },
  { tag: 'curiosidades', label: 'Curiosidades', icon: '🤓', color: 'blue-400' },
  { tag: 'bendiciones', label: 'Bendiciones', icon: '⛪', color: 'white' },
  { tag: 'dorado', label: 'Dorado', icon: '✨', color: 'yellow-200' },
  { tag: 'lija', label: 'Lija', icon: '🔧', color: 'gray-400' },
];

const Reels = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Cargar todos los videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await videoApi.getPublic({
          status: 'published',
          per_page: 1000, // Obtener muchos videos para filtrar localmente
        });
        
        if (response.success && response.data) {
          // Filtrar solo videos que tengan tags (reels)
          const reels = response.data.data.filter((video: Video) => 
            video.tags && video.tags.length > 0
          );
          
          // If no reels found, add sample data for testing
          if (reels.length === 0) {
            const createSampleVideo = (id: number, title: string, description: string, shortDesc: string, tags: string[], thumbnail: string, duration: number): Video => ({
              id,
              title,
              slug: title.toLowerCase().replace(/\s+/g, '-'),
              description,
              short_description: shortDesc,
              series_id: 1,
              category_id: null,
              instructor_id: null,
              video_url: null,
              video_file_path: null,
              video_url_full: null,
              bunny_video_id: null,
              bunny_video_url: null,
              bunny_embed_url: null,
              bunny_thumbnail_url: null,
              bunny_player_url: null,
              thumbnail: null,
              thumbnail_url: thumbnail,
              intro_image: null,
              intro_image_url: thumbnail,
              intro_description: null,
              duration,
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
              sort_order: id,
              tags,
              views: 0,
              unique_views: 0,
              rating: '0',
              rating_count: 0,
              completion_rate: 0,
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
            });

            const sampleReels: Video[] = [
              createSampleVideo(
                1,
                'Virgen de Filipinas - Preparación del bloque',
                'Selección de la madera de cedro y primeros trazos de simetría para definir la postura sagrada.',
                'Preparación del bloque',
                ['procesos', 'talla'],
                'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                840
              ),
              createSampleVideo(
                2,
                'El Desbastado - Técnicas de gubia',
                'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.',
                'El Desbastado',
                ['procesos', 'talla'],
                'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                1110
              ),
              createSampleVideo(
                3,
                'Definición de Volúmenes',
                'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.',
                'Definición de Volúmenes',
                ['procesos', 'modelado'],
                'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                1335
              ),
              createSampleVideo(
                4,
                'Tips Express: Temperatura del dorado',
                'Consejos rápidos sobre la temperatura ideal para el proceso de dorado.',
                'Temperatura del dorado',
                ['tips', 'dorado'],
                'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
                180
              ),
              createSampleVideo(
                5,
                'Q&A: ¿Qué madera usar?',
                'Ana responde preguntas sobre la selección de maderas para escultura sacra.',
                '¿Qué madera usar?',
                ['preguntas'],
                'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
                240
              ),
            ];
            setVideos(sampleReels);
          } else {
            setVideos(reels);
          }
        } else {
          // Add sample data if API fails
          const createSampleVideo = (id: number, title: string, description: string, shortDesc: string, tags: string[], thumbnail: string, duration: number): Video => ({
            id,
            title,
            slug: title.toLowerCase().replace(/\s+/g, '-'),
            description,
            short_description: shortDesc,
            series_id: 1,
            category_id: null,
            instructor_id: null,
            video_url: null,
            video_file_path: null,
            video_url_full: null,
            bunny_video_id: null,
            bunny_video_url: null,
            bunny_embed_url: null,
            bunny_thumbnail_url: null,
            bunny_player_url: null,
            thumbnail: null,
            thumbnail_url: thumbnail,
            intro_image: null,
            intro_image_url: thumbnail,
            intro_description: null,
            duration,
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
            sort_order: id,
            tags,
            views: 0,
            unique_views: 0,
            rating: '0',
            rating_count: 0,
            completion_rate: 0,
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
            });

          const sampleReels: Video[] = [
            createSampleVideo(
              1,
              'Virgen de Filipinas - Preparación del bloque',
              'Selección de la madera de cedro y primeros trazos de simetría para definir la postura sagrada.',
              'Preparación del bloque',
              ['procesos', 'talla'],
              'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              840
            ),
            createSampleVideo(
              2,
              'El Desbastado - Técnicas de gubia',
              'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.',
              'El Desbastado',
              ['procesos', 'talla'],
              'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
              1110
            ),
            createSampleVideo(
              3,
              'Definición de Volúmenes',
              'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.',
              'Definición de Volúmenes',
              ['procesos', 'modelado'],
              'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              1335
            ),
            createSampleVideo(
              4,
              'Tips Express: Temperatura del dorado',
              'Consejos rápidos sobre la temperatura ideal para el proceso de dorado.',
              'Temperatura del dorado',
              ['tips', 'dorado'],
              'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop',
              180
            ),
            createSampleVideo(
              5,
              'Q&A: ¿Qué madera usar?',
              'Ana responde preguntas sobre la selección de maderas para escultura sacra.',
              '¿Qué madera usar?',
              ['preguntas'],
              'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop',
              240
            ),
          ];
          setVideos(sampleReels);
        }
      } catch (error: any) {
        console.error('Error loading reels:', error);
        toast.error(error.message || t('reels.error_load', 'Error al cargar los reels'));
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [t]);

  // Filtrar videos según búsqueda o filtro activo
  const filteredVideos = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return videos.filter((video) => {
        const titleMatch = video.title?.toLowerCase().includes(query);
        const descriptionMatch = video.description?.toLowerCase().includes(query);
        const tagsMatch = video.tags?.some(tag => 
          tag.toLowerCase().includes(query)
        );
        return titleMatch || descriptionMatch || tagsMatch;
      });
    }
    
    if (activeFilter) {
      return videos.filter((video) => 
        video.tags?.some(tag => 
          tag.toLowerCase() === activeFilter.toLowerCase() || 
          tag.toLowerCase().includes(activeFilter.toLowerCase())
        )
      );
    }
    
    return videos;
  }, [videos, searchQuery, activeFilter]);

  // Agrupar videos por tags para mostrar en filas temáticas
  const videosByCategory = useMemo(() => {
    if (searchQuery.trim() || activeFilter) {
      return {}; // No agrupar cuando hay búsqueda o filtro activo
    }

    const grouped: Record<string, Video[]> = {};
    
    REEL_CATEGORIES.forEach((category) => {
      const categoryVideos = videos.filter((video) =>
        video.tags?.some(tag => 
          tag.toLowerCase() === category.tag.toLowerCase() ||
          tag.toLowerCase().includes(category.tag.toLowerCase())
        )
      );
      
      if (categoryVideos.length > 0) {
        grouped[category.tag] = categoryVideos;
      }
    });

    return grouped;
  }, [videos, searchQuery, activeFilter]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video: Video) => {
    navigateWithLocale(`/reel/${video.id}`);
  };

  const handleFilterClick = (tag: string) => {
    if (activeFilter === tag) {
      setActiveFilter(null);
      setSearchQuery('');
    } else {
      setActiveFilter(tag);
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setActiveFilter(null);
    }
  };

  const ReelCard = ({ video }: { video: Video }) => {
    const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || '');
    const hasThumbnail = thumbnailUrl && thumbnailUrl !== '';
    
    // Obtener el primer tag relevante para mostrar como badge
    const primaryTag = video.tags?.find(tag => 
      REEL_CATEGORIES.some(cat => 
        tag.toLowerCase().includes(cat.tag.toLowerCase())
      )
    ) || video.tags?.[0] || '';

    const getTagColor = (tag: string) => {
      const category = REEL_CATEGORIES.find(cat => 
        tag.toLowerCase().includes(cat.tag.toLowerCase())
      );
      if (category) {
        if (category.tag === 'tips') return 'yellow';
        if (category.tag === 'preguntas') return 'red';
        if (category.tag === 'curiosidades') return 'green';
      }
      return 'gray';
    };

    const tagColor = getTagColor(primaryTag);

    return (
      <div
        onClick={() => handleVideoClick(video)}
        className="flex-none w-[180px] md:w-[220px] aspect-[9/16] relative rounded-lg overflow-hidden cursor-pointer group/card bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 hover:scale-[1.02] shadow-lg"
      >
        {hasThumbnail ? (
          <img
            src={thumbnailUrl}
            alt={video.title || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        
        {video.duration && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide border border-white/10 z-20">
            {formatDuration(video.duration)}
          </div>
        )}

        <div className="absolute bottom-0 left-0 p-4 w-full z-10">
          {primaryTag && (
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded mb-2 border ${
              tagColor === 'yellow' ? 'bg-yellow-600/20 text-yellow-500 border-yellow-600/20' :
              tagColor === 'red' ? 'bg-red-600/20 text-red-500 border-red-600/20' :
              tagColor === 'green' ? 'bg-green-600/20 text-green-500 border-green-600/20' :
              'bg-gray-600/20 text-gray-400 border-gray-600/20'
            }`}>
              {primaryTag}
            </span>
          )}
          <h4 className="text-white font-bold leading-snug text-lg group-hover/card:text-[#A05245] transition-colors line-clamp-2">
            {video.title || ''}
          </h4>
          <p className="text-gray-400 text-xs mt-1 line-clamp-1">
            {video.short_description || video.description || ''}
          </p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] z-20">
          <Play className="h-12 w-12 text-white drop-shadow-lg fill-white" />
        </div>
      </div>
    );
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

  const showGrid = searchQuery.trim() || activeFilter;
  const displayVideos = showGrid ? filteredVideos : [];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
      {/* Header Section */}
      <section className="relative pt-16 pb-12 px-4 md:px-12 flex flex-col items-center text-center z-10 border-b border-white/5 bg-[#0A0A0A]">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/90 to-[#0A0A0A]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#A05245]/10 via-transparent to-transparent opacity-50"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 mt-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-wide drop-shadow-lg leading-tight">
            REELS <span className="text-[#A05245]">&amp;</span> PINCELADAS
          </h1>
          <p className="text-gray-400 text-base md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
            {t('reels.subtitle', 'Tu enciclopedia visual de arte sacro en formato vertical.')}
            <br className="hidden sm:inline" />
            {t('reels.subtitle2', 'Trucos, historias y momentos del taller.')}
          </p>
          
          {/* Search Bar */}
          <div className="relative w-full max-w-2xl mx-auto mt-10 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <span className="text-xl">🔍</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('reels.search_placeholder', 'Busca una técnica, material o curiosidad...')}
              className="w-full py-4 pl-14 pr-6 bg-[#141414] border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A05245]/50 focus:border-[#A05245]/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all text-base md:text-lg"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 px-4">
            {REEL_CATEGORIES.map((category) => (
              <button
                key={category.tag}
                onClick={() => handleFilterClick(category.tag)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === category.tag
                    ? 'bg-[#A05245] text-white'
                    : 'bg-[#141414] text-gray-300 hover:bg-[#1a1a1a] border border-white/10'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="space-y-12 px-4 md:px-12 z-10 relative mt-8 max-w-[1800px] mx-auto pb-20">
        {showGrid ? (
          /* Grid View - When searching or filtering */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayVideos.length > 0 ? (
              displayVideos.map((video) => (
                <ReelCard key={video.id} video={video} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">
                  {t('reels.no_results', 'No se encontraron reels con estos criterios.')}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Thematic Rows - Default view */
          <>
            {REEL_CATEGORIES.map((category) => {
              const categoryVideos = videosByCategory[category.tag] || [];
              if (categoryVideos.length === 0) return null;

              return (
                <div key={category.tag} className="group relative">
                  <div className="flex items-end justify-between mb-4 px-2">
                    <h3 className="text-xl md:text-2xl font-display font-semibold text-white flex items-center gap-3">
                      <span className={`text-2xl ${
                        category.color === 'yellow-200' ? 'text-yellow-200' :
                        category.color === 'yellow-500' ? 'text-yellow-500' :
                        category.color === 'blue-400' ? 'text-blue-400' :
                        category.color === 'gray-400' ? 'text-gray-400' :
                        'text-white'
                      }`}>{category.icon}</span>
                      {category.label}
                      {category.tag === 'preguntas' && (
                        <span className="text-sm text-gray-400 font-normal">: Ana Responde</span>
                      )}
                      {category.tag === 'tips' && (
                        <span className="text-sm text-gray-400 font-normal">: Trucos de Taller</span>
                      )}
                      {category.tag === 'curiosidades' && (
                        <span className="text-sm text-gray-400 font-normal"> Iconográficas</span>
                      )}
                      {category.tag === 'procesos' && (
                        <span className="text-sm text-gray-400 font-normal"> de Taller</span>
                      )}
                    </h3>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        handleFilterClick(category.tag);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors mb-1 hidden sm:block cursor-pointer"
                    >
                      {t('reels.see_all', 'Ver todo')}
                    </a>
                  </div>
                  
                  <div className="scrolling-wrapper flex overflow-x-auto gap-4 pb-6 snap-x px-2 scrollbar-hide">
                    {categoryVideos.map((video) => (
                      <ReelCard key={video.id} video={video} />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
};

export default Reels;

