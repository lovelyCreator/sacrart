import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useIsMobile } from '@/hooks/use-mobile';
import { reelApi, Reel } from '@/services/videoApi';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Subtitles, Settings, Maximize, X } from 'lucide-react';
import { MultiLanguageAudioPlayer } from '@/components/MultiLanguageAudioPlayer';

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
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const isMobile = useIsMobile();
  
  const [reel, setReel] = useState<Reel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'episodios' | 'transcripcion'>('transcripcion');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileModalType, setMobileModalType] = useState<'videos' | 'transcription' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const bunnyPlayerRef = useRef<any>(null);

  // Transcription data - reels don't have transcription, so we'll show a placeholder
  const [transcription] = useState<TranscriptionSegment[]>([]);

  // Load Player.js library for Bunny.net iframe control
  useEffect(() => {
    // Check if Player.js is already loaded
    if ((window as any).playerjs) {
      return;
    }

    // Load Player.js script
    const script = document.createElement('script');
    script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
    script.async = true;
    script.onload = () => {
      // console.log('✅ Player.js library loaded');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Player.js library');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector('script[src*="playerjs"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  useEffect(() => {
    const fetchReel = async () => {
      try {
        setLoading(true);
        if (id) {
          const response = await reelApi.getPublicById(parseInt(id));
          if (response.success && response.data) {
            console.log('Reel data loaded:', response.data);
            console.log('Category reels:', response.data.category_reels);
            setReel(response.data);
          } else {
            toast.error(t('reel.reel_not_found', 'Reel not found'));
          }
        }
      } catch (error: any) {
        console.error('Error loading reel:', error);
        toast.error(error.message || t('reel.error_load', 'Error loading reel'));
      } finally {
        setLoading(false);
      }
    };

    fetchReel();
  }, [id]);

  // Initialize Bunny.net player when iframe loads
  useEffect(() => {
    if (!reel) return;
    
    const hasBunnyUrl = reel.bunny_embed_url || reel.bunny_player_url;
    if (!hasBunnyUrl) {
      return;
    }

    // Wait for Player.js to be available
    const initPlayer = () => {
      if (!(window as any).playerjs) {
        setTimeout(initPlayer, 100);
        return;
      }

      const iframe = document.getElementById(`bunny-iframe-${reel.id}`) as HTMLIFrameElement;
      if (!iframe) {
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        const player = new (window as any).playerjs.Player(iframe);
        bunnyPlayerRef.current = player;

        player.on('ready', () => {
          // Get duration from database (reel.duration)
          setDuration(reel.duration || 0);
          
          // Auto-play video
          setTimeout(() => {
            try {
              player.play();
              setIsPlaying(true);
            } catch (error) {
              console.log('Auto-play prevented:', error);
            }
          }, 100);
        });

        // Listen to timeupdate events to track current playback time
        player.on('timeupdate', (data: { seconds?: number }) => {
          if (data.seconds !== undefined) {
            setCurrentTime(data.seconds);
            if (reel.duration) {
              setProgress((data.seconds / reel.duration) * 100);
            }
          }
        });

        player.on('play', () => {
          setIsPlaying(true);
        });

        player.on('pause', () => {
          setIsPlaying(false);
        });

        player.on('ended', () => {
          setIsPlaying(false);
        });

        // Listen for settings events if Bunny.net player supports them
        // Note: These events may not be available in all Bunny.net player versions
        try {
          if (typeof player.on === 'function') {
            // Try to listen for settings-related events
            player.on('settingsopen', () => {
              console.log('Settings menu opened in Bunny.net player');
            });
            
            player.on('settingsclose', () => {
              console.log('Settings menu closed in Bunny.net player');
            });
          }
        } catch (error) {
          // Settings events might not be available, that's okay
          console.log('Settings events not available in Player.js');
        }

        // Handle playback errors
        player.on('error', (error: any) => {
          console.error('Bunny.net player error:', error);
          if (error && error.fatal === true) {
            toast.error(t('reel.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
          }
        });

        // Listen for iframe errors
        iframe.addEventListener('error', (e) => {
          console.error('Bunny.net iframe error:', e);
          toast.error(t('reel.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
        });
      } catch (error) {
        console.error('Error initializing Bunny.net player:', error);
        toast.error(t('reel.player_init_error', 'Error al inicializar el reproductor. Por favor, recargue la página.'));
      }
    };

    // Small delay to ensure iframe is loaded
    const timer = setTimeout(initPlayer, 500);

    return () => {
      clearTimeout(timer);
      bunnyPlayerRef.current = null;
    };
  }, [reel?.id, reel?.bunny_embed_url, reel?.bunny_player_url, reel?.duration, t]);

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
    // For Bunny.net videos, use Player.js API
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          bunnyPlayerRef.current.getPaused((paused: boolean) => {
            if (paused) {
              bunnyPlayerRef.current.play();
            } else {
              bunnyPlayerRef.current.pause();
            }
          });
        } catch (error) {
          console.error('Error controlling Bunny.net player:', error);
        }
      }
    } else if (videoRef.current) {
      // Fallback to HTML5 video
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    // For Bunny.net videos, use Player.js API
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          bunnyPlayerRef.current.setCurrentTime(newTime);
          setCurrentTime(newTime);
          setProgress(percentage * 100);
        } catch (error) {
          console.error('Error seeking Bunny.net player:', error);
        }
      }
    } else if (videoRef.current) {
      // Fallback to HTML5 video
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(percentage * 100);
    }
  };

  const handleTimeUpdate = () => {
    // Only used for HTML5 video fallback
    if (videoRef.current && !(reel && (reel.bunny_embed_url || reel.bunny_player_url))) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      setProgress((current / dur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    // Only used for HTML5 video fallback
    if (videoRef.current && !(reel && (reel.bunny_embed_url || reel.bunny_player_url))) {
      setDuration(videoRef.current.duration);
    }
  };

  // Helper to get translated value
  const getTranslatedValue = (reel: Reel, field: 'title' | 'description' | 'short_description'): string => {
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    if (reel.translations && reel.translations[field]) {
      return reel.translations[field][currentLocale as 'en' | 'es' | 'pt'] || 
             reel.translations[field].en || 
             (reel as any)[field] || '';
    }
    return (reel as any)[`${field}_${currentLocale}`] || (reel as any)[field] || '';
  };

  // Handle clicking on a category reel
  const handleReelClick = (reelId: number) => {
    // Navigate to the reel and it will auto-play
    navigateWithLocale(`/reel/${reelId}`);
  };

  // Handle "go" button click - play the video
  const handleGoClick = () => {
    // For Bunny.net videos, use Player.js API
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          bunnyPlayerRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing Bunny.net video:', error);
          toast.error(t('reel.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
        }
      }
    } else if (videoRef.current) {
      // Fallback to HTML5 video
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Error playing video:', error);
        toast.error('Error al reproducir el video');
      });
    }
  };

  // Handle replay button - restart video from beginning
  const handleReplay = () => {
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          bunnyPlayerRef.current.setCurrentTime(0);
          bunnyPlayerRef.current.play();
          setCurrentTime(0);
          setProgress(0);
          setIsPlaying(true);
        } catch (error) {
          console.error('Error replaying Bunny.net video:', error);
        }
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setCurrentTime(0);
      setProgress(0);
      setIsPlaying(true);
    }
  };

  // Handle subtitles button - toggle subtitles via Player.js
  const handleSubtitles = () => {
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          // Player.js doesn't have a direct subtitles toggle, but we can try to use the iframe's native controls
          // For now, just show a message
          toast.info(t('reel.subtitles_info', 'Los subtítulos se pueden controlar desde los controles del reproductor'));
        } catch (error) {
          console.error('Error toggling subtitles:', error);
        }
      }
    }
  };

  // Handle settings button - Try to open Bunny.net player settings
  const handleSettings = () => {
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      if (bunnyPlayerRef.current) {
        try {
          // Try using Player.js api method to open settings
          // Note: Bunny.net player may not expose this directly, but we can try
          if (typeof bunnyPlayerRef.current.api === 'function') {
            bunnyPlayerRef.current.api('openSettings');
          } else if (typeof bunnyPlayerRef.current.getSettings === 'function') {
            // Some players expose getSettings
            bunnyPlayerRef.current.getSettings();
          } else {
            // Try to send postMessage to the iframe to open settings
            const iframe = document.getElementById(`bunny-iframe-${reel.id}`) as HTMLIFrameElement;
            if (iframe && iframe.contentWindow) {
              // Send message to iframe to trigger settings menu
              iframe.contentWindow.postMessage({
                event: 'command',
                func: 'openSettings'
              }, '*');
              
              // Also try alternative message formats
              iframe.contentWindow.postMessage({
                method: 'openSettings'
              }, '*');
            } else {
              // Fallback: show info message
              toast.info(t('reel.settings_info', 'La configuración está disponible en los controles del reproductor'));
            }
          }
        } catch (error) {
          console.error('Error opening settings:', error);
          // Fallback: show info message
          toast.info(t('reel.settings_info', 'La configuración está disponible en los controles del reproductor'));
        }
      } else {
        toast.info(t('reel.settings_info', 'La configuración está disponible en los controles del reproductor'));
      }
    }
  };

  // Handle fullscreen button - enter fullscreen mode
  const handleFullscreen = () => {
    if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
      const iframe = document.getElementById(`bunny-iframe-${reel.id}`) as HTMLIFrameElement;
      if (iframe) {
        try {
          // Try to use Player.js fullscreen method if available
          if (bunnyPlayerRef.current && typeof bunnyPlayerRef.current.getFullscreen === 'function') {
            bunnyPlayerRef.current.getFullscreen((isFullscreen: boolean) => {
              if (isFullscreen) {
                bunnyPlayerRef.current.exitFullscreen();
              } else {
                bunnyPlayerRef.current.requestFullscreen();
              }
            });
          } else {
            // Fallback to native fullscreen API
            if (iframe.requestFullscreen) {
              iframe.requestFullscreen();
            } else if ((iframe as any).webkitRequestFullscreen) {
              (iframe as any).webkitRequestFullscreen();
            } else if ((iframe as any).mozRequestFullScreen) {
              (iframe as any).mozRequestFullScreen();
            } else if ((iframe as any).msRequestFullscreen) {
              (iframe as any).msRequestFullscreen();
            }
          }
        } catch (error) {
          console.error('Error entering fullscreen:', error);
          toast.error(t('reel.fullscreen_error', 'Error al entrar en pantalla completa'));
        }
      }
    } else if (videoRef.current) {
      // Fallback to HTML5 video fullscreen
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).mozRequestFullScreen) {
        (videoRef.current as any).mozRequestFullScreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get category reels (episodes)
  const categoryReels = reel?.category_reels || [];

  const thumbnailUrl = reel ? getImageUrl(reel.thumbnail_url || reel.thumbnail || reel.bunny_thumbnail_url || '') : '';
  const videoUrl = reel?.bunny_player_url || reel?.bunny_embed_url || reel?.bunny_video_url || '';

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245]"></div>
      </main>
    );
  }

  if (!reel) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p>{t('reel.reel_not_found', 'Reel not found')}</p>
      </main>
    );
  }

  const reelTitle = getTranslatedValue(reel, 'title');
  const reelDescription = getTranslatedValue(reel, 'description');
  const reelShortDesc = getTranslatedValue(reel, 'short_description');

  // Mobile view - Fullscreen video with modal buttons
  if (isMobile) {
    return (
      <main className="w-full h-[calc(100vh-80px)] bg-[#0A0A0A] text-white relative overflow-hidden">
        {/* Video Container - Reduced height to show buttons */}
        <div className="absolute inset-0 z-0">
          {reel && (reel.bunny_embed_url || reel.bunny_player_url) ? (
            <iframe
              key={`bunny-iframe-${reel.id}-${(i18n.language || locale || 'en').substring(0, 2)}`}
              id={`bunny-iframe-${reel.id}`}
              src={(() => {
                const embedUrl = reel.bunny_embed_url || reel.bunny_player_url || '';
                let finalUrl = embedUrl;
                if (embedUrl.includes('/play/')) {
                  const playMatch = embedUrl.match(/\/play\/(\d+)\/([^/?]+)/);
                  if (playMatch) {
                    const libraryId = playMatch[1];
                    const videoId = playMatch[2];
                    finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
                  }
                }
                const separator = finalUrl.includes('?') ? '&' : '?';
                // Enable controls and captions - Bunny.net will show its native control bar
                finalUrl = `${finalUrl}${separator}autoplay=true&responsive=true&controls=true`;
                
                // Add captions if available
                if (reel.caption_urls && Object.keys(reel.caption_urls).length > 0) {
                  const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
                  // Bunny.net uses 'defaultTextTrack' parameter to set the active caption language
                  // Must match the 'srclang' attribute of the caption track uploaded to Bunny.net
                  if (reel.caption_urls[currentLocale]) {
                    finalUrl += `&defaultTextTrack=${currentLocale}`;
                  } else if (reel.caption_urls['en']) {
                    finalUrl += `&defaultTextTrack=en`;
                  }
                }
                
                return finalUrl;
              })()}
              className="w-full h-full object-cover border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              title={reelTitle}
            />
          ) : videoUrl ? (
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
            <img src={thumbnailUrl} alt={reelTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20"></div>
        </div>

        {/* Multi-Language Audio Player */}
        {reel && reel.audio_urls && Object.keys(reel.audio_urls).length > 0 && (
          <div className="absolute top-4 right-4 left-4 z-20" key={`audio-player-mobile-${reel.id}-${i18n.language.substring(0, 2)}`}>
            <MultiLanguageAudioPlayer
              audioTracks={Object.entries(reel.audio_urls).map(([lang, url]) => ({
                language: lang,
                url: url as string,
                label: lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Português'
              }))}
              defaultLanguage={i18n.language.substring(0, 2) as 'en' | 'es' | 'pt'}
              videoRef={null}
            />
          </div>
        )}

        {/* Custom video controls hidden - using Bunny.net native controls */}

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
              {t('reel.episodes', 'Episodios')}
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
              {t('reel.transcription', 'Transcripción')}
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
                <h2 className="text-[#A05245] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">{t('reel.watching_now', 'Viendo Ahora')}</h2>
                <h3 className="font-serif font-bold text-xl text-white leading-tight">{reelTitle}</h3>
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
              {categoryReels.length > 0 ? (
                categoryReels.map((categoryReel, index) => {
                  const isActive = categoryReel.id === reel.id;
                  const reelTitle = getTranslatedValue(categoryReel, 'title');
                  const reelDesc = getTranslatedValue(categoryReel, 'short_description') || getTranslatedValue(categoryReel, 'description') || '';
                  const reelThumbnail = getImageUrl(categoryReel.intro_image_url || categoryReel.intro_image || categoryReel.thumbnail_url || categoryReel.thumbnail || '');
                  
                  return (
                    <div
                      key={categoryReel.id}
                      onClick={() => !isActive && handleReelClick(categoryReel.id)}
                      className={`group flex items-center gap-4 px-6 py-5 ${
                        isActive
                          ? 'bg-white/5 border-l-[3px] border-[#A05245]'
                          : 'border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Play className="h-6 w-6 text-[#A05245]" />
                          <div className="flex-1">
                            <h4 className="text-[#A05245] font-bold text-sm leading-snug">{reelTitle}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-[#A05245]/70 font-medium">{formatDuration(categoryReel.duration)}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-[#A05245]/50"></span>
                              <span className="text-[10px] uppercase tracking-wider text-[#A05245]/70 font-medium">{t('reel.playing', 'Reproduciendo')}</span>
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
                            <h4 className="text-white font-medium text-sm leading-snug group-hover:text-[#A05245] transition-colors">{reelTitle}</h4>
                            <span className="text-[10px] font-mono text-gray-500 mt-1 block">{formatDuration(categoryReel.duration)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  {t('reel.no_episodes', 'No hay más episodios en esta categoría')}
                </div>
              )}
            </div>
          )}

            {/* Transcription List (shown when transcription modal is open) */}
            {showMobileModal && mobileModalType === 'transcription' && (
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
                {transcription.length > 0 ? (
                  transcription.map((segment, index) => (
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
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">{t('reel.no_transcription', 'No hay transcripción disponible para este reel')}</p>
                  </div>
                )}
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
          {reel && (reel.bunny_embed_url || reel.bunny_player_url) ? (
            <iframe
              key={`bunny-iframe-mobile-${reel.id}-${(i18n.language || locale || 'en').substring(0, 2)}`}
              id={`bunny-iframe-${reel.id}`}
              src={(() => {
                const embedUrl = reel.bunny_embed_url || reel.bunny_player_url || '';
                let finalUrl = embedUrl;
                if (embedUrl.includes('/play/')) {
                  const playMatch = embedUrl.match(/\/play\/(\d+)\/([^/?]+)/);
                  if (playMatch) {
                    const libraryId = playMatch[1];
                    const videoId = playMatch[2];
                    finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
                  }
                }
                const separator = finalUrl.includes('?') ? '&' : '?';
                // Enable controls and captions - Bunny.net will show its native control bar
                finalUrl = `${finalUrl}${separator}autoplay=true&responsive=true&controls=true`;
                
                // Add captions if available
                if (reel.caption_urls && Object.keys(reel.caption_urls).length > 0) {
                  const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
                  // Bunny.net uses 'defaultTextTrack' parameter to set the active caption language
                  // Must match the 'srclang' attribute of the caption track uploaded to Bunny.net
                  if (reel.caption_urls[currentLocale]) {
                    finalUrl += `&defaultTextTrack=${currentLocale}`;
                  } else if (reel.caption_urls['en']) {
                    finalUrl += `&defaultTextTrack=en`;
                  }
                }
                
                return finalUrl;
              })()}
              className="w-full h-full object-cover border-0 opacity-90"
              style={{ width: '100%', height: '100%' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              title={reelTitle}
            />
          ) : videoUrl ? (
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
              alt={reelTitle}
              className="w-full h-full object-cover opacity-90"
              src={thumbnailUrl}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
          )}
          {/*<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20"></div>
          
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
          </div> */}

          {/* Video Controls */}
          {/* <div className="absolute bottom-0 left-0 right-0 p-6">
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
                <button onClick={handleReplay} className="hover:text-[#A05245] transition-colors">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <span className="text-xs font-mono text-gray-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleSubtitles} className="hover:text-[#A05245] transition-colors">
                  <Subtitles className="h-5 w-5" />
                </button>
                <button onClick={handleSettings} className="hover:text-[#A05245] transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
                <button onClick={handleFullscreen} className="hover:text-[#A05245] transition-colors">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div> */}
        </div>

        {/* Multi-Language Audio Player */}
        {reel && reel.audio_urls && Object.keys(reel.audio_urls).length > 0 && (
          <div className="mt-6" key={`audio-player-desktop-${reel.id}-${i18n.language.substring(0, 2)}`}>
            <MultiLanguageAudioPlayer
              audioTracks={Object.entries(reel.audio_urls).map(([lang, url]) => ({
                language: lang,
                url: url as string,
                label: lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Português'
              }))}
              defaultLanguage={i18n.language.substring(0, 2) as 'en' | 'es' | 'pt'}
              videoRef={null}
            />
          </div>
        )}
      </div>

      {/* Right Side - Content (60%) */}
      <div className="relative z-10 w-[60%] h-full bg-[#0A0A0A] flex flex-col">
        <div className="px-12 pt-12 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold tracking-widest uppercase text-[#A05245]">{t('reel.original_series', 'Serie Original')}</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{t('reel.season', 'Temporada')} 1</span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
            {reelTitle}
          </h1>
          {reelShortDesc && (
            <h2 className="text-lg text-gray-400 font-light flex items-center gap-2">
              {reelShortDesc}
            </h2>
          )}
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
            {t('reel.episodes', 'Episodios')}
          </button>
          <button
            onClick={() => setActiveTab('transcripcion')}
            className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
              activeTab === 'transcripcion'
                ? 'text-white border-b-2 border-[#A05245]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('reel.transcription', 'Transcripción')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto relative">
          {activeTab === 'transcripcion' ? (
            <div className="px-12 py-10 space-y-8 max-w-3xl">
              {transcription.length > 0 ? (
                transcription.map((segment, index) => (
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
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-base">{t('reel.no_transcription', 'No hay transcripción disponible para este reel')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-12 py-8">
              {categoryReels.length > 0 ? (
                categoryReels.map((categoryReel, index) => {
                  const isActive = categoryReel.id === reel.id;
                  const reelTitle = getTranslatedValue(categoryReel, 'title');
                  const reelDesc = getTranslatedValue(categoryReel, 'short_description') || getTranslatedValue(categoryReel, 'description') || '';
                  const reelThumbnail = getImageUrl(categoryReel.intro_image_url || categoryReel.intro_image || categoryReel.thumbnail_url || categoryReel.thumbnail || '');
                  
                  return (
                    <div
                      key={categoryReel.id}
                      onClick={() => !isActive && handleReelClick(categoryReel.id)}
                      className={`flex items-start gap-5 py-6 border-b border-white/5 group cursor-pointer ${
                        isActive
                          ? ''
                          : 'hover:bg-white/5 transition-colors -mx-4 px-4 rounded-lg'
                      }`}
                    >
                      <div className="relative w-32 aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0">
                        <img
                          className={`w-full h-full object-cover ${
                            isActive ? 'opacity-60' : 'group-hover:scale-105 transition-transform duration-500'
                          }`}
                          src={reelThumbnail}
                          alt={reelTitle}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/320x180?text=No+Image';
                          }}
                        />
                        {isActive ? (
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
                            isActive
                              ? 'text-[#A05245]'
                              : 'text-white group-hover:text-[#A05245] transition-colors'
                          }`}>
                            {String(index + 1).padStart(2, '0')}. {reelTitle}
                          </h3>
                          <span className="text-[10px] font-mono text-gray-500">{formatDuration(categoryReel.duration)}</span>
                        </div>
                        {reelDesc && (
                          <p className={`text-xs line-clamp-2 leading-relaxed ${
                            isActive
                              ? 'text-gray-400'
                              : 'text-gray-500 group-hover:text-gray-400'
                          }`}>
                            {reelDesc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">{t('reel.no_episodes', 'No hay más episodios en esta categoría')}</p>
                </div>
              )}
            </div>
          )}
          <div className="sticky bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>
        </div>
      </div>
    </main>
  );
};

export default ReelDetail;

