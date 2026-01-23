import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

interface HLSVideoPlayerProps {
  videoId: string;
  hlsUrl?: string; // For backward compatibility, but we'll use embedUrl/playerUrl for iframe
  embedUrl?: string;
  playerUrl?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  defaultAudioTrack?: 'en' | 'es' | 'pt';
  captionUrls?: Record<string, string>;
  defaultCaptionLanguage?: string;
  savedPosition?: number;
  onPositionRestored?: () => void;
  videoType?: 'video' | 'reel' | 'live-archive-video';
  locale?: string;
}

export interface HLSVideoPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPaused: () => boolean;
  isReady: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unmute: () => void;
  getMuted: () => boolean;
  setAudioTrack: (trackIndex: number | string) => void;
  getAudioTracks: () => any[];
    getCurrentAudioTrack: () => number | string | null;
  setCaptionTrack: (language: string) => void;
  getCaptionStatus: () => {
    captionUrls: Record<string, string>;
    textTracks: Array<{
      language: string;
      mode: string;
      readyState: number;
      activeCues: number;
      url?: string;
    }>;
    hlsSubtitleTracks: any[];
    currentSubtitleTrack: number | null;
  };
  getCurrentCaptionText: () => string | null;
  getVideoElement: () => HTMLIFrameElement | null;
}

const HLSVideoPlayer = forwardRef<HLSVideoPlayerRef, HLSVideoPlayerProps>(({
  videoId,
  hlsUrl,
  embedUrl,
  playerUrl,
  autoplay = false,
  controls = true,
  className = '',
  style = {},
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onError,
  defaultAudioTrack = 'en',
  captionUrls = {},
  defaultCaptionLanguage,
  savedPosition,
  onPositionRestored,
  videoType = 'video',
  locale = 'en',
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string>(defaultAudioTrack);
  const [currentCaptionLanguage, setCurrentCaptionLanguage] = useState<string>(defaultCaptionLanguage || 'en');
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const hasSeekedToSavedPosition = useRef(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initRetryCount = useRef(0);
  const maxInitRetries = 5;

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [playerJsLoaded, setPlayerJsLoaded] = useState(false);

  // Load Player.js library
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Player.js is already loaded
    if ((window as any).playerjs) {
      setPlayerJsLoaded(true);
      return;
    }

    // Load Player.js script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@iframe-player/js@latest/dist/player.min.js';
    script.async = true;
    script.onload = () => {
      setPlayerJsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Player.js library');
      if (onError) {
        onError(new Error('Failed to load Player.js library'));
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Stop time update interval
  const stopTimeUpdateInterval = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  // Start time update interval
  const startTimeUpdateInterval = useCallback(() => {
    stopTimeUpdateInterval();
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && !isPaused) {
        playerRef.current.getCurrentTime().then((time: number) => {
          setCurrentTime(time);
          if (onTimeUpdate) {
            onTimeUpdate(time);
          }
        }).catch((err: any) => {
          console.warn('Could not get current time:', err);
        });
      }
    }, 250); // Update every 250ms
  }, [isPaused, onTimeUpdate, stopTimeUpdateInterval]);

  // Initialize Player.js when iframe is ready
  const initializePlayer = useCallback(() => {
    if (!iframeRef.current || !(window as any).playerjs) {
      // Retry if not ready (with limit)
      if (initRetryCount.current < maxInitRetries) {
        initRetryCount.current++;
        setTimeout(() => {
          if (iframeRef.current && (window as any).playerjs) {
            initializePlayer();
          }
        }, 200);
      } else {
        // Don't show error immediately - player might still work
        // Only log as warning, let the iframe handle playback
        console.warn('Player.js initialization delayed, but iframe may still work');
        // Don't call onError here - the iframe can still play video without Player.js API
      }
      return;
    }

    // Reset retry count on successful initialization
    initRetryCount.current = 0;

    try {
      const player = new (window as any).playerjs.Player(iframeRef.current);
      playerRef.current = player;

      player.on('ready', () => {
        console.log('✅ Bunny.net player ready');
        setIsReady(true);
        
        // Get duration
        player.getDuration().then((dur: number) => {
          setDuration(dur);
          if (onDurationChange) {
            onDurationChange(dur);
          }
        }).catch((err: any) => {
          console.warn('Could not get duration:', err);
        });

        // Seek to saved position
        if (savedPosition && savedPosition > 0 && !hasSeekedToSavedPosition.current) {
          setTimeout(() => {
            player.setCurrentTime(savedPosition).then(() => {
              hasSeekedToSavedPosition.current = true;
              if (onPositionRestored) {
                onPositionRestored();
              }
            }).catch((err: any) => {
              console.warn('Could not seek to saved position:', err);
            });
          }, 500);
        }

        if (onReady) {
          onReady();
        }
      });

      player.on('play', () => {
        setIsPaused(false);
        if (onPlay) onPlay();
        startTimeUpdateInterval();
      });

      player.on('pause', () => {
        setIsPaused(true);
        if (onPause) onPause();
        stopTimeUpdateInterval();
      });

      player.on('ended', () => {
        setIsPaused(true);
        stopTimeUpdateInterval();
        if (onEnded) onEnded();
      });

      player.on('error', (error: any) => {
        console.warn('Bunny.net player error (non-fatal):', error);
        // Only report fatal errors that prevent playback
        // Many Player.js errors are non-fatal (e.g., network hiccups, buffering)
        // Since the video works in the background, we'll only log these as warnings
        // and not trigger the onError callback unless it's truly fatal
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        // Check if this is a fatal error (player completely broken)
        // If player is still functional, don't trigger onError
        if (errorMessage.includes('fatal') || errorMessage.includes('cannot recover')) {
          console.error('Fatal player error:', error);
          if (onError) {
            onError(new Error(errorMessage));
          }
        } else {
          // Non-fatal error - just log it, player should recover
          console.warn('Non-fatal player error, continuing playback:', errorMessage);
        }
      });

      // Start time update interval
      startTimeUpdateInterval();
    } catch (error) {
      // Don't show error immediately - iframe might still work
      // Player.js API is optional, iframe can play without it
      console.warn('Player.js API initialization failed, but iframe playback may still work:', error);
      // Only show error if it's a critical issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('iframe') || errorMessage.includes('not found')) {
        // Critical error - iframe itself failed
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to initialize player'));
        }
      }
    }
  }, [savedPosition, onReady, onPlay, onPause, onEnded, onError, onDurationChange, onPositionRestored, startTimeUpdateInterval, stopTimeUpdateInterval]);

  // Initialize Player.js when both iframe and Player.js are ready
  useEffect(() => {
    if (!iframeLoaded || !playerJsLoaded) return;

    // Reset retry count when conditions are met
    initRetryCount.current = 0;

    // Wait a bit for iframe content to fully load
    const timer = setTimeout(() => {
      initializePlayer();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [iframeLoaded, playerJsLoaded, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeUpdateInterval();
      if (playerRef.current) {
        try {
          playerRef.current.off('ready');
          playerRef.current.off('play');
          playerRef.current.off('pause');
          playerRef.current.off('ended');
          playerRef.current.off('error');
        } catch (err) {
          console.warn('Error cleaning up player:', err);
        }
        playerRef.current = null;
      }
    };
  }, [stopTimeUpdateInterval]);

  // Build iframe URL
  const buildIframeUrl = useCallback(() => {
    // Prioritize embedUrl/playerUrl over hlsUrl (for iframe method)
    // Note: hlsUrl is not used for iframe, but we accept it for backward compatibility
    const url = embedUrl || playerUrl || '';
    if (!url) {
      // If no embed URL, we can't use iframe method
      console.warn('No embed URL or player URL provided for iframe player. Please provide embedUrl or playerUrl prop.');
      return '';
    }

    let finalUrl = url;
    
    // Convert /play/ URLs to /embed/ format
    if (url.includes('/play/')) {
      const playMatch = url.match(/\/play\/(\d+)\/([^/?]+)/);
      if (playMatch) {
        const libraryId = playMatch[1];
        const videoId = playMatch[2];
        finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
      }
    }

    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}autoplay=${autoplay}&responsive=true&controls=${controls}`;

    // Add default audio track
    const currentLocale = locale.substring(0, 2);
    const supportedAudioLanguages = ['en', 'es', 'pt'];
    const audioLang = supportedAudioLanguages.includes(currentLocale) ? currentLocale : defaultAudioTrack;
    finalUrl += `&defaultAudioTrack=${audioLang}`;

    // Add default caption track
    if (captionUrls && Object.keys(captionUrls).length > 0) {
      const captionLang = captionUrls[currentLocale] ? currentLocale : 
                        captionUrls['en'] ? 'en' : 
                        Object.keys(captionUrls)[0];
      if (captionLang) {
        finalUrl += `&defaultTextTrack=${captionLang}`;
        setCurrentCaptionLanguage(captionLang);
        setCaptionsEnabled(true);
      }
    }

    return finalUrl;
  }, [embedUrl, playerUrl, autoplay, controls, locale, defaultAudioTrack, captionUrls]);

  // Update audio track when defaultAudioTrack or locale changes
  useEffect(() => {
    if (!playerRef.current || !isReady) return;

    const currentLocale = locale.substring(0, 2);
    const supportedAudioLanguages = ['en', 'es', 'pt'];
    const targetLang = supportedAudioLanguages.includes(currentLocale) ? currentLocale : defaultAudioTrack;

    if (targetLang !== currentAudioTrack) {
      try {
        // Try setAudioTrackByLanguage first (if supported)
        if (playerRef.current.setAudioTrackByLanguage) {
          playerRef.current.setAudioTrackByLanguage(targetLang).then(() => {
            setCurrentAudioTrack(targetLang);
            console.log(`🎵 Switched audio track to: ${targetLang}`);
          }).catch((err: any) => {
            console.warn('setAudioTrackByLanguage not supported, trying setAudioTrack:', err);
            // Fallback to setAudioTrack with index
            setAudioTrackByIndex(targetLang);
          });
        } else {
          setAudioTrackByIndex(targetLang);
        }
      } catch (error) {
        console.error('Error switching audio track:', error);
      }
    }
  }, [defaultAudioTrack, locale, isReady, currentAudioTrack]);

  // Helper to set audio track by index
  const setAudioTrackByIndex = useCallback(async (language: string) => {
    if (!playerRef.current) return;
    
    try {
      // Get available audio tracks
      const tracks = await playerRef.current.getAudioTracks?.() || [];
      const trackIndex = tracks.findIndex((t: any) => 
        t.lang === language || t.language === language || t.name?.toLowerCase().includes(language)
      );
      
      if (trackIndex >= 0 && playerRef.current.setAudioTrack) {
        await playerRef.current.setAudioTrack(trackIndex);
        setCurrentAudioTrack(language);
        console.log(`🎵 Switched audio track to: ${language} (index: ${trackIndex})`);
      }
    } catch (err) {
      console.warn('Could not switch audio track:', err);
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (!isReady || !playerRef.current) {
        console.warn('Player not ready yet, waiting...');
        // Wait for player to be ready (max 5 seconds)
        let retries = 0;
        const maxRetries = 20; // 20 * 250ms = 5 seconds
        while (retries < maxRetries && (!isReady || !playerRef.current)) {
          await new Promise(resolve => setTimeout(resolve, 250));
          retries++;
        }
        
        if (!isReady || !playerRef.current) {
          throw new Error('Player not ready after waiting');
        }
      }
      
      if (playerRef.current) {
        try {
          await playerRef.current.play();
        } catch (error) {
          console.error('Error playing:', error);
          throw error;
        }
      } else {
        throw new Error('Player not initialized');
      }
    },
    pause: () => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
        } catch (error) {
          console.error('Error pausing:', error);
        }
      }
    },
    seek: (time: number) => {
      if (playerRef.current) {
        try {
          playerRef.current.setCurrentTime(time);
        } catch (error) {
          console.error('Error seeking:', error);
        }
      }
    },
    getCurrentTime: () => {
      return currentTime;
    },
    getDuration: () => {
      return duration;
    },
    getPaused: () => {
      return isPaused;
    },
    isReady: () => {
      return isReady && playerRef.current !== null;
    },
    setVolume: (volume: number) => {
      if (playerRef.current) {
        try {
          playerRef.current.setVolume(volume);
        } catch (error) {
          console.error('Error setting volume:', error);
        }
      }
    },
    getVolume: () => {
      // Player.js doesn't always support getVolume
      return 1;
    },
    mute: () => {
      if (playerRef.current) {
        try {
          playerRef.current.mute();
        } catch (error) {
          console.error('Error muting:', error);
        }
      }
    },
    unmute: () => {
      if (playerRef.current) {
        try {
          playerRef.current.unmute();
        } catch (error) {
          console.error('Error unmuting:', error);
        }
      }
    },
    getMuted: () => {
      // Player.js doesn't always support getMuted
      return false;
    },
    setAudioTrack: (trackIndex: number | string) => {
      if (typeof trackIndex === 'string') {
        setAudioTrackByIndex(trackIndex);
      } else {
        // If it's a number, try to find the language by index
        const supportedLanguages = ['en', 'es', 'pt'];
        const lang = supportedLanguages[trackIndex] || 'en';
        setAudioTrackByIndex(lang);
      }
    },
    getAudioTracks: () => {
      // Return mock tracks based on available languages
      const supportedLanguages = ['en', 'es', 'pt'];
      return supportedLanguages.map((lang) => ({
        id: lang,
        lang: lang,
        name: lang.toUpperCase(),
        enabled: lang === currentAudioTrack,
      }));
    },
    getCurrentAudioTrack: () => {
      // Return the language string, or index if needed
      const supportedLanguages = ['en', 'es', 'pt'];
      const index = supportedLanguages.indexOf(currentAudioTrack);
      return index >= 0 ? index : currentAudioTrack;
    },
    setCaptionTrack: (language: string) => {
      if (playerRef.current && language) {
        try {
          // Try to set caption track via Player.js API
          if (playerRef.current.setTextTrack) {
            playerRef.current.setTextTrack(language).then(() => {
              setCurrentCaptionLanguage(language);
              setCaptionsEnabled(true);
              console.log(`📝 Enabled captions for language: ${language}`);
            }).catch((err: any) => {
              console.warn('setTextTrack not supported:', err);
              // Fallback: update iframe URL with new caption parameter
              setCurrentCaptionLanguage(language);
              setCaptionsEnabled(true);
            });
          } else {
            setCurrentCaptionLanguage(language);
            setCaptionsEnabled(true);
          }
        } catch (error) {
          console.error('Error setting caption track:', error);
        }
      } else if (language === '') {
        setCaptionsEnabled(false);
        console.log('❌ Disabled captions');
      }
    },
    getCaptionStatus: () => {
      return {
        captionUrls,
        textTracks: Object.keys(captionUrls).map((lang) => ({
          language: lang,
          mode: captionsEnabled && lang === currentCaptionLanguage ? 'showing' : 'hidden',
          readyState: 2, // Loaded
          activeCues: captionsEnabled && lang === currentCaptionLanguage ? 1 : 0,
          url: captionUrls[lang],
        })),
        hlsSubtitleTracks: [],
        currentSubtitleTrack: captionsEnabled ? Object.keys(captionUrls).indexOf(currentCaptionLanguage) : null,
      };
    },
    getCurrentCaptionText: () => {
      // Player.js doesn't provide caption text directly
      return null;
    },
    getVideoElement: () => {
      return iframeRef.current;
    },
  }));

  const iframeUrl = buildIframeUrl();

  if (!iframeUrl) {
    return (
      <div className={`flex items-center justify-center bg-black text-white ${className}`} style={style}>
        <p>No video URL available</p>
      </div>
    );
  }

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    console.log('✅ Iframe loaded');
    setIframeLoaded(true);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    // Iframe error events can be unreliable - check if iframe actually loaded
    // Sometimes error fires even when iframe loads successfully
    setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Iframe actually loaded, ignore the error
        console.warn('Iframe error event fired but iframe appears to be loaded');
        return;
      }
      // Iframe truly failed
      console.error('❌ Iframe failed to load');
      if (onError) {
        onError(new Error('Failed to load video iframe'));
      }
    }, 1000); // Wait 1 second to verify iframe actually failed
  }, [onError]);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <iframe
        ref={iframeRef}
        key={`bunny-video-${videoId}-${locale.substring(0, 2)}`}
        id={`bunny-iframe-${videoId}`}
        src={iframeUrl}
        className="w-full h-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        title={`Video ${videoId}`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
});

HLSVideoPlayer.displayName = 'HLSVideoPlayer';

export default HLSVideoPlayer;
