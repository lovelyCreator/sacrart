import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useIsMobile } from '@/hooks/use-mobile';
import { videoApi, Video } from '@/services/videoApi';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Subtitles, Settings, Maximize, X } from 'lucide-react';

// Sample transcription data structure
interface TranscriptionSegment {
  time: string;
  text: string;
  isActive?: boolean;
}

// Sample episode data
interface Episode {
  id: number;
  title: string;
  duration: string;
  description: string;
  thumbnail: string;
  isActive?: boolean;
  isLocked?: boolean;
}

const ReelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();
  const isMobile = useIsMobile();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'episodios' | 'transcripcion'>('transcripcion');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileModalType, setMobileModalType] = useState<'videos' | 'transcription' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sample transcription data
  const [transcription] = useState<TranscriptionSegment[]>([
    { time: '04:15', text: 'Para el dorado, es fundamental la temperatura. La madera respira, se expande y contrae con el calor del taller.', isActive: false },
    { time: '04:20', text: 'Así que vamos a calentarla al baño maría. Es un proceso delicado, casi alquímico, donde el material cambia de estado ante nuestros ojos.', isActive: true },
    { time: '04:25', text: 'Si hierve, perderá su fuerza adhesiva. Se volverá quebradiza y el oro no se fijará como debe sobre la superficie preparada.', isActive: false },
    { time: '04:32', text: 'Observad la consistencia. Debe fluir como miel caliente, ni muy líquida ni muy espesa. Es el punto exacto que buscamos.', isActive: false },
    { time: '04:45', text: 'Aplicamos la primera capa con suavidad. El pincel apenas roza la madera, depositando la mezcla en los poros abiertos.', isActive: false },
    { time: '05:10', text: 'El silencio es necesario aquí. Cualquier distracción podría arruinar horas de preparación. La concentración debe ser absoluta.', isActive: false },
  ]);

  // Sample episodes data
  const [episodes] = useState<Episode[]>([
    { id: 1, title: 'Preparación del bloque', duration: '14:00', description: 'Selección de la madera de cedro y primeros trazos de simetría para definir la postura sagrada.', thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', isActive: true },
    { id: 2, title: 'El Desbastado', duration: '18:30', description: 'El uso de la gubia para eliminar el material sobrante y encontrar la forma latente.', thumbnail: 'https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop', isActive: false },
    { id: 3, title: 'Definición de Volúmenes', duration: '22:15', description: 'Modelando los pliegues del manto y la expresión facial con herramientas de precisión.', thumbnail: 'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop', isActive: false },
  ]);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        if (id) {
          const response = await videoApi.get(parseInt(id));
          if (response.success && response.data && response.data.video) {
            setVideo(response.data.video);
          }
        }
      } catch (error: any) {
        console.error('Error loading video:', error);
        toast.error(error.message || 'Error al cargar el video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(percentage * 100);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      setProgress((current / dur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const thumbnailUrl = video ? getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || '') : '';
  const videoUrl = video?.bunny_embed_url || video?.bunny_video_url || video?.video_url_full || video?.video_url || '';

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p>Video no encontrado</p>
      </main>
    );
  }

  // Mobile view - Fullscreen video with modal buttons
  if (isMobile) {
    return (
      <main className="w-full h-[calc(100vh-80px)] bg-[#0A0A0A] text-white relative overflow-hidden">
        {/* Video Container - Reduced height to show buttons */}
        <div className="absolute inset-0 z-0">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : thumbnailUrl ? (
            <img src={thumbnailUrl} alt={video.title || ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20"></div>
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#A05245] hover:scale-105 transition-all"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white fill-white" />
            )}
          </button>
        </div>

        {/* Action Buttons - Always visible below video */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 bg-gradient-to-t from-black/80 to-transparent pt-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (showMobileModal && mobileModalType === 'videos') {
                  setShowMobileModal(false);
                  setMobileModalType(null);
                } else {
                  setMobileModalType('videos');
                  setShowMobileModal(true);
                }
              }}
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors text-sm font-medium ${
                showMobileModal && mobileModalType === 'videos'
                  ? 'bg-[#A05245] border-[#A05245] text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm'
              }`}
            >
              Episodios
            </button>
            <button
              onClick={() => {
                if (showMobileModal && mobileModalType === 'transcription') {
                  setShowMobileModal(false);
                  setMobileModalType(null);
                } else {
                  setMobileModalType('transcription');
                  setShowMobileModal(true);
                }
              }}
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors text-sm font-medium ${
                showMobileModal && mobileModalType === 'transcription'
                  ? 'bg-[#A05245] border-[#A05245] text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm'
              }`}
            >
              Transcripción
            </button>
          </div>
        </div>

        {/* Bottom Modal Section - Only shows when expanded */}
        {showMobileModal && (
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#141414] rounded-t-[2rem] shadow-[0_-10px_60px_rgba(0,0,0,0.8)] border-t border-white/10 flex flex-col max-h-[85vh] transition-all duration-500">
            <div className="w-full flex justify-center pt-3 pb-1">
              <div 
                className="w-12 h-1 bg-white/20 rounded-full cursor-pointer"
                onClick={() => {
                  setShowMobileModal(false);
                  setMobileModalType(null);
                }}
              ></div>
            </div>
            
            <div className="flex justify-between items-start px-6 pt-2 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-[#A05245] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Viendo Ahora</h2>
                <h3 className="font-serif font-bold text-xl text-white leading-tight">{video.title || 'Virgen de Filipinas'}</h3>
              </div>
              <button
                onClick={() => {
                  setShowMobileModal(false);
                  setMobileModalType(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors -mr-2 -mt-1"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Episodes List (shown when videos modal is open) */}
            {showMobileModal && mobileModalType === 'videos' && (
              <div className="flex-1 overflow-y-auto no-scrollbar">
              {episodes.map((episode, index) => (
                <div
                  key={episode.id}
                  className={`group flex items-center gap-4 px-6 py-5 ${
                    episode.isActive
                      ? 'bg-white/5 border-l-[3px] border-[#A05245]'
                      : 'border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors'
                  }`}
                >
                  {episode.isActive ? (
                    <>
                      <Play className="h-6 w-6 text-[#A05245]" />
                      <div className="flex-1">
                        <h4 className="text-[#A05245] font-bold text-sm leading-snug">{episode.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-[#A05245]/70 font-medium">{episode.duration}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-[#A05245]/50"></span>
                          <span className="text-[10px] uppercase tracking-wider text-[#A05245]/70 font-medium">Reproduciendo</span>
                        </div>
                      </div>
                      <div className="h-4 w-4">
                        <div className="flex items-end gap-[2px] h-full">
                          <div className="w-[3px] bg-[#A05245] h-[60%] animate-pulse"></div>
                          <div className="w-[3px] bg-[#A05245] h-[100%] animate-pulse delay-75"></div>
                          <div className="w-[3px] bg-[#A05245] h-[40%] animate-pulse delay-150"></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500 font-mono text-xs w-6 text-center group-hover:text-white transition-colors">{index + 1}</span>
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm leading-snug group-hover:text-[#A05245] transition-colors">{episode.title}</h4>
                        <span className="text-[10px] font-mono text-gray-500 mt-1 block">{episode.duration}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

            {/* Transcription List (shown when transcription modal is open) */}
            {showMobileModal && mobileModalType === 'transcription' && (
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
                {transcription.map((segment, index) => (
                  <div
                    key={index}
                    className={`group flex gap-4 ${
                      segment.isActive
                        ? 'relative'
                        : 'opacity-50 hover:opacity-80 transition-opacity cursor-pointer'
                    }`}
                  >
                    {segment.isActive && (
                      <div className="absolute -left-6 top-0 bottom-0 w-1 bg-[#A05245] rounded-r"></div>
                    )}
                    <span className={`font-mono text-xs pt-1 ${
                      segment.isActive ? 'text-white font-bold' : 'text-gray-500'
                    }`}>
                      {segment.time}
                    </span>
                    <p className={`text-sm leading-relaxed ${
                      segment.isActive ? 'text-white font-normal' : 'text-gray-300 font-light'
                    }`}>
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  // Desktop view - Split layout
  return (
    <main className="flex-grow w-full relative flex h-[calc(100vh-64px)] overflow-hidden bg-[#0A0A0A]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1628157588553-5eeea00af15c?q=80&w=1887&auto=format&fit=crop')] bg-cover bg-center opacity-20 blur-2xl scale-110"></div>
        <div className="absolute inset-0 bg-[#0A0A0A]/80"></div>
      </div>

      {/* Left Side - Video Player (40%) */}
      <div className="relative z-10 w-[40%] h-full flex items-center justify-center p-8 lg:p-12 border-r border-white/5">
        <div className="relative aspect-[9/16] h-full max-h-[85vh] bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 group">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover opacity-90"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : thumbnailUrl ? (
            <img
              alt={video.title || ''}
              className="w-full h-full object-cover opacity-90"
              src={thumbnailUrl}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20"></div>
          
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/90">REWIND 4K</span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#A05245] hover:scale-105 transition-all"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white fill-white" />
              )}
            </button>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div
              className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer group/progress"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[#A05245] rounded-full relative transition-all"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <button onClick={handlePlayPause} className="hover:text-[#A05245] transition-colors">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                </button>
                <button className="hover:text-[#A05245] transition-colors">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <span className="text-xs font-mono text-gray-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-[#A05245] transition-colors">
                  <Subtitles className="h-5 w-5" />
                </button>
                <button className="hover:text-[#A05245] transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
                <button className="hover:text-[#A05245] transition-colors">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Content (60%) */}
      <div className="relative z-10 w-[60%] h-full bg-[#0A0A0A] flex flex-col">
        <div className="px-12 pt-12 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold tracking-widest uppercase text-[#A05245]">Serie Original</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Temporada 1</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
            {video.title || 'Virgen de Filipinas'}
          </h1>
          <h2 className="text-lg text-gray-400 font-light flex items-center gap-2">
            <span className="text-[#A05245] font-serif">Capítulo 1:</span> Preparación del bloque
          </h2>
        </div>

        {/* Tabs */}
        <div className="px-12 mt-8 border-b border-white/10 flex items-center gap-8">
          <button
            onClick={() => setActiveTab('episodios')}
            className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
              activeTab === 'episodios'
                ? 'text-white border-b-2 border-[#A05245]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Episodios
          </button>
          <button
            onClick={() => setActiveTab('transcripcion')}
            className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
              activeTab === 'transcripcion'
                ? 'text-white border-b-2 border-[#A05245]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Transcripción
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto relative">
          {activeTab === 'transcripcion' ? (
            <div className="px-12 py-10 space-y-8 max-w-3xl">
              {transcription.map((segment, index) => (
                <div
                  key={index}
                  className={`group flex gap-6 ${
                    segment.isActive
                      ? 'relative'
                      : 'opacity-50 hover:opacity-80 transition-opacity cursor-pointer'
                  }`}
                >
                  {segment.isActive && (
                    <div className="absolute -left-12 top-0 bottom-0 w-1 bg-[#A05245] rounded-r"></div>
                  )}
                  <span className={`font-mono text-xs pt-1 ${
                    segment.isActive ? 'text-white font-bold' : 'text-gray-500'
                  }`}>
                    {segment.time}
                  </span>
                  <p className={`leading-relaxed ${
                    segment.isActive
                      ? 'text-lg text-white font-normal'
                      : 'text-base text-gray-300 font-light'
                  }`}>
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-12 py-8">
              {episodes.map((episode, index) => (
                <div
                  key={episode.id}
                  className={`flex items-start gap-5 py-6 border-b border-white/5 group cursor-pointer ${
                    episode.isActive
                      ? ''
                      : 'hover:bg-white/5 transition-colors -mx-4 px-4 rounded-lg'
                  }`}
                >
                  <div className="relative w-32 aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    <img
                      className={`w-full h-full object-cover ${
                        episode.isActive ? 'opacity-60' : 'group-hover:scale-105 transition-transform duration-500'
                      }`}
                      src={episode.thumbnail}
                      alt={episode.title}
                    />
                    {episode.isActive ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-6 w-6 text-[#A05245]" />
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold text-sm ${
                        episode.isActive
                          ? 'text-[#A05245]'
                          : 'text-white group-hover:text-[#A05245] transition-colors'
                      }`}>
                        {String(index + 1).padStart(2, '0')}. {episode.title}
                      </h3>
                      <span className="text-[10px] font-mono text-gray-500">{episode.duration}</span>
                    </div>
                    <p className={`text-xs line-clamp-2 leading-relaxed ${
                      episode.isActive
                        ? 'text-gray-400'
                        : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {episode.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="sticky bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>
        </div>
      </div>
    </main>
  );
};

export default ReelDetail;

