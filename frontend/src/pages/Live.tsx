import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useIsMobile } from '@/hooks/use-mobile';
import { settingsApi } from '@/services/settingsApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Youtube, Clock, Users, MessageCircle, Play, Pause, Volume2, VolumeX, Settings, Maximize, ThumbsUp } from 'lucide-react';
import { hasMarketingConsent } from '@/utils/cookieConsent';

// Declare YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const Live = () => {
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [liveSettings, setLiveSettings] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [youtubeAPIReady, setYoutubeAPIReady] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState<string>('auto');
  const [captionLanguage, setCaptionLanguage] = useState<string>('en');
  // On mobile, show YouTube native controls by default for better UX
  const [showYouTubeControls, setShowYouTubeControls] = useState(() => {
    // Check if mobile on initial render
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [liveChatId, setLiveChatId] = useState<string | null>(null);
  
  // Common caption languages with their display names
  const captionLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिन्दी' },
  ];
  
  const youtubePlayerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Extract YouTube channel ID from URL
  const extractYouTubeChannelId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /youtube\.com\/channel\/([^\/\?&]+)/,
      /youtube\.com\/c\/([^\/\?&]+)/,
      /youtube\.com\/@([^\/\?&]+)/,
      /^([a-zA-Z0-9_-]+)$/ // Direct channel ID or handle
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  useEffect(() => {
    const fetchLiveSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsApi.getPublicSettings(locale);
        
        if (response.success && response.data) {
          const settings = response.data;
          const isEnabled = typeof settings.youtube_live_enabled === 'boolean' 
            ? settings.youtube_live_enabled 
            : typeof settings.youtube_live_enabled === 'string'
            ? (settings.youtube_live_enabled === 'true' || settings.youtube_live_enabled === '1')
            : typeof settings.youtube_live_enabled === 'number'
            ? settings.youtube_live_enabled === 1
            : false;
          
          const liveData = {
            videoUrl: settings.youtube_live_video_url || '',
            channelId: settings.youtube_channel_id || '',
            channelUrl: settings.youtube_channel_url || '',
            isEnabled,
          };
          
          setLiveSettings(liveData);
          // Only set isLive if both enabled flag is true AND video URL is provided
          // This ensures we only show live stream when actually streaming
          setIsLive(liveData.isEnabled && liveData.videoUrl && liveData.videoUrl.trim() !== '');
        }
      } catch (error) {
        console.error('Error fetching live settings:', error);
        toast.error(t('live.error_loading', 'Failed to load live stream'));
      } finally {
        setLoading(false);
      }
    };

    fetchLiveSettings();
  }, [locale, t]);

  const videoId = liveSettings?.videoUrl ? extractYouTubeVideoId(liveSettings.videoUrl) : null;
  const channelId = liveSettings?.channelId ? extractYouTubeChannelId(liveSettings.channelId) : null;
  const [hasConsent, setHasConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Load YouTube IFrame API only if user has consented to marketing cookies
  useEffect(() => {
    const checkConsent = () => {
      const consent = hasMarketingConsent();
      setHasConsent(consent);
      setConsentChecked(true);
      
      // Load YouTube API if consent is given
      if (consent && !window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          setYoutubeAPIReady(true);
        };
      } else if (consent && window.YT) {
        setYoutubeAPIReady(true);
      }
    };

    checkConsent();

    // Listen for consent updates
    const handleConsentUpdate = () => {
      checkConsent();
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate);
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate);
    };
  }, []);

  // Initialize YouTube player (only if consent given and video ID available)
  useEffect(() => {
    if (!hasMarketingConsent() || !videoId) {
      return;
    }

    if (youtubeAPIReady && videoId && youtubePlayerRef.current && !youtubePlayer) {
      try {
        // On mobile, show YouTube native controls by default for better UX
        // On desktop, use custom controls by default
        // showYouTubeControls: true = show native, false = show custom
        const showNativeControls = showYouTubeControls;
        
        const player = new window.YT.Player(youtubePlayerRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: showNativeControls ? 1 : 0, // Show YouTube controls on mobile, hide on desktop
            disablekb: showNativeControls ? 0 : 1, // Enable keyboard controls if native controls are shown
            enablejsapi: 1, // Enable JavaScript API
            fs: showNativeControls ? 1 : 0, // Enable fullscreen button on mobile
            iv_load_policy: 3, // Hide annotations
            modestbranding: 1,
            playsinline: 1,
            rel: 0, // Don't show related videos
            cc_load_policy: 1, // Show captions by default when available (1 = show, 0 = hide)
            cc_lang_pref: locale.substring(0, 2), // Preferred caption language
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
              // Enable captions module and set initial state
              try {
                // Load captions module
                if (event.target.loadModule) {
                  event.target.loadModule('captions');
                }
                
                // Set captions to enabled by default (since cc_load_policy is 1)
                setCaptionsEnabled(true);
                
                // Try to get current caption language
                try {
                  if (event.target.getOption) {
                    const tracks = event.target.getOption('captions')?.tracklist;
                    if (tracks && tracks.length > 0) {
                      const currentTrack = tracks.find((t: any) => t.active) || tracks[0];
                      if (currentTrack && currentTrack.languageCode) {
                        setCaptionLanguage(currentTrack.languageCode);
                      }
                    }
                  }
                } catch (e) {
                  // If we can't get tracks, use default or current locale
                  const currentLocale = locale.substring(0, 2);
                  if (captionLanguages.find(l => l.code === currentLocale)) {
                    setCaptionLanguage(currentLocale);
                  }
                }
              } catch (error) {
                console.log('Could not initialize captions:', error);
                // Set captions as enabled anyway since cc_load_policy is 1
                setCaptionsEnabled(true);
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.PLAYING = 1, YT.PlayerState.PAUSED = 2, YT.PlayerState.ENDED = 0
              setIsPlaying(event.data === 1);
            },
            onApiChange: (event: any) => {
              // This event fires when the player API is ready
              try {
                // Try to get video data for viewer count and likes
                if (event.target.getVideoData) {
                  const videoData = event.target.getVideoData();
                  // Note: YouTube API doesn't directly provide viewer count for live streams
                  // We'll need to use YouTube Data API v3 for this
                }
              } catch (error) {
                console.log('Could not get video data:', error);
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              toast.error(t('live.youtube_error', 'Error loading YouTube live stream'));
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    }
  }, [youtubeAPIReady, videoId, youtubePlayer, volume, isMuted, showYouTubeControls, isMobile, t]);

  // Fetch real viewer count and like count using YouTube Data API
  useEffect(() => {
    if (!videoId || !hasMarketingConsent()) return;

    const fetchVideoStats = async () => {
      try {
        const result = await settingsApi.getYouTubeStats(videoId);
        
        if (result.success && result.data) {
          // Update viewer count (prefer concurrentViewers for live streams, fallback to viewCount)
          if (result.data.concurrentViewers !== null) {
            setViewerCount(result.data.concurrentViewers);
          } else if (result.data.viewCount !== null) {
            setViewerCount(result.data.viewCount);
          }
          
          // Update like count
          if (result.data.likeCount !== null) {
            setLikeCount(result.data.likeCount);
          }
          
          // Update live chat ID if available (from API response top level)
          if (result.liveChatId) {
            setLiveChatId(result.liveChatId);
          }
        }
      } catch (error) {
        console.error('Error fetching video stats:', error);
        // Don't show error to user, just log it
      }
    };

    // Fetch immediately
    fetchVideoStats();

    // Update stats every 30 seconds
    const interval = setInterval(fetchVideoStats, 30000);
    return () => clearInterval(interval);
  }, [videoId, hasMarketingConsent]);

  // Toggle YouTube control bar
  const handleToggleControls = () => {
    if (!youtubePlayer || !videoId) return;
    
    const newState = !showYouTubeControls;
    setShowYouTubeControls(newState);
    
    // Recreate player with new controls setting
    // Note: YouTube API doesn't allow changing controls dynamically
    // We need to recreate the player
    try {
      // Store current state
      const wasPlaying = isPlaying;
      const currentVol = volume;
      const wasMuted = isMuted;
      
      // Destroy current player
      if (youtubePlayer.destroy) {
        youtubePlayer.destroy();
      }
      
      // Reset player state
      setYoutubePlayer(null);
      
      // Recreate player with new controls setting
      // On mobile: show native controls when showYouTubeControls is false (default)
      // On desktop: show native controls when showYouTubeControls is true (toggled)
      const shouldShowNativeControls = isMobile ? !newState : newState;
      
      setTimeout(() => {
        if (youtubePlayerRef.current && window.YT) {
          const player = new window.YT.Player(youtubePlayerRef.current, {
            videoId: videoId,
            playerVars: {
              autoplay: wasPlaying ? 1 : 0,
              controls: shouldShowNativeControls ? 1 : 0,
              disablekb: shouldShowNativeControls ? 0 : 1,
              enablejsapi: 1,
              fs: shouldShowNativeControls ? 1 : 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              cc_load_policy: captionsEnabled ? 1 : 0,
              cc_lang_pref: captionLanguage,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                setYoutubePlayer(event.target);
                event.target.setVolume(currentVol * 100);
                if (wasMuted) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
                if (wasPlaying) {
                  event.target.playVideo();
                }
                // Re-enable captions if they were enabled
                if (captionsEnabled && event.target.loadModule) {
                  event.target.loadModule('captions');
                  event.target.setOption('captions', true);
                }
              },
              onStateChange: (event: any) => {
                setIsPlaying(event.data === 1);
              },
              onError: (event: any) => {
                console.error('YouTube player error:', event.data);
                toast.error(t('live.youtube_error', 'Error loading YouTube live stream'));
              }
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error toggling controls:', error);
      toast.error(t('live.controls_toggle_error', 'Error toggling controls'));
    }
  };

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
        // Ignore errors (video might not be ready or live stream)
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [youtubePlayer, isPlaying]);

  // Player control functions
  const handlePlayPause = () => {
    if (!youtubePlayer) return;
    if (isPlaying) {
      youtubePlayer.pauseVideo();
    } else {
      youtubePlayer.playVideo();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    const containerElement = playerContainerRef.current;
    if (!containerElement) return;

    if (!document.fullscreenElement) {
      containerElement.requestFullscreen().catch((err: Error) => {
        console.error('Error attempting to enable fullscreen:', err);
        toast.error(t('live.fullscreen_error', 'Could not enter fullscreen mode'));
      });
    } else {
      document.exitFullscreen().catch((err: Error) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Update UI if needed when fullscreen changes
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettings) {
        const target = event.target as HTMLElement;
        if (!target.closest('.settings-dropdown-container')) {
          setShowSettings(false);
        }
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const handleToggleCaptions = () => {
    if (!youtubePlayer) return;
    
    try {
      const newState = !captionsEnabled;
      
      // Enable/disable captions using YouTube IFrame API
      // Method 1: Use loadModule and setOption (recommended)
      if (youtubePlayer.loadModule && youtubePlayer.setOption) {
        try {
          // Load captions module first
          youtubePlayer.loadModule('captions');
          
          // Set captions option
          youtubePlayer.setOption('captions', {
            'reload': newState
          });
          
          // Also try the simpler method
          youtubePlayer.setOption('captions', newState);
          
          setCaptionsEnabled(newState);
          toast.success(newState 
            ? t('live.captions_on', 'Subtítulos activados') 
            : t('live.captions_off', 'Subtítulos desactivados')
          );
        } catch (e) {
          // Fallback method
          console.log('Primary caption method failed, trying fallback:', e);
          try {
            // Alternative: Use setOption with different structure
            if (newState) {
              youtubePlayer.setOption('captions', true);
              // Also try to show captions by setting track
              if (captionLanguage) {
                youtubePlayer.setOption('cc_lang_pref', captionLanguage);
              }
            } else {
              youtubePlayer.setOption('captions', false);
            }
            setCaptionsEnabled(newState);
            toast.success(newState 
              ? t('live.captions_on', 'Subtítulos activados') 
              : t('live.captions_off', 'Subtítulos desactivados')
            );
          } catch (e2) {
            console.error('All caption methods failed:', e2);
            toast.warning(t('live.captions_limited', 'Caption control may be limited. Try using YouTube player settings.'));
          }
        }
      } else {
        // If API methods aren't available, show info message
        toast.info(t('live.captions_api_unavailable', 'Caption control requires YouTube IFrame API. Please refresh the page.'));
      }
    } catch (error) {
      console.error('Error toggling captions:', error);
      toast.error(t('live.captions_error', 'Error al cambiar subtítulos'));
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!youtubePlayer) return;
    try {
      youtubePlayer.setPlaybackRate(rate);
      setPlaybackRate(rate);
      setShowSettings(false);
      toast.success(`${t('live.playback_speed', 'Playback Speed')}: ${rate}x`);
    } catch (error) {
      console.error('Error changing playback rate:', error);
      toast.error(t('live.playback_rate_error', 'Error changing playback speed'));
    }
  };

  const handleCaptionLanguageChange = (languageCode: string) => {
    if (!youtubePlayer) return;
    
    try {
      // Enable captions first if they're disabled
      if (!captionsEnabled) {
        if (youtubePlayer.setOption) {
          youtubePlayer.setOption('captions', true);
        }
        setCaptionsEnabled(true);
      }
      
      // Set caption language using YouTube IFrame API
      // Method 1: Try using setOption with captions track
      if (youtubePlayer.setOption) {
        try {
          // Get available caption tracks
          const tracks = youtubePlayer.getOption('captions')?.tracklist;
          if (tracks && Array.isArray(tracks)) {
            // Find the track with the matching language code
            const targetTrack = tracks.find((track: any) => 
              track.languageCode === languageCode || 
              track.languageCode?.startsWith(languageCode)
            );
            
            if (targetTrack) {
              // Set the active track
              youtubePlayer.setOption('captions', {
                track: { languageCode: languageCode }
              });
              setCaptionLanguage(languageCode);
              const languageName = captionLanguages.find(l => l.code === languageCode)?.name || languageCode;
              toast.success(`${t('live.caption_language_changed', 'Caption language changed')}: ${languageName}`);
              return;
            }
          }
          
          // Method 2: Try setting language preference directly
          try {
            youtubePlayer.setOption('cc_lang_pref', languageCode);
            setCaptionLanguage(languageCode);
            const languageName = captionLanguages.find(l => l.code === languageCode)?.name || languageCode;
            toast.success(`${t('live.caption_language_changed', 'Caption language changed')}: ${languageName}`);
          } catch (e) {
            // Method 3: Use loadModule if available
            if (youtubePlayer.loadModule) {
              try {
                youtubePlayer.loadModule('captions');
                // Note: YouTube API doesn't have a direct method to change caption language
                // The language is usually set via URL parameters or player initialization
                toast.info(t('live.caption_language_note', 'Caption language change may require reloading the player'));
              } catch (e2) {
                console.error('Could not change caption language:', e2);
                toast.warning(t('live.caption_language_limited', 'Caption language selection may be limited. Use YouTube player settings for more options.'));
              }
            }
          }
        } catch (error) {
          console.error('Error changing caption language:', error);
          toast.warning(t('live.caption_language_limited', 'Caption language selection may be limited. Use YouTube player settings for more options.'));
        }
      }
    } catch (error) {
      console.error('Error changing caption language:', error);
      toast.error(t('live.caption_language_error', 'Error changing caption language'));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!youtubePlayer || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    youtubePlayer.seekTo(newTime, true);
  };

  if (loading) {
    return (
      <main className="flex-1 w-full pt-0 bg-[#0a0a0a] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  // Not live - show message and link to archive
  if (!isLive || !videoId) {
    return (
      <main className="flex-1 w-full pt-20 bg-[#0a0a0a] min-h-screen">
        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-2xl">
                  <Youtube className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-3 border-4 border-[#0a0a0a]">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('live.not_streaming', 'No estamos en directo ahora')}
              </h1>
              <p className="text-xl text-gray-400">
                {t('live.check_archive', 'Pero puedes ver nuestros directos anteriores en el archivo')}
              </p>
            </div>

            {/* YouTube Channel Link */}
            {liveSettings?.channelUrl && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <p className="text-gray-300 mb-4">
                  {t('live.subscribe_notification', 'Suscríbete a nuestro canal de YouTube para recibir notificaciones cuando iniciemos un directo')}
                </p>
                <a
                  href={liveSettings.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                  {t('live.visit_channel', 'Visitar Canal de YouTube')}
                </a>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={() => navigateWithLocale('/directos')}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-bold rounded-xl"
              >
                {t('live.view_archive', 'Ver Archivo de Directos')}
              </Button>
              <Button
                onClick={() => navigateWithLocale('/')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-xl"
              >
                {t('live.back_home', 'Volver al Inicio')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Live stream is active
  return (
    <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1800px] mx-auto w-full flex-1 flex flex-col h-full min-h-[calc(100vh-80px)] bg-[#0A0A0A]">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 flex-1 h-full">
        {/* Video Player Section - Takes 7/10 on large screens */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full">
          {/* Video Player */}
          <div ref={playerContainerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
            {/* YouTube iframe or cookie consent overlay */}
            {consentChecked && !hasConsent ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <div className="text-center p-8 max-w-md">
                  <div className="mb-4">
                    <i className="fa-solid fa-cookie text-4xl text-primary mb-4"></i>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t('live.cookie_consent_required', 'Consentimiento de Cookies Requerido')}
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {t('live.cookie_consent_message', 
                      'Para ver el directo de YouTube, necesitamos su consentimiento para cookies de marketing. Por favor, acepte las cookies en el banner de cookies.'
                    )}
                  </p>
                  <Button
                    onClick={() => {
                      localStorage.removeItem('cookie-consent');
                      window.location.reload();
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {t('live.manage_cookies', 'Gestionar Cookies')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* YouTube Player Container */}
                <div ref={youtubePlayerRef} className="absolute inset-0 w-full h-full"></div>
                {/* Live Badge - Top Left */}
                <div className="absolute top-6 left-6 z-20">
                  <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-900/20">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    {t('live.live_now', 'En Vivo')}
                  </div>
                </div>
                {/* Viewer Count - Top Right */}
                {viewerCount !== null && (
                  <div className="absolute top-6 right-6 z-20 flex items-center gap-2 text-white/80 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-md text-xs font-medium">
                    <Users className="w-3 h-3" />
                    <span>
                      {viewerCount >= 1000 
                        ? `${(viewerCount / 1000).toFixed(1)}k ${t('live.viewers', 'espectadores')}`
                        : `${viewerCount} ${t('live.viewers', 'espectadores')}`
                      }
                    </span>
                  </div>
                )}
                {/* Video Controls - Bottom (Hidden on mobile when using native controls) */}
                {(!isMobile || showYouTubeControls) && (
                <div className="absolute bottom-0 left-0 w-full z-20 p-4 md:p-6 pt-8 md:pt-12 bg-gradient-to-t from-black to-transparent">
                  {/* Progress Bar - For live streams, show a pulsing indicator */}
                  <div 
                    className="w-full h-1 md:h-1.5 bg-white/20 rounded-full mb-3 md:mb-4 cursor-pointer group/progress touch-manipulation"
                    onClick={duration > 0 ? handleProgressClick : undefined}
                    onTouchEnd={duration > 0 ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const touch = e.changedTouches[0];
                      const clickX = touch.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                      if (youtubePlayer && duration > 0) {
                        youtubePlayer.seekTo(duration * percentage, true);
                      }
                    } : undefined}
                  >
                    <div 
                      className="h-full bg-primary rounded-full relative transition-all"
                      style={{ 
                        width: duration > 0 
                          ? `${(currentTime / duration) * 100}%` 
                          : '98%',
                        animation: duration === 0 ? 'pulse 2s ease-in-out infinite' : 'none'
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow"></div>
                    </div>
                  </div>
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                      <button 
                        onClick={handlePlayPause}
                        className="text-white hover:text-primary transition-colors touch-manipulation p-1"
                        title={isPlaying ? t('live.pause', 'Pausar') : t('live.play', 'Reproducir')}
                      >
                        {isPlaying ? <Pause className="w-7 h-7 md:w-8 md:h-8" /> : <Play className="w-7 h-7 md:w-8 md:h-8" />}
                      </button>
                      <div 
                        className="flex items-center gap-2 group/vol"
                        onMouseEnter={() => !isMobile && setShowVolumeSlider(true)}
                        onMouseLeave={() => !isMobile && setShowVolumeSlider(false)}
                        onTouchStart={() => isMobile && setShowVolumeSlider(true)}
                      >
                        <button 
                          onClick={handleMuteToggle}
                          className="text-white hover:text-primary transition-colors touch-manipulation"
                          title={isMuted ? t('live.unmute', 'Activar sonido') : t('live.mute', 'Silenciar')}
                        >
                          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${showVolumeSlider || isMobile ? 'w-20' : 'w-0'}`}>
                          <div 
                            className="h-1 bg-white/30 rounded-full w-16 ml-2 cursor-pointer touch-manipulation"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                              handleVolumeChange(percentage);
                            }}
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const touch = e.changedTouches[0];
                              const clickX = touch.clientX - rect.left;
                              const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                              handleVolumeChange(percentage);
                            }}
                          >
                            <div 
                              className="h-full bg-white rounded-full transition-all"
                              style={{ width: `${volume * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-white/80 ml-2 hidden sm:inline">LIVE</span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                      <button 
                        onClick={handleToggleCaptions}
                        className={`transition-colors touch-manipulation p-1 ${captionsEnabled ? 'text-primary' : 'text-white hover:text-primary'}`}
                        title={captionsEnabled ? t('live.subtitles_off', 'Desactivar subtítulos') : t('live.subtitles', 'Activar subtítulos')}
                      >
                        <i className="fa-solid fa-closed-captioning text-[20px] md:text-[24px]"></i>
                      </button>
                      <div className="relative settings-dropdown-container">
                        <button 
                          onClick={() => setShowSettings(!showSettings)}
                          className={`transition-colors touch-manipulation p-1 ${showSettings ? 'text-primary' : 'text-white hover:text-primary'}`}
                          title={t('live.settings', 'Configuración')}
                        >
                          <Settings className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        {/* Settings Dropdown */}
                        {showSettings && (
                          <div className="absolute bottom-full right-0 mb-2 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl p-4 min-w-[200px] z-30">
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                  {t('live.playback_speed', 'Velocidad de reproducción')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                                    <button
                                      key={rate}
                                      onClick={() => handlePlaybackRateChange(rate)}
                                      className={`px-3 py-1 rounded text-sm transition-colors ${
                                        playbackRate === rate
                                          ? 'bg-primary text-white'
                                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                      }`}
                                    >
                                      {rate}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Caption Language Selection */}
                              <div className="pt-3 border-t border-white/10">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                  {t('live.caption_language', 'Caption Language')}
                                </label>
                                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                  <div className="space-y-1">
                                    {captionLanguages.map((lang) => (
                                      <button
                                        key={lang.code}
                                        onClick={() => handleCaptionLanguageChange(lang.code)}
                                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                                          captionLanguage === lang.code
                                            ? 'bg-primary text-white'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                        }`}
                                      >
                                        {lang.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-white/10">
                                <button
                                  onClick={() => {
                                    if (youtubePlayer) {
                                      try {
                                        const qualities = youtubePlayer.getAvailableQualityLevels();
                                        if (qualities && qualities.length > 0) {
                                          // Cycle through qualities
                                          const currentIndex = qualities.indexOf(quality);
                                          const nextIndex = (currentIndex + 1) % qualities.length;
                                          const nextQuality = qualities[nextIndex];
                                          youtubePlayer.setPlaybackQuality(nextQuality);
                                          setQuality(nextQuality);
                                          toast.success(`${t('live.change_quality', 'Change Quality')}: ${nextQuality}`);
                                        }
                                      } catch (error) {
                                        console.error('Error changing quality:', error);
                                      }
                                    }
                                  }}
                                  className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded text-sm transition-colors"
                                >
                                  {t('live.change_quality', 'Cambiar calidad')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleFullscreen}
                        className="text-white hover:text-primary transition-colors touch-manipulation p-1" 
                        title={t('live.fullscreen', 'Pantalla completa')}
                      >
                        <Maximize className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                      {/* Toggle Controls Button - Only show on mobile */}
                      {isMobile && (
                        <button
                          onClick={handleToggleControls}
                          className="text-white hover:text-primary transition-colors touch-manipulation p-1"
                          title={showYouTubeControls ? t('live.hide_controls', 'Ocultar controles de YouTube') : t('live.show_controls', 'Mostrar controles de YouTube')}
                        >
                          <i className={`fa-solid ${showYouTubeControls ? 'fa-eye-slash' : 'fa-eye'} text-[20px]`}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </>
            )}
          </div>

          {/* Video Info Section */}
          <div className="flex flex-col gap-2 px-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                  {t('live.stream_title', 'DIRECTO EXCLUSIVO: TÉCNICAS DE ESTOFADO')}
                </h1>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-3xl">
                  {t('live.stream_description', 'Acompaña a Ana Rey en el proceso de aplicación del oro y las técnicas tradicionales de estofado al temple. Aprende cómo revelar los colores subyacentes rascando el oro con precisión milimétrica. Haz tus preguntas en el chat para que Ana las responda en tiempo real.')}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {likeCount !== null && (
                  <button className="flex items-center gap-2 bg-[#A05245] hover:bg-[#8e493e] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <ThumbsUp className="w-5 h-5" />
                    <span>
                      {likeCount >= 1000 
                        ? `${(likeCount / 1000).toFixed(1)}k`
                        : likeCount.toLocaleString()
                      }
                    </span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gray-700 bg-cover bg-center border border-white/20"></div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{t('live.instructor_name', 'Ana Rey')}</span>
                  <span className="text-xs text-primary font-medium uppercase tracking-wide">{t('live.instructor_title', 'Maestra Doradora')}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10 mx-2"></div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">{t('live.tag_policromia', 'Policromía')}</span>
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">{t('live.tag_oro', 'Oro Fino')}</span>
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-wider font-bold">{t('live.tag_masterclass', 'Masterclass')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat Section - Takes 3/10 on large screens */}
        <div className="lg:col-span-3 h-[600px] lg:h-auto flex flex-col bg-[#1A1A1A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-[#151515] border-b border-white/5 flex items-center justify-between shadow-md z-10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {t('live.live_chat', 'Chat en Directo')}
              <span className="size-1.5 bg-green-500 rounded-full"></span>
            </h2>
            <button className="text-gray-500 hover:text-white transition-colors">
              <i className="fa-solid fa-ellipsis-vertical text-[20px]"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1A1A1A]">
            {consentChecked && !hasConsent ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center p-4">
                {t('live.cookie_required_for_chat', 'Se requiere consentimiento de cookies para ver el chat')}
              </div>
            ) : !videoId ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center p-4">
                {t('live.chat_unavailable', 'Chat no disponible')}
              </div>
            ) : !liveChatId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center p-4">
                <MessageCircle className="h-12 w-12 mb-4 text-gray-600" />
                <p className="font-semibold mb-2">{t('live.chat_disabled', 'Chat deshabilitado')}</p>
                <p className="text-xs text-gray-500 max-w-md">
                  {t('live.chat_disabled_message', 'El chat está deshabilitado para esta transmisión en vivo. Por favor, habilita el chat en YouTube Studio para que aparezca aquí.')}
                </p>
              </div>
            ) : (
              <iframe
                key={`live-chat-${liveChatId}`}
                src={`https://www.youtube.com/live_chat?is_popout=1&v=${liveChatId}&embed_domain=${window.location.hostname}`}
                className="w-full h-full border-0 min-h-[400px]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                title="YouTube Live Chat"
                allowFullScreen
                frameBorder="0"
                // Note: Removed sandbox attribute as it can interfere with YouTube's Polymer.js dependencies
                // The InjectionToken errors are from YouTube's internal code and don't prevent chat from working
                onError={() => {
                  console.error('Live chat iframe failed to load');
                }}
                onLoad={() => {
                  console.log('Live chat iframe loaded successfully with chat ID:', liveChatId);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Live;
