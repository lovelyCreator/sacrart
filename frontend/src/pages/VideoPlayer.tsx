import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Settings,
  Lock,
  Eye,
  Send,
  ThumbsUp,
  Smile
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi } from '@/services/videoApi';
import { toast } from 'sonner';

// Declare YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const VideoPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(1200);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [youtubeAPIReady, setYoutubeAPIReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If it's already just an ID (11 characters, alphanumeric)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    return null;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setYoutubeAPIReady(true);
      };
    } else {
      setYoutubeAPIReady(true);
    }
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (youtubeAPIReady && youtubeVideoId && youtubePlayerRef.current && !youtubePlayer) {
      try {
        const player = new window.YT.Player(youtubePlayerRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0, // Hide YouTube controls
            disablekb: 1, // Disable keyboard controls
            enablejsapi: 1,
            fs: 0, // Disable fullscreen button
            iv_load_policy: 3, // Hide annotations
            modestbranding: 1,
            playsinline: 1,
            rel: 0, // Don't show related videos
            showinfo: 0,
            cc_load_policy: 0, // Closed captions off by default
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              setYoutubePlayer(event.target);
              // Set initial volume
              event.target.setVolume(volume * 100);
              if (isMuted) {
                event.target.mute();
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.PLAYING = 1, YT.PlayerState.PAUSED = 2
              setIsPlaying(event.data === 1);
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              toast.error(t('video.youtube_error', 'Error al cargar el video de YouTube'));
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    }
  }, [youtubeAPIReady, youtubeVideoId, youtubePlayer]);

  // Sync volume and mute with YouTube player
  useEffect(() => {
    if (youtubePlayer) {
      youtubePlayer.setVolume(volume * 100);
      if (isMuted) {
        youtubePlayer.mute();
      } else {
        youtubePlayer.unMute();
      }
    }
  }, [volume, isMuted, youtubePlayer]);

  // Update current time periodically for progress bar
  useEffect(() => {
    if (!youtubePlayer || !isPlaying) return;

    const interval = setInterval(() => {
      try {
        const current = youtubePlayer.getCurrentTime();
        const dur = youtubePlayer.getDuration();
        if (current && dur) {
          setCurrentTime(current);
          setDuration(dur);
        }
      } catch (error) {
        // Ignore errors (video might not be ready)
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [youtubePlayer, isPlaying]);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        const videoResponse = await videoApi.get(parseInt(id || '1'));
        
        if (!videoResponse || !videoResponse.success) {
          throw new Error('Failed to fetch video data');
        }
        
        const videoData = videoResponse.data.video;
        
        if (!videoData) {
          throw new Error('No video data received');
        }
        
        setVideo(videoData);
        setDuration(videoData.duration || 0);
        
        // Extract YouTube video ID from video URL
        // Check for YouTube ID/URL in various possible fields
        const ytId = extractYouTubeId(
          (videoData as any).youtube_id || 
          (videoData as any).youtube_url || 
          videoData.video_url || 
          videoData.bunny_video_url
        );
        
        if (ytId) {
          setYoutubeVideoId(ytId);
        }
        
        // Mock chat messages for demo (will be replaced with YouTube live chat)
        setChatMessages([
          {
            id: 1,
            user: { name: 'Luis Miguel', initials: 'LM' },
            message: '¿Qué tipo de punzón está usando para el rascado?',
            color: 'indigo',
            isOfficial: false,
            opacity: 100
          },
          {
            id: 2,
            user: { name: 'SACRART Oficial', initials: 'SR' },
            message: 'Luis, es un punzón de ágata bruñida n° 4.',
            color: 'primary',
            isOfficial: true,
            opacity: 80
          },
          {
            id: 3,
            user: { name: 'María Teresa', initials: 'MT' },
            message: 'Increíble la precisión... parece fácil pero no lo es.',
            color: 'emerald',
            isOfficial: false,
            opacity: 70
          },
          {
            id: 4,
            user: { name: 'Juan Pedro', initials: 'JP' },
            message: 'Saludos desde Sevilla! 👋',
            color: 'yellow',
            isOfficial: false,
            opacity: 70
          },
          {
            id: 5,
            user: { name: 'Antonio R.', initials: 'AR' },
            message: '¿El temple lleva algún aditivo especial hoy?',
            color: 'purple',
            isOfficial: false,
            opacity: 60
          },
          {
            id: 6,
            user: { name: 'Carmen L.', initials: 'CL' },
            message: 'La iluminación permite ver muy bien el detalle.',
            color: 'blue',
            isOfficial: false,
            opacity: 50
          }
        ]);
        
      } catch (error: any) {
        console.error('Error loading video data:', error);
        toast.error(error.message || t('video.failed_load_video'));
        setVideo(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideoData();
    }
  }, [id]);

  useEffect(() => {
    // Scroll chat to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0; // Reverse scroll (newest at top)
    }
  }, [chatMessages]);

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

  const handlePlayPause = () => {
    if (youtubePlayer) {
      if (isPlaying) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (youtubePlayer && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      youtubePlayer.seekTo(newTime, true);
      setCurrentTime(newTime);
    } else if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      setCurrentTime(newTime);
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (youtubePlayer) {
      if (newMuted) {
        youtubePlayer.mute();
      } else {
        youtubePlayer.unMute();
      }
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
    setVolume(newVolume);
    if (youtubePlayer) {
      youtubePlayer.setVolume(newVolume * 100);
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const videoContainer = youtubePlayerRef.current?.parentElement || videoRef.current?.parentElement;
    if (!videoContainer) return;

    if (!isFullscreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !user) return;
    
    const newMessage = {
      id: Date.now(),
      user: { 
        name: user.name || user.email?.split('@')[0] || 'Usuario',
        initials: getInitials(user.name || user.email || 'U')
      },
      message: chatMessage.trim(),
      color: 'primary',
      isOfficial: false,
      opacity: 100
    };
    
    setChatMessages([newMessage, ...chatMessages]);
    setChatMessage('');
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      indigo: 'bg-indigo-600',
      primary: 'bg-primary',
      emerald: 'bg-emerald-600',
      yellow: 'bg-yellow-600',
      purple: 'bg-purple-600',
      blue: 'bg-blue-600'
    };
    return colors[color] || 'bg-primary';
  };

  const getTextColorClass = (color: string) => {
    const colors: Record<string, string> = {
      indigo: 'text-indigo-400',
      primary: 'text-primary',
      emerald: 'text-emerald-400',
      yellow: 'text-yellow-500',
      purple: 'text-purple-400',
      blue: 'text-blue-400'
    };
    return colors[color] || 'text-primary';
  };

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  if (loading) {
    return (
      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1800px] mx-auto w-full flex-1 flex flex-col h-full min-h-[calc(100vh-80px)] bg-background-dark font-display">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-7 aspect-video bg-surface-dark rounded-xl"></div>
            <div className="lg:col-span-3 h-[600px] bg-surface-dark rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1800px] mx-auto w-full flex-1 flex flex-col h-full min-h-[calc(100vh-80px)] bg-background-dark font-display text-text-light">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('video.video_not_found')}</h1>
          <Button onClick={() => navigateWithLocale('/browse')}>
            {t('video.browse_all_videos')}
          </Button>
        </div>
      </main>
    );
  }

  const hasAccess = canAccessVideo(video.visibility);
  const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || video.bunny_thumbnail_url || '');
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 98;

  return (
    <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1800px] mx-auto w-full flex-1 flex flex-col h-full min-h-[calc(100vh-80px)] bg-background-dark font-display text-text-light">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 flex-1 h-full">
        {/* Video Player Section - 70% */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
            {/* Background Image */}
            {thumbnailUrl && !youtubeVideoId && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${thumbnailUrl})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 opacity-80"></div>
            
            {/* Live Badge */}
            <div className="absolute top-6 left-6 z-20">
              <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                {t('video.live', 'En Vivo')}
              </div>
            </div>

            {/* Viewer Count Badge */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-2 text-white/80 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-md text-xs font-medium">
              <Eye className="h-4 w-4" />
              {((viewerCount || 0) / 1000).toFixed(1)}k {t('video.viewers', 'espectadores')}
            </div>

            {/* Video Player */}
            {hasAccess ? (
              <>
                {youtubeVideoId ? (
                  <>
                    {/* YouTube Player Container - Prevent click-through */}
                    <div 
                      className="absolute inset-0 z-10 pointer-events-none"
                      style={{ pointerEvents: 'none' }}
                    >
                      <div 
                        ref={youtubePlayerRef}
                        className="w-full h-full"
                        style={{ pointerEvents: 'none' }}
                      ></div>
                    </div>
                    {/* Overlay to prevent YouTube click-through */}
                    <div 
                      className="absolute inset-0 z-15 pointer-events-auto"
                      onClick={(e) => {
                        // Only allow clicks on our custom controls
                        const target = e.target as HTMLElement;
                        if (!target.closest('.custom-controls')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    ></div>
                  </>
                ) : video.bunny_embed_url || video.bunny_player_url ? (
                  <iframe
                    src={video.bunny_embed_url || video.bunny_player_url}
                    className="w-full h-full border-0 relative z-10"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                    title={video.title}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    className="w-full h-full relative z-10"
                    onPlay={() => {
                      setIsPlaying(true);
                      if (videoRef.current) {
                        videoRef.current.volume = volume;
                        videoRef.current.muted = isMuted;
                      }
                    }}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                      if (videoRef.current) {
                        videoRef.current.volume = volume;
                        videoRef.current.muted = isMuted;
                      }
                    }}
                  >
                    <source src={video.video_url_full || video.video_url || ''} type="video/mp4" />
                  </video>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 z-10">
                <div className="text-center space-y-4">
                  <Lock className="h-16 w-16 text-text-dim mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('video.premium_content')}</h3>
                    <p className="text-text-dim mb-4">{t('video.upgrade_plan_access')}</p>
                    <Button onClick={() => navigateWithLocale('/subscription')}>
                      {t('video.upgrade_now')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Controls Overlay */}
            {hasAccess && (
              <div className="absolute bottom-0 left-0 w-full z-20 p-6 pt-12 bg-gradient-to-t from-black to-transparent custom-controls">
                {/* Progress Bar */}
                <div 
                  className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer group/progress"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-primary rounded-full relative transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow"></div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handlePlayPause}
                      className="text-white hover:text-primary transition-colors"
                    >
                      {isPlaying ? (
                        <i className="fa-solid fa-pause text-[32px]"></i>
                      ) : (
                        <i className="fa-solid fa-play text-[32px]"></i>
                      )}
                    </button>
                    <div 
                      className="flex items-center gap-2 group/vol"
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <button 
                        onClick={toggleMute}
                        className="text-white hover:text-primary transition-colors"
                      >
                        {isMuted ? (
                          <i className="fa-solid fa-volume-x text-[24px]"></i>
                        ) : (
                          <i className="fa-solid fa-volume-up text-[24px]"></i>
                        )}
                      </button>
                      <div className={`w-0 overflow-hidden transition-all duration-300 ${showVolumeSlider ? 'w-20' : ''}`}>
                        <div 
                          className="h-1 bg-white/30 rounded-full w-16 ml-2 cursor-pointer"
                          onClick={handleVolumeChange}
                        >
                          <div 
                            className="h-full bg-white rounded-full"
                            style={{ width: `${volume * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-white/80 ml-2">LIVE</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="text-white hover:text-primary transition-colors" title={t('video.subtitles', 'Subtítulos')}>
                      <i className="fa-solid fa-closed-captioning text-[24px]"></i>
                    </button>
                    <button className="text-white hover:text-primary transition-colors" title={t('video.settings', 'Configuración')}>
                      <Settings className="h-6 w-6" />
                    </button>
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-primary transition-colors" 
                      title={t('video.fullscreen', 'Pantalla completa')}
                    >
                      <Maximize className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Info Section */}
          <div className="flex flex-col gap-2 px-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                  {video.title || t('video.live_exclusive', 'DIRECTO EXCLUSIVO')}
                </h1>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-3xl">
                  {video.description || video.short_description || t('video.live_description', 'Acompaña a Ana Rey en el proceso de aplicación del oro y las técnicas tradicionales de estofado al temple. Aprende cómo revelar los colores subyacentes rascando el oro con precisión milimétrica. Haz tus preguntas en el chat para que Ana las responda en tiempo real.')}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  <ThumbsUp className="h-5 w-5" />
                  <span>450</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gray-700 bg-cover bg-center border border-white/20" style={{ backgroundImage: `url(${getImageUrl((video.instructor as any)?.avatar || '')})` }}>
                  {!getImageUrl((video.instructor as any)?.avatar || '') && (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {getInitials(typeof video.instructor === 'object' ? video.instructor?.name : video.instructor || 'AR')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">
                    {typeof video.instructor === 'object' ? video.instructor?.name : video.instructor || 'Ana Rey'}
                  </span>
                  <span className="text-xs text-primary font-medium uppercase tracking-wide">
                    {typeof video.instructor === 'object' ? video.instructor?.title || t('video.master_gilder', 'Maestra Doradora') : t('video.master_gilder', 'Maestra Doradora')}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10 mx-2"></div>
              <div className="flex gap-2">
                {video.category && (
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    {video.category.name}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                  {t('video.masterclass', 'Masterclass')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat Section - 30% */}
        <div className="lg:col-span-3 h-[600px] lg:h-auto flex flex-col bg-[#1A1A1A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="px-4 py-3 bg-[#151515] border-b border-white/5 flex items-center justify-between shadow-md z-10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {t('video.live_chat', 'Chat en Directo')}
              <span className="size-1.5 bg-green-500 rounded-full"></span>
            </h2>
            <button className="text-gray-500 hover:text-white transition-colors">
              <i className="fa-solid fa-ellipsis-vertical text-[20px]"></i>
            </button>
          </div>

          {/* YouTube Live Chat or Custom Chat */}
          {youtubeVideoId ? (
            <iframe
              src={`https://www.youtube.com/live_chat?v=${youtubeVideoId}&embed_domain=${window.location.hostname}`}
              className="flex-1 w-full border-0"
              allow="autoplay"
              title="YouTube Live Chat"
            />
          ) : (
            <>
              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1A1A1A] flex flex-col-reverse"
              >
                {chatMessages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-2 ${index === 0 ? 'animate-fade-in-up' : ''}`}
                    style={{ opacity: `${msg.opacity}%` }}
                  >
                    <div className={`size-6 rounded-full ${getColorClass(msg.color)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                      {msg.user.initials}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${getTextColorClass(msg.color)} flex items-center gap-1`}>
                        {msg.user.name}
                        {msg.isOfficial && (
                          <span className="text-[10px] text-white bg-primary rounded-full p-[1px]">
                            <i className="fa-solid fa-check text-[8px]"></i>
                          </span>
                        )}
                      </span>
                      <p className="text-sm text-gray-200 leading-snug">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div className="text-center py-4">
                  <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest bg-[#151515] px-2 py-1 rounded">
                    {t('video.chat_started', 'Chat iniciado')} 19:00
                  </span>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-[#151515] border-t border-white/5 z-10">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 hover:text-white cursor-pointer transition-colors">🔥 {t('video.incredible', 'Increíble')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 hover:text-white cursor-pointer transition-colors">👏 {t('video.bravo', 'Bravo')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 hover:text-white cursor-pointer transition-colors">❤️ {t('video.love_it', 'Me encanta')}</span>
                  </div>
                  <div className="relative group">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={!user}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 pl-4 pr-12 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder={user ? t('video.write_something', 'Escribe algo...') : t('video.sign_in_to_chat', 'Inicia sesión para chatear')}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim() || !user}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-1 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-gray-600">{t('video.slow_mode_active', 'Modo lento activado')}</span>
                    <button className="text-gray-500 hover:text-primary transition-colors">
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default VideoPlayer;
