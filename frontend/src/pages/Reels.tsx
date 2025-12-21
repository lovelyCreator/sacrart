import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { videoApi, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Key, User, Church, Smile, Lightbulb, ArrowLeft, ChevronDown, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

// Definir categorías/tags iniciales (matching code.html order)
const REEL_CATEGORIES = [
  { tag: 'tips', label: 'Tips Express', icon: '⚡', color: 'yellow-500' },
  { tag: 'curiosidades', label: 'Curiosidades', icon: '🤓', color: 'blue-400' },
  { tag: 'procesos', label: 'Procesos', icon: '✨', color: 'yellow-200' },
  { tag: 'preguntas', label: 'Q&A', icon: '🗣️', color: 'white' },
  { tag: 'bendiciones', label: 'Bendiciones', icon: '⛪', color: 'white' },
];

const Reels = () => {
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [collectionView, setCollectionView] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Always use sample data (matching code.html design)
  useEffect(() => {
    const createSampleVideo = (
      id: number, 
      title: string, 
      description: string, 
      shortDesc: string, 
      tags: string[], 
      duration: number,
      badge?: string,
      category?: string
    ): Video => ({
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
      thumbnail_url: null,
      intro_image: null,
      intro_image_url: null,
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

    // Sample data matching code.html exactly
    const sampleReels: Video[] = [
      // Tips Express
      createSampleVideo(1, 'Limpia tus Pinceles', 'Truco rápido para mantener tus pinceles en perfecto estado.', '15s • Taller básico', ['tips'], 15, 'Hack', 'tips'),
      createSampleVideo(2, 'No uses este barniz', 'Error común que debes evitar en tu taller.', '45s • Materiales', ['tips'], 45, 'Error Común', 'tips'),
      createSampleVideo(3, 'Truco de Lijado', 'Técnica profesional para un acabado perfecto.', '30s • Preparación', ['tips'], 30, 'Técnica', 'tips'),
      createSampleVideo(4, 'Limpieza de Gubias', 'Mantenimiento esencial de herramientas.', '20s • Mantenimiento', ['tips'], 20),
      createSampleVideo(5, 'Cola de Conejo', 'Receta tradicional para restauración.', '50s • Recetas', ['tips'], 50),
      
      // Curiosidades
      createSampleVideo(6, '¿Por qué lleva llaves San Pedro?', 'Historia y significado iconográfico.', 'Historia', ['curiosidades'], 120),
      createSampleVideo(7, 'El color azul en la Virgen', 'Simbología del color en el arte sacra.', 'Simbología', ['curiosidades'], 90),
      createSampleVideo(8, 'La Palma del Martirio', 'Atributos iconográficos explicados.', 'Atributos', ['curiosidades'], 100),
      createSampleVideo(9, 'Los cuatro evangelistas', 'El significado del tetramorfos.', 'Tetramorfos', ['curiosidades'], 150),
      
      // Procesos
      createSampleVideo(10, 'Aplicación de Pan de Oro', 'Técnica tradicional de dorado.', 'Dorado', ['procesos'], 180),
      createSampleVideo(11, 'Talla de Madera', 'Proceso de desbastado profesional.', 'Desbastado', ['procesos'], 200),
      createSampleVideo(12, 'Mezcla de Pigmentos', 'Preparación de colores para policromía.', 'Policromía', ['procesos'], 160),
      createSampleVideo(13, 'Estucado del Lienzo', 'Preparación de superficie para pintura.', 'Preparación', ['procesos'], 140),
      
      // Q&A
      createSampleVideo(14, 'Primeros pasos', 'Consejos para comenzar en el arte sacra.', 'Consejos', ['preguntas'], 180),
      createSampleVideo(15, 'Errores Comunes', 'Aprendizaje de los errores más frecuentes.', 'Aprendizaje', ['preguntas'], 200),
      createSampleVideo(16, '¿Qué gubias comprar?', 'Guía de herramientas esenciales.', 'Herramientas', ['preguntas'], 220),
      
      // Bendiciones
      createSampleVideo(17, 'Entrega en Sevilla', 'Momento emotivo de entrega de obra.', 'Emotivo • 1m', ['bendiciones'], 60),
      createSampleVideo(18, 'Reacción del Cliente', 'Testimonio de satisfacción.', 'Testimonio • 45s', ['bendiciones'], 45),
      createSampleVideo(19, 'Bendición de Imagen', 'Ceremonia de consagración.', 'Ceremonia • 2m', ['bendiciones'], 120),
    ];

    setVideos(sampleReels);
    setLoading(false);
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
    setCollectionView(true);
    setActiveFilter(tag);
    setSearchQuery('');
  };

  const handleBackToReels = () => {
    setCollectionView(false);
    setActiveFilter(null);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setActiveFilter(null);
    }
  };

  // Collection Card Component (matching code1.html)
  const CollectionCard = ({ video }: { video: Video }) => {
    const primaryTag = video.tags?.[0] || '';
    const isTips = primaryTag === 'tips';
    
    // Get badge text
    const getBadge = () => {
      if (isTips) {
        if (video.title?.includes('Limpia')) return { text: 'Hack', color: 'yellow' };
        if (video.title?.includes('No uses')) return { text: 'Cuidado', color: 'red' };
        if (video.title?.includes('Truco')) return { text: 'Técnica', color: 'green' };
        if (video.title?.includes('Cola')) return { text: 'Receta', color: 'yellow' };
        if (video.title?.includes('Orden')) return { text: 'Organización', color: 'blue' };
        if (video.title?.includes('Recuperar')) return { text: 'Dorado', color: 'yellow' };
        if (video.title?.includes('Disolventes')) return { text: 'Seguridad', color: 'red' };
      }
      return null;
    };

    const badge = getBadge();

    // Get background gradient (matching code1.html)
    const getBackground = () => {
      // Tips Express gradients
      if (video.id === 1) return 'bg-gradient-to-br from-slate-700 to-slate-900';
      if (video.id === 2) return 'bg-gradient-to-br from-red-900 to-black';
      if (video.id === 3) return 'bg-gradient-to-br from-amber-700 to-stone-900';
      if (video.id === 4) return 'bg-gradient-to-br from-gray-600 to-gray-800';
      if (video.id === 5) return 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-yellow-700 via-orange-900 to-black';
      // Additional gradients for more videos
      if (video.id === 6) return 'bg-gradient-to-br from-emerald-900 to-black';
      if (video.id === 7) return 'bg-gradient-to-br from-blue-900 to-indigo-950';
      if (video.id === 8) return 'bg-gradient-to-br from-stone-500 to-stone-900';
      if (video.id === 9) return 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-600 via-orange-900 to-black';
      if (video.id === 10) return 'bg-gradient-to-br from-purple-900 to-black';
      if (video.id === 11) return 'bg-gradient-to-tr from-pink-900 to-red-950';
      if (video.id === 12) return 'bg-gradient-to-br from-cyan-800 to-blue-900';
      
      // Curiosidades gradients
      if (video.id >= 6 && video.id <= 9 && primaryTag === 'curiosidades') {
        if (video.id === 6) return 'bg-gradient-to-b from-slate-800 to-black';
        if (video.id === 7) return 'bg-gradient-to-b from-blue-900 to-black';
        if (video.id === 8) return 'bg-gradient-to-b from-yellow-900 to-black';
        if (video.id === 9) return 'bg-gradient-to-b from-purple-900 to-black';
      }
      
      // Procesos gradients
      if (video.id >= 10 && video.id <= 13 && primaryTag === 'procesos') {
        if (video.id === 10) return 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-yellow-200 via-yellow-600 to-yellow-900 opacity-80';
        if (video.id === 11) return 'bg-[#3e2b1b]';
        if (video.id === 12) return 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-60';
        if (video.id === 13) return 'bg-stone-700';
      }
      
      // Default
      return 'bg-gradient-to-br from-slate-700 to-slate-900';
    };

    return (
      <div
        onClick={() => handleVideoClick(video)}
        className="relative w-full min-w-[150px] sm:min-w-[200px] xl:min-w-[250px] 2xl:min-w-[300px] md:max-w-[400px] mx-auto aspect-[9/16] rounded-lg overflow-hidden cursor-pointer group bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 shadow-lg"
      >
        {/* Background */}
        <div className={`absolute inset-0 ${getBackground()} transition-transform duration-700 group-hover:scale-105`}></div>
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Duration */}
        {video.duration && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide border border-white/10 shadow-sm z-20">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 p-5 w-full z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          {badge && (
            <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded mb-2 border ${
              badge.color === 'yellow' ? 'bg-yellow-600/30 text-yellow-500 border-yellow-600/20' :
              badge.color === 'red' ? 'bg-red-600/30 text-red-500 border-red-600/20' :
              badge.color === 'green' ? 'bg-green-600/30 text-green-500 border-green-600/20' :
              badge.color === 'blue' ? 'bg-blue-600/30 text-blue-400 border-blue-600/20' :
              'bg-gray-600/30 text-gray-400 border-gray-600/20'
            }`}>
              {badge.text}
            </span>
          )}
          <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#A05245] transition-colors">
            {video.title || ''}
          </h3>
          <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
            {video.description || video.short_description || ''}
          </p>
        </div>

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10 backdrop-blur-[1px]">
          <PlayCircle className="h-20 w-20 text-white drop-shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300 fill-white" />
        </div>
      </div>
    );
  };

  const ReelCard = ({ video }: { video: Video }) => {
    const primaryTag = video.tags?.[0] || '';
    const isTips = primaryTag === 'tips';
    const isCuriosidades = primaryTag === 'curiosidades';
    const isProcesos = primaryTag === 'procesos';
    const isPreguntas = primaryTag === 'preguntas';
    const isBendiciones = primaryTag === 'bendiciones';
    
    // Get badge text from title or description
    const getBadge = () => {
      if (isTips) {
        if (video.title?.includes('Limpia')) return 'Hack';
        if (video.title?.includes('No uses')) return 'Error Común';
        if (video.title?.includes('Truco')) return 'Técnica';
      }
      return null;
    };

    const badge = getBadge();

    // Get background gradient based on category
    const getBackground = () => {
      if (isTips) {
        if (video.id === 1) return 'bg-gradient-to-br from-slate-700 to-slate-900';
        if (video.id === 2) return 'bg-gradient-to-br from-red-900 to-black';
        if (video.id === 3) return 'bg-gradient-to-br from-amber-800 to-stone-900';
        if (video.id === 4) return 'bg-gradient-to-br from-gray-600 to-gray-800';
        if (video.id === 5) return 'bg-gradient-to-br from-orange-900 to-black';
      }
      if (isCuriosidades) {
        if (video.id === 6) return 'bg-gradient-to-b from-slate-800 to-black';
        if (video.id === 7) return 'bg-gradient-to-b from-blue-900 to-black';
        if (video.id === 8) return 'bg-gradient-to-b from-yellow-900 to-black';
        if (video.id === 9) return 'bg-gradient-to-b from-purple-900 to-black';
      }
      if (isProcesos) {
        if (video.id === 10) return 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-yellow-200 via-yellow-600 to-yellow-900 opacity-80';
        if (video.id === 11) return 'bg-[#3e2b1b]';
        if (video.id === 12) return 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-60';
        if (video.id === 13) return 'bg-stone-700';
      }
      if (isPreguntas) {
        return 'bg-gray-700';
      }
      if (isBendiciones) {
        return 'bg-black';
      }
      return 'bg-gradient-to-br from-slate-700 to-slate-900';
    };

    return (
      <div
        onClick={() => handleVideoClick(video)}
        className="flex-none w-[180px] md:w-[220px] aspect-[9/16] relative rounded-lg overflow-hidden cursor-pointer group/card bg-gray-900 border border-white/5 hover:border-[#A05245]/50 transition-all duration-300 hover:scale-[1.02] shadow-lg"
      >
        {/* Background */}
        <div className={`absolute inset-0 ${getBackground()}`}></div>
        
        {/* Special patterns for procesos */}
        {video.id === 11 && (
          <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 11px)'}}></div>
        )}
        
        {/* Icon for curiosidades */}
        {isCuriosidades && video.id === 6 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/10">
            <Key className="h-32 w-32" />
          </div>
        )}
        
        {/* Icon for Q&A */}
        {isPreguntas && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
            <User className="h-24 w-24 text-gray-600" />
          </div>
        )}
        
        {/* Chat bubble for Q&A */}
        {isPreguntas && video.id === 14 && (
          <div className="absolute top-8 right-4 left-4 bg-white text-black p-2 rounded-tl-xl rounded-tr-xl rounded-br-xl text-[10px] font-bold shadow-lg leading-tight transform rotate-1">
            ¿Cómo empiezo?
          </div>
        )}
        {isPreguntas && video.id === 15 && (
          <div className="absolute top-12 right-4 left-4 bg-[#A05245] text-white p-2 rounded-tl-xl rounded-tr-xl rounded-bl-xl text-[10px] font-bold shadow-lg leading-tight transform -rotate-1">
            ¡Cuidado con esto!
          </div>
        )}
        {isPreguntas && video.id === 16 && (
          <div className="absolute top-6 left-2 right-2 flex justify-center">
            <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[10px] font-bold">Respondiendo a @CarlosArt</span>
          </div>
        )}
        
        {/* Icon for bendiciones */}
        {isBendiciones && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
            <div className={`absolute inset-0 flex flex-col items-center justify-center opacity-30 ${
              video.id === 17 ? 'bg-yellow-900/20' :
              video.id === 18 ? 'bg-purple-900/20' :
              'bg-blue-900/20'
            }`}>
              {video.id === 17 && <Church className="h-24 w-24 text-white" />}
              {video.id === 18 && <Smile className="h-24 w-24 text-white" />}
              {video.id === 19 && <Lightbulb className="h-24 w-24 text-white" />}
            </div>
          </>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        
        {/* Content */}
        <div className={`absolute bottom-0 left-0 p-4 w-full ${isBendiciones ? 'z-20' : 'z-10'}`}>
          {badge && (
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded mb-2 border ${
              badge === 'Hack' ? 'bg-yellow-600/20 text-yellow-500 border-yellow-600/20' :
              badge === 'Error Común' ? 'bg-red-600/20 text-red-500 border-red-600/20' :
              badge === 'Técnica' ? 'bg-green-600/20 text-green-500 border-green-600/20' :
              'bg-gray-600/20 text-gray-400 border-gray-600/20'
            }`}>
              {badge}
            </span>
          )}
          <h4 className="text-white font-bold leading-snug text-lg group-hover/card:text-[#A05245] transition-colors">
            {video.title || ''}
          </h4>
          <p className="text-gray-400 text-xs mt-1">
            {video.short_description || video.description || ''}
          </p>
        </div>

        {/* Play button on hover */}
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

  const showGrid = searchQuery.trim() || (activeFilter && !collectionView);
  const displayVideos = showGrid ? filteredVideos : [];
  
  // Get current category info
  const currentCategory = activeFilter ? REEL_CATEGORIES.find(cat => cat.tag === activeFilter) : null;
  const categoryVideos = activeFilter ? filteredVideos : [];

  // Collection view (matching code1.html)
  if (collectionView && activeFilter) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
        {/* Collection Header */}
        <section className="pt-8 pb-8 px-6 md:px-12 max-w-[1800px] mx-auto border-b border-white/5">
          <button
            onClick={handleBackToReels}
            className="inline-flex items-center text-gray-400 hover:text-[#A05245] transition-colors text-xs font-semibold tracking-wide mb-6 uppercase"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a Reels
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white flex items-center gap-3">
                <span className={`text-2xl ${
                  currentCategory?.color === 'yellow-500' ? 'text-yellow-500' :
                  currentCategory?.color === 'blue-400' ? 'text-blue-400' :
                  currentCategory?.color === 'yellow-200' ? 'text-yellow-200' :
                  'text-white'
                }`}>{currentCategory?.icon}</span>
                {currentCategory?.tag === 'tips' && 'Tips Express: Trucos de Taller'}
                {currentCategory?.tag === 'curiosidades' && 'Curiosidades Iconográficas'}
                {currentCategory?.tag === 'procesos' && 'Procesos de Taller'}
                {currentCategory?.tag === 'preguntas' && 'Q&A: Ana Responde'}
                {currentCategory?.tag === 'bendiciones' && 'Bendiciones y Entregas'}
              </h1>
              <p className="text-gray-400 text-sm md:text-base font-light max-w-2xl leading-relaxed">
                {currentCategory?.tag === 'tips' && 'Colección completa de consejos rápidos para mejorar tu técnica. Aprende atajos profesionales en menos de un minuto.'}
                {currentCategory?.tag === 'curiosidades' && 'Descubre el significado oculto detrás de los símbolos y atributos en el arte sacro.'}
                {currentCategory?.tag === 'procesos' && 'Sigue paso a paso las técnicas tradicionales del taller de arte sacro.'}
                {currentCategory?.tag === 'preguntas' && 'Ana responde a las preguntas más frecuentes de la comunidad.'}
                {currentCategory?.tag === 'bendiciones' && 'Momentos especiales de entrega y consagración de obras.'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold hidden md:inline-block">Vista:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-[#141414] border border-white/10 rounded px-4 py-2 pr-10 text-sm text-gray-300 focus:outline-none focus:border-[#A05245] hover:bg-[#1a1a1a] cursor-pointer min-w-[180px]"
                >
                  <option value="recent">Más Recientes</option>
                  <option value="popular">Más Populares</option>
                  <option value="oldest">Más Antiguos</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Collection Grid */}
        <section className="px-6 md:px-12 py-10 max-w-[1800px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categoryVideos.map((video) => (
              <CollectionCard key={video.id} video={video} />
            ))}
          </div>
          
          <div className="mt-16 flex justify-center">
            <button className="px-8 py-3 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-[#A05245] transition-all hover:bg-white/5">
              Cargar Más
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden flex flex-col">
      {/* Header Section */}
      <section className="relative pt-16 pb-12 px-4 md:px-12 flex flex-col items-center text-center z-10 border-b border-white/5 bg-[#0A0A0A]">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            className="w-full h-full object-cover opacity-10 filter blur-md mix-blend-luminosity" 
            src="https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/90 to-[#0A0A0A]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#A05245]/10 via-transparent to-transparent opacity-50"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 mt-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-wide drop-shadow-lg leading-tight">
            REELS <span className="text-[#A05245]">&amp;</span> PINCELADAS
          </h1>
          <p className="text-gray-400 text-base md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
            Tu enciclopedia visual de arte sacro en formato vertical.<br className="hidden sm:inline" />Trucos, historias y momentos del taller.
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
              placeholder="Busca una técnica, material o curiosidad..."
              className="w-full py-4 pl-14 pr-6 bg-[#141414] border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A05245]/50 focus:border-[#A05245]/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all text-base md:text-lg"
            />
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
                      {category.tag === 'tips' && 'Tips Express: Trucos de Taller'}
                      {category.tag === 'curiosidades' && 'Curiosidades Iconográficas'}
                      {category.tag === 'procesos' && 'Procesos de Taller'}
                      {category.tag === 'preguntas' && 'Q&A: Ana Responde'}
                      {category.tag === 'bendiciones' && 'Bendiciones y Entregas'}
                      {!['tips', 'curiosidades', 'procesos', 'preguntas', 'bendiciones'].includes(category.tag) && category.label}
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

