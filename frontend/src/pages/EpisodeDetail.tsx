import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause,
  Lock,
  ThumbsUp,
  ThumbsDown,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { commentsApi, VideoComment } from '@/services/commentsApi';
import { toast } from 'sonner';
import { MultiLanguageAudioPlayer } from '@/components/MultiLanguageAudioPlayer';
import { isVideoLocked, shouldShowLockIcon, getLockMessageKey } from '@/utils/videoAccess';
import Hls from 'hls.js';

const EpisodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any | null>(null);
  const [category, setCategory] = useState<any | null>(null);
  const [series, setSeries] = useState<any | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false); // Show thumbnail initially, video on click
  const [videoStarted, setVideoStarted] = useState(false); // Video starts when user clicks play
  const [videoEnded, setVideoEnded] = useState(false); // Track if video has ended
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Reset like/dislike/favorite state when video ID changes
  useEffect(() => {
    setIsLiked(false);
    setIsDisliked(false);
    setIsFavorite(false);
  }, [id]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [downloadableResources, setDownloadableResources] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  interface TranscriptionSegment {
    time: string; // Display time (e.g., "00:05")
    startTime: number; // Start time in seconds
    endTime: number; // End time in seconds
    text: string;
    isActive?: boolean;
  }
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'transcription' | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [captionOverlayEnabled, setCaptionOverlayEnabled] = useState<boolean>(true);
  const [activeCaptionText, setActiveCaptionText] = useState<string>('');
  const lastSavedProgress = useRef<number>(0); // Track last saved progress to avoid duplicate saves
  const progressSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasSeekedToSavedPosition = useRef<boolean>(false); // Track if we've already seeked to saved position

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const bunnyPlayerRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef<boolean>(false); // Track if we should autoplay when player is ready
  const transcriptionScrollRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling transcription
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();

  // Helper function to construct HLS URL from video data
  const getHlsUrl = useCallback((videoData: any): string | null => {
    if (!videoData) return null;
    
    // Priority 1: Use bunny_hls_url if available
    if (videoData.bunny_hls_url) {
      console.log('✅ Using bunny_hls_url:', videoData.bunny_hls_url);
      return videoData.bunny_hls_url;
    }
    
    // Priority 2: Construct from bunny_embed_url or bunny_player_url
    const embedUrl = videoData.bunny_embed_url || videoData.bunny_player_url || '';
    if (embedUrl) {
      const embedMatch = embedUrl.match(/\/(embed|play)\/(\d+)\/([a-f0-9-]+)/i);
      if (embedMatch) {
        const videoId = embedMatch[3];
        const cdnHost = import.meta.env.VITE_BUNNY_CDN_HOST || 'vz-0cc8af54-835.b-cdn.net';
        const constructedUrl = `https://${cdnHost}/${videoId}/playlist.m3u8`;
        console.log('✅ Constructed HLS URL from embed URL:', constructedUrl);
        return constructedUrl;
      }
    }
    
    // Priority 3: Construct from bunny_video_id if available
    if (videoData.bunny_video_id) {
      const cdnHost = import.meta.env.VITE_BUNNY_CDN_HOST || 'vz-0cc8af54-835.b-cdn.net';
      const constructedUrl = `https://${cdnHost}/${videoData.bunny_video_id}/playlist.m3u8`;
      console.log('✅ Constructed HLS URL from bunny_video_id:', constructedUrl);
      return constructedUrl;
    }
    
    return null;
  }, []);

  // Initialize HLS.js player
  useEffect(() => {
    if (!video || !showVideoPlayer) return;
    
    const hlsUrl = getHlsUrl(video);
    console.log('🎬 HLS Init - URL:', hlsUrl, 'video:', video?.id);
    if (!hlsUrl) {
      console.log('❌ No HLS URL available');
      return;
    }

    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait

    const initHls = () => {
      retryCount++;
      if (!videoRef.current) {
        if (retryCount < maxRetries) {
          console.log(`⏳ Waiting for video element... (${retryCount}/${maxRetries})`);
          setTimeout(initHls, 100);
        } else {
          console.error('❌ Video element not found after max retries');
        }
        return;
      }

      console.log('✅ Video element ready, initializing HLS.js');

      // Clean up existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed');
        // Autoplay if needed
        if (videoRef.current && !hasSeekedToSavedPosition.current) {
          // Will be handled by the userProgress useEffect
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS fatal error, cannot recover:', data);
              hls.destroy();
              break;
          }
        }
      });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = hlsUrl;
      }
    };

    // Start initialization with a small delay to ensure DOM is ready
    setTimeout(initHls, 100);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, showVideoPlayer]);

  // Effect to switch audio track when locale changes (if HLS is already initialized)
  useEffect(() => {
    if (!hlsRef.current || !hlsRef.current.audioTracks || hlsRef.current.audioTracks.length === 0) {
      return;
    }

    const currentLocale = (locale || 'en').substring(0, 2).toLowerCase();
    const hls = hlsRef.current;
    
    const trackIndex = hls.audioTracks.findIndex((track: any) => {
      const trackLang = (track.lang || '').toLowerCase();
      const trackName = (track.name || '').toLowerCase();
      return trackLang === currentLocale || 
             trackLang.startsWith(currentLocale) ||
             trackName.includes(currentLocale) ||
             (currentLocale === 'es' && (trackLang === 'spa' || trackName.includes('spanish') || trackName.includes('español'))) ||
             (currentLocale === 'en' && (trackLang === 'eng' || trackName.includes('english') || trackName.includes('inglés'))) ||
             (currentLocale === 'pt' && (trackLang === 'por' || trackName.includes('portuguese') || trackName.includes('portugués')));
    });

    if (trackIndex !== -1 && trackIndex !== hls.audioTrack) {
      // Save current playback state before switching
      const wasPlaying = videoRef.current && !videoRef.current.paused;
      const currentPosition = videoRef.current?.currentTime || 0;
      
      console.log(`🔊 EpisodeDetail: Switching audio track to index ${trackIndex} for locale "${currentLocale}", wasPlaying: ${wasPlaying}, position: ${currentPosition}`);
      
      // Set up one-time listener for track switch completion
      const onTrackSwitched = () => {
        console.log('🔊 EpisodeDetail: Audio track switched, restoring playback state');
        hls.off(Hls.Events.AUDIO_TRACK_SWITCHED, onTrackSwitched);
        
        // Restore playback position and state
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentPosition;
            if (wasPlaying) {
              videoRef.current.play().catch((e) => {
                console.log('🔊 EpisodeDetail: Auto-resume failed, will retry:', e);
                // Retry after a short delay
                setTimeout(() => {
                  if (videoRef.current && wasPlaying) {
                    videoRef.current.play().catch(() => {});
                  }
                }, 200);
              });
            }
          }
        }, 50);
      };
      
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, onTrackSwitched);
      
      // Switch audio track
      hls.audioTrack = trackIndex;
      
      // Fallback: If track switch event doesn't fire within 500ms, restore anyway
      setTimeout(() => {
        hls.off(Hls.Events.AUDIO_TRACK_SWITCHED, onTrackSwitched);
        if (videoRef.current) {
          videoRef.current.currentTime = currentPosition;
          if (wasPlaying && videoRef.current.paused) {
            console.log('🔊 EpisodeDetail: Fallback - resuming playback');
            videoRef.current.play().catch(() => {});
          }
        }
      }, 500);
    }
  }, [locale]);

  // Load Player.js library for Bunny.net iframe control (kept for backward compatibility)
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

  // Helper function to save progress
  const saveProgressToDatabase = useCallback(async (timeWatched: number, videoDuration: number) => {
    if (!user || !video || timeWatched <= 0 || videoDuration <= 0) {
      return;
    }

    const progressPercentage = (timeWatched / videoDuration) * 100;
    
    try {
      await userProgressApi.updateVideoProgress(video.id, {
        time_watched: Math.floor(timeWatched),
        video_duration: Math.floor(videoDuration),
        progress_percentage: Math.floor(progressPercentage),
        is_completed: progressPercentage >= 90,
      });
      lastSavedProgress.current = Math.floor(timeWatched);
      // console.log('✅ Progress saved:', Math.floor(progressPercentage) + '%');
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }, [user, video]);

  // Save progress when component unmounts (user navigates away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save progress immediately when page is about to unload
      if (user && video && currentTime > 0) {
        const dur = video.duration || 0;
        if (dur > 0) {
          // Use sendBeacon for reliable save on page unload
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const token = localStorage.getItem('token');
          const data = JSON.stringify({
            time_watched: Math.floor(currentTime),
            video_duration: Math.floor(dur),
            progress_percentage: Math.floor((currentTime / dur) * 100),
            is_completed: (currentTime / dur) >= 0.9,
          });

          if (navigator.sendBeacon && token) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon(
              `${API_BASE_URL}/api/progress/video/${video.id}`,
              blob
            );
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clear any pending save timeout
      if (progressSaveTimeout.current) {
        clearTimeout(progressSaveTimeout.current);
      }
      
      // Save final progress before unmounting
      if (user && video && currentTime > 0) {
        const dur = video.duration || 0;
        if (dur > 0) {
          // Save synchronously before component unmounts
          saveProgressToDatabase(currentTime, dur);
        }
      }
    };
  }, [user, video, currentTime, saveProgressToDatabase]);

  // Function to attempt seek and play
  const attemptSeekAndPlay = useCallback((player: any) => {
    if (!player || hasSeekedToSavedPosition.current) return;
    
    const savedTime = userProgress?.time_watched || userProgress?.last_position || 0;
    const videoDuration = video?.duration || 0;
    const progressPercent = userProgress?.progress_percentage || 0;
    
    console.log('🔍 Attempting seek and play:', {
      savedTime,
      videoDuration,
      progressPercent,
      hasSeeked: hasSeekedToSavedPosition.current,
      userProgress: !!userProgress
    });
    
    // If there's saved progress and video isn't completed, seek first then play
    if (savedTime > 0 && videoDuration > 0 && savedTime < videoDuration && progressPercent < 90) {
      console.log(`⏩ Seeking to saved position before autoplay: ${savedTime} seconds`);
      hasSeekedToSavedPosition.current = true;
      
            // Seek to saved position first using setCurrentTime
            try {
              player.setCurrentTime(savedTime);
              setCurrentTime(savedTime);
              console.log(`✅ Successfully seeked to ${savedTime} seconds, starting playback`);
              
              // Small delay to ensure seek completes before playing
              setTimeout(() => {
                try {
                  player.play();
                  setIsPlaying(true);
                  setVideoStarted(true);
                  setShowVideoPlayer(true);
                  console.log('▶️ Video autoplay started from saved position');
                } catch (error) {
                  console.error('Error autoplaying video:', error);
                  setIsPlaying(false);
                }
              }, 100);
            } catch (error) {
              console.error('Error seeking to saved position:', error);
              // Fallback: just play from start
              try {
                player.play();
                setIsPlaying(true);
                setVideoStarted(true);
                setShowVideoPlayer(true);
              } catch (playError) {
                console.error('Error autoplaying video:', playError);
                setIsPlaying(false);
              }
            }
    } else {
      // No saved progress or already completed, just play from start
      hasSeekedToSavedPosition.current = true;
      try {
        player.play();
        setIsPlaying(true);
        setVideoStarted(true);
        setShowVideoPlayer(true);
        console.log('▶️ Video autoplay started from beginning');
      } catch (error) {
        console.error('Error autoplaying video:', error);
        setIsPlaying(false);
      }
    }
  }, [userProgress, video]);

  // Show video player automatically when video loads (if user has access)
  useEffect(() => {
    if (!video) return;
    
    const hasAccess = canAccessVideo(video.visibility);
    if (hasAccess && (video.bunny_embed_url || video.bunny_player_url)) {
      // Automatically show video player when page loads
      setShowVideoPlayer(true);
      setVideoStarted(true);
    }
  }, [video?.id, video?.visibility, video?.bunny_embed_url, video?.bunny_player_url]);

  // Initialize Bunny.net player when iframe loads (always show iframe if has access)
  useEffect(() => {
    if (!video) return;
    
    const hasAccess = canAccessVideo(video.visibility);
    if (!hasAccess || (!video.bunny_embed_url && !video.bunny_player_url)) {
      return;
    }

    // Wait for Player.js to be available
    const initPlayer = () => {
      if (!(window as any).playerjs) {
        setTimeout(initPlayer, 100);
        return;
      }

      const iframe = document.getElementById(`bunny-iframe-${video.id}`) as HTMLIFrameElement;
      if (!iframe) {
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        const player = new (window as any).playerjs.Player(iframe);
        bunnyPlayerRef.current = player;

        player.on('ready', () => {
          // console.log('✅ Bunny.net player ready');
          console.log('📊 UserProgress available:', !!userProgress, userProgress);
          
          // Store player reference - the useEffect will handle seeking and playing when userProgress loads
          bunnyPlayerRef.current = player;
          // console.log('✅ Player stored in ref, waiting for userProgress to load...');
          
          // Set up a timeout as fallback - if userProgress doesn't load within 2 seconds, play from start
          const timeoutId = setTimeout(() => {
            if (!hasSeekedToSavedPosition.current) {
              console.log('⏰ Timeout waiting for userProgress, playing from start');
              hasSeekedToSavedPosition.current = true;
              try {
                player.play();
                setIsPlaying(true);
                setVideoStarted(true);
                setShowVideoPlayer(true);
                console.log('▶️ Video autoplay started from beginning (timeout)');
              } catch (error) {
                console.error('Error autoplaying video:', error);
                setIsPlaying(false);
              }
            }
          }, 2000); // Reduced from 3000 to 2000 for faster autoplay
          
          // Store timeout ID for cleanup
          (player as any)._seekTimeout = timeoutId;
          
          // Also try to autoplay immediately if no userProgress (for faster autoplay)
          if (!userProgress && !hasSeekedToSavedPosition.current) {
            setTimeout(() => {
              if (!hasSeekedToSavedPosition.current && bunnyPlayerRef.current) {
                try {
                  bunnyPlayerRef.current.play();
                  setIsPlaying(true);
                  setVideoStarted(true);
                  setShowVideoPlayer(true);
                  hasSeekedToSavedPosition.current = true;
                  console.log('▶️ Video autoplay started immediately (no userProgress)');
                } catch (error) {
                  console.error('Error autoplaying video immediately:', error);
                }
              }
            }, 500);
          }
          
          // Duration is already saved in database from backend, no need to fetch here
          // Just get current time for progress tracking
          player.getCurrentTime((time: number) => {
            // console.log('⏱️ Current playback time:', time, 'seconds');
            setCurrentTime(time);
          });
        });

        // Listen to timeupdate events to track current playback time only
        // Duration comes from database, not from Player.js
        player.on('timeupdate', (data: { seconds?: number }) => {
          if (data.seconds !== undefined) {
            setCurrentTime(data.seconds);
            
            // Save progress for Bunny.net videos periodically
            if (user && video && video.duration) {
              const timeWatched = data.seconds;
              const videoDuration = video.duration;
              const timeSinceLastSave = Math.floor(timeWatched) - lastSavedProgress.current;
              
              // Save every 5 seconds
              if (timeSinceLastSave >= 5) {
                // Clear any pending save
                if (progressSaveTimeout.current) {
                  clearTimeout(progressSaveTimeout.current);
                }
                
                // Debounce: Save after 1 second
                progressSaveTimeout.current = setTimeout(() => {
                  saveProgressToDatabase(timeWatched, videoDuration);
                }, 1000);
              }
            }
          }
        });

        player.on('play', () => {
          // console.log('▶️ Video playing - updating button state to PAUSE');
          setIsPlaying(true);
          // Also update videoStarted if not already set
          if (!videoStarted) {
            setVideoStarted(true);
            setShowVideoPlayer(true);
          }
        });

        player.on('pause', () => {
          // console.log('⏸️ Video paused - updating button state to PLAY/CONTINUE');
          setIsPlaying(false);
          
          // Save progress immediately when Bunny.net video is paused
          if (user && video && currentTime > 0 && video.duration) {
            saveProgressToDatabase(currentTime, video.duration);
          }
        });

        player.on('ended', () => {
          // console.log('⏹️ Video ended - showing first frame image');
          setIsPlaying(false);
          setVideoEnded(true);
          setShowVideoPlayer(false); // Hide video player, show thumbnail
        });

        // Handle playback errors (HLS errors, network issues, etc.)
        player.on('error', (error: any) => {
          // console.warn('⚠️ Bunny.net player error (non-fatal):', error);
          // Most HLS errors are non-fatal and the player will retry automatically
          // Only show error message for fatal errors
          if (error && error.fatal === true) {
            setPlaybackError(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
            toast.error(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
          }
        });

        // Listen for iframe errors (network, CORS, etc.)
        iframe.addEventListener('error', (e) => {
          // console.warn('⚠️ Bunny.net iframe error:', e);
          setPlaybackError(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
        });
      } catch (error) {
        console.error('Error initializing Bunny.net player:', error);
        setPlaybackError(t('video.player_init_error', 'Error al inicializar el reproductor. Por favor, recargue la página.'));
      }
    };

    // Small delay to ensure iframe is loaded
    const timer = setTimeout(initPlayer, 500);

    return () => {
      clearTimeout(timer);
      bunnyPlayerRef.current = null;
    };
  }, [video?.id, video?.bunny_embed_url, video?.bunny_player_url, video?.visibility, video?.duration, user, saveProgressToDatabase]);

  // Autoplay when player is ready and userProgress is available (or not)
  useEffect(() => {
    if (!bunnyPlayerRef.current || !video || hasSeekedToSavedPosition.current) return;
    
    // If userProgress exists, use it; otherwise autoplay from start
    if (userProgress) {
      const savedTime = userProgress.time_watched || userProgress.last_position || 0;
      const videoDuration = video.duration || 0;
      const progressPercent = userProgress.progress_percentage || 0;
      
      console.log('📊 UserProgress loaded, attempting seek and play:', {
        savedTime,
        videoDuration,
        progressPercent,
        hasSeeked: hasSeekedToSavedPosition.current
      });
      
      // If there's saved progress and video isn't completed, seek first then play
      if (savedTime > 0 && videoDuration > 0 && savedTime < videoDuration && progressPercent < 90) {
        console.log(`⏩ Seeking to saved position before autoplay: ${savedTime} seconds`);
        hasSeekedToSavedPosition.current = true;
        
        // Clear any timeout that might be waiting
        if ((bunnyPlayerRef.current as any)._seekTimeout) {
          clearTimeout((bunnyPlayerRef.current as any)._seekTimeout);
        }
        
        // Seek to saved position first using setCurrentTime
        try {
          bunnyPlayerRef.current.setCurrentTime(savedTime);
          setCurrentTime(savedTime);
          console.log(`✅ Successfully seeked to ${savedTime} seconds, starting playback`);
          
          // Small delay to ensure seek completes before playing
          setTimeout(() => {
            try {
              bunnyPlayerRef.current.play();
              setIsPlaying(true);
              setVideoStarted(true);
              setShowVideoPlayer(true);
              console.log('▶️ Video autoplay started from saved position');
            } catch (error) {
              console.error('Error autoplaying video:', error);
              setIsPlaying(false);
            }
          }, 100);
        } catch (error) {
          console.error('Error seeking to saved position:', error);
          // Fallback: just play from start
          try {
            bunnyPlayerRef.current.play();
            setIsPlaying(true);
            setVideoStarted(true);
            setShowVideoPlayer(true);
          } catch (playError) {
            console.error('Error autoplaying video:', playError);
            setIsPlaying(false);
          }
        }
      } else {
        // Saved progress exists but video is completed or no valid saved time, play from start
        hasSeekedToSavedPosition.current = true;
        
        // Clear any timeout
        if ((bunnyPlayerRef.current as any)._seekTimeout) {
          clearTimeout((bunnyPlayerRef.current as any)._seekTimeout);
        }
        
        try {
          bunnyPlayerRef.current.play();
          setIsPlaying(true);
          setVideoStarted(true);
          setShowVideoPlayer(true);
          console.log('▶️ Video autoplay started from beginning (saved progress but completed)');
        } catch (error) {
          console.error('Error autoplaying video:', error);
          setIsPlaying(false);
        }
      }
    } else {
      // No userProgress, autoplay from start
      hasSeekedToSavedPosition.current = true;
      
      // Clear any timeout
      if ((bunnyPlayerRef.current as any)._seekTimeout) {
        clearTimeout((bunnyPlayerRef.current as any)._seekTimeout);
      }
      
      try {
        bunnyPlayerRef.current.play();
        setIsPlaying(true);
        setVideoStarted(true);
        setShowVideoPlayer(true);
        console.log('▶️ Video autoplay started from beginning (no saved progress)');
      } catch (error) {
        console.error('Error autoplaying video:', error);
        setIsPlaying(false);
      }
    }
  }, [userProgress, video]);

  // Seek to saved position when userProgress is loaded and player is ready
  // This useEffect is now handled by the main autoplay logic above
  // Keeping this for backward compatibility but it should not trigger if the main one already handled it

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        // Fetch video details
        const videoResponse = await videoApi.get(parseInt(id || '1'));
        
        if (!videoResponse || !videoResponse.success) {
          throw new Error('Failed to fetch video data');
        }
        
        const videoData = videoResponse.data.video;
        const existingProgress = videoResponse.data.user_progress;
        
        if (!videoData) {
          throw new Error('No video data received');
        }
        
        // Debug logging for video URLs
        console.log('=== EpisodeDetail: Video Data ===');
        console.log('Video ID:', videoData.id);
        console.log('Video Title:', videoData.title);
        console.log('Bunny Embed URL:', videoData.bunny_embed_url);
        console.log('Bunny Player URL:', videoData.bunny_player_url);
        console.log('Bunny Video URL:', videoData.bunny_video_url);
        console.log('Video URL Full:', videoData.video_url_full);
        console.log('Video URL:', videoData.video_url);
        console.log('Full Video Data:', videoData);
        
        setVideo(videoData);
        
        // Set series and get category from series (series belongs to category)
        if (videoData.series) {
          setSeries(videoData.series);
          
          // Get category from series relationship
          if (videoData.series.category) {
            setCategory(videoData.series.category);
          }
        }
        
        // Fallback: Set category from video if series doesn't have it
        if (videoData.category && !videoData.series?.category) {
          setCategory(videoData.category);
        }
        
        // Parse downloadable resources and check for shop type
        const allResources: any[] = [];
        
        if (videoData.downloadable_resources) {
          try {
            const resources = typeof videoData.downloadable_resources === 'string'
              ? JSON.parse(videoData.downloadable_resources)
              : videoData.downloadable_resources;
            
            // Check if this is a shop episode type
            if (typeof resources === 'object' && resources !== null && !Array.isArray(resources)) {
              if (resources.episode_type === 'shop' || resources.shop_product || resources.shop_url) {
                // Redirect to shop page
                navigateWithLocale(`/episode-shop/${videoData.id}`);
                return;
              }
            }
            
            if (Array.isArray(resources)) {
              console.log('✅ Downloadable resources parsed:', resources);
              allResources.push(...resources);
            } else {
              console.warn('⚠️ Downloadable resources is not an array:', resources);
            }
          } catch (e) {
            console.error('❌ Error parsing downloadable_resources:', e);
          }
        } else {
          console.log('ℹ️ No downloadable_resources found in video data');
        }
        
        // If allow_download is true, add the video itself as a downloadable resource
        // Use the new download endpoint for Bunny.net videos
        if (videoData.allow_download && videoData.bunny_video_id) {
          // For Bunny.net videos, we'll fetch the download URL from the API
          // This will be handled in handleDownloadMaterials
          const videoTitle = videoData.title || 'video';
          const videoExtension = videoData.video_format || 'mp4';
          allResources.push({
            url: `api://download-video/${videoData.id}`, // Special marker for video download
            name: `${videoTitle}.${videoExtension}`,
            filename: `${videoTitle}.${videoExtension}`,
            type: 'video',
            size: videoData.file_size || null,
            video_id: videoData.id,
            bunny_video_id: videoData.bunny_video_id,
          });
          console.log('✅ Added video as downloadable resource (will fetch download URL)');
        } else if (videoData.allow_download && (videoData.bunny_video_url || videoData.video_url)) {
          // Fallback for non-Bunny.net videos
          const videoDownloadUrl = videoData.bunny_video_url || videoData.video_url || 
            (videoData.id ? `${(import.meta.env.VITE_SERVER_BASE_URL.replace('/api', ''))}/api/videos/${videoData.id}/stream` : null);
          
          if (videoDownloadUrl) {
            const videoTitle = videoData.title || 'video';
            const videoExtension = videoData.video_format || 'mp4';
            allResources.push({
              url: videoDownloadUrl,
              name: `${videoTitle}.${videoExtension}`,
              filename: `${videoTitle}.${videoExtension}`,
              type: 'video',
              size: videoData.file_size || null,
            });
            console.log('✅ Added video as downloadable resource:', videoDownloadUrl);
          }
        }
        
        setDownloadableResources(allResources);
        
        // Also check tags for shop type
        if (videoData.tags && Array.isArray(videoData.tags) && videoData.tags.includes('shop')) {
          navigateWithLocale(`/episode-shop/${videoData.id}`);
          return;
        }

        // Load transcription from video data or API
        if (videoData.id) {
          loadTranscription(videoData.id, videoData);
        }

        // Fetch related videos from the same series
        const seriesId = videoData.series_id || (videoData.series?.id);
        if (seriesId) {
          try {
            const relatedResponse = await videoApi.getPublic({ 
              series_id: seriesId, 
              per_page: 100,
              status: 'published'
            });
            const relatedData = Array.isArray(relatedResponse.data) 
              ? relatedResponse.data 
              : relatedResponse.data?.data || [];
            // Filter out current video and limit to 4
            const filtered = relatedData.filter((v: any) => v.id !== videoData.id && v.status === 'published').slice(0, 4);
            setRelatedVideos(filtered);
            console.log('Related videos from series:', filtered.length, 'series_id:', seriesId);
          } catch (error) {
            console.error('Failed to fetch related videos:', error);
            setRelatedVideos([]);
          }
        } else {
          console.log('No series_id found for video, cannot fetch related videos');
          setRelatedVideos([]);
        }
        
        // Set user progress - always fetch latest to ensure like/dislike status is current
        if (user && videoData.id) {
          try {
            // Use existingProgress if available, but always fetch latest to ensure accuracy
            if (existingProgress) {
              const likedStatus = existingProgress.is_liked === true || existingProgress.is_liked === 1;
              const dislikedStatus = existingProgress.is_disliked === true || existingProgress.is_disliked === 1;
              
              console.log('📊 Using existingProgress like/dislike status:', {
                is_liked: existingProgress.is_liked,
                is_disliked: existingProgress.is_disliked,
                likedStatus,
                dislikedStatus
              });
              
              setUserProgress(existingProgress);
              setIsLiked(likedStatus);
              setIsDisliked(dislikedStatus);
              setIsFavorite(existingProgress.is_favorite === true || existingProgress.is_favorite === 1);
            }
            
            // Always fetch latest progress to ensure like/dislike/favorite status is up to date
            const progressResponse = await userProgressApi.getVideoProgress(videoData.id);
            if (progressResponse.success) {
              const progress = progressResponse.data;
              if (progress) {
                const likedStatus = progress.is_liked === true || progress.is_liked === 1;
                const dislikedStatus = progress.is_disliked === true || progress.is_disliked === 1;
                const favoriteStatus = progress.is_favorite === true || progress.is_favorite === 1;
                
                console.log('📊 Loading like/dislike/favorite status:', {
                  is_liked: progress.is_liked,
                  is_disliked: progress.is_disliked,
                  is_favorite: progress.is_favorite,
                  likedStatus,
                  dislikedStatus,
                  favoriteStatus
                });
                
                setUserProgress(progress);
                setIsLiked(likedStatus);
                setIsDisliked(dislikedStatus);
                setIsFavorite(favoriteStatus);
              } else {
                // No progress record exists yet, reset to default
                console.log('📊 No progress record, resetting like/dislike/favorite to false');
                setIsLiked(false);
                setIsDisliked(false);
                setIsFavorite(false);
              }
            }
          } catch (error) {
            console.error('Failed to fetch progress:', error);
            // On error, still try to use existingProgress if available
            if (existingProgress) {
              setUserProgress(existingProgress);
              setIsLiked(existingProgress.is_liked === true || existingProgress.is_liked === 1);
              setIsDisliked(existingProgress.is_disliked === true || existingProgress.is_disliked === 1);
              setIsFavorite(existingProgress.is_favorite === true || existingProgress.is_favorite === 1);
            }
          }
        } else {
          // Not authenticated, reset to default
          setIsLiked(false);
          setIsDisliked(false);
          setIsFavorite(false);
        }

        // Fetch comments
        if (videoData.id) {
          try {
            const commentsResponse = await commentsApi.getComments(videoData.id, 'newest');
            if (commentsResponse.success) {
              setComments(commentsResponse.data);
            }
          } catch (error) {
            console.error('Failed to fetch comments:', error);
          }
        }
        
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
      // Reset seek flag when video changes
      hasSeekedToSavedPosition.current = false;
    }
  }, [id, user]);

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} min`;
  };

  const formatDurationShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper to get series title with multilingual support
  const getSeriesTitle = (serie: any): string => {
    if (!serie) return '';
    const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
    
    // Check if series has translations object
    if (serie.translations && serie.translations.title) {
      return serie.translations.title[localeKey] || serie.translations.title.en || serie.title || '';
    }
    
    // Check for direct multilingual columns
    const titleKey = `title_${localeKey}`;
    if (serie[titleKey]) {
      return serie[titleKey];
    }
    
    // Fallback to main title field
    return serie.title || '';
  };

  // Helper to get category name with multilingual support
  const getCategoryName = (cat: any): string => {
    if (!cat) return '';
    const localeKey = locale.substring(0, 2) as 'en' | 'es' | 'pt';
    
    // Check if category has translations object
    if (cat.translations && cat.translations.name) {
      return cat.translations.name[localeKey] || cat.translations.name.en || cat.name || '';
    }
    
    // Check for direct multilingual columns
    const nameKey = `name_${localeKey}`;
    if (cat[nameKey]) {
      return cat[nameKey];
    }
    
    // Fallback to main name field
    return cat.name || '';
  };

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
  };

  // Load transcription from video data or API (like ReelDetail)
  const loadTranscription = async (videoId: number, videoData?: any) => {
    try {
      const currentLocale = (locale || 'en').substring(0, 2);
      const finalLocale = ['en', 'es', 'pt'].includes(currentLocale) ? currentLocale : 'en';
      
      console.log('🔍 Loading transcription for video:', {
        videoId,
        locale: finalLocale,
        hasVideoData: !!videoData,
      });
      
      let transcriptionText: string | null = null;
      
      // First, try to get transcription from video data (if available)
      // Prefer VTT format for proper timestamp parsing (like TED Talks)
      let vttContent: string | null = null;
      
      if (videoData && videoData.transcriptions && typeof videoData.transcriptions === 'object') {
        const transcriptions = videoData.transcriptions;
        console.log('📝 Transcriptions object:', transcriptions);
        console.log('📝 Available languages:', Object.keys(transcriptions));
        
        if (transcriptions[finalLocale]) {
          console.log(`✅ Found transcription for locale "${finalLocale}":`, transcriptions[finalLocale]);
          
          // Prefer VTT content for proper timestamp parsing
          if (transcriptions[finalLocale]?.vtt) {
            vttContent = String(transcriptions[finalLocale].vtt).trim();
            console.log('📄 Found VTT content, length:', vttContent.length);
          } else if (typeof transcriptions[finalLocale] === 'string') {
            const text = transcriptions[finalLocale].trim();
            // Check if it's VTT format
            if (text.includes('WEBVTT') || text.includes('-->')) {
              vttContent = text;
              console.log('📄 Transcription string is VTT format, length:', vttContent.length);
            } else {
              transcriptionText = text;
              console.log('📄 Transcription is plain text, length:', transcriptionText.length);
            }
          } else if (transcriptions[finalLocale]?.text) {
            const text = String(transcriptions[finalLocale].text).trim();
            // Check if it's VTT format
            if (text.includes('WEBVTT') || text.includes('-->')) {
              vttContent = text;
              console.log('📄 Transcription .text field is VTT format, length:', vttContent.length);
            } else {
              transcriptionText = text;
              console.log('📄 Transcription .text field is plain text, length:', transcriptionText.length);
            }
          }
        } else if (transcriptions.en) {
          // Fallback to English
          console.log('🔄 Falling back to English transcription:', transcriptions.en);
          
          // Prefer VTT content
          if (transcriptions.en?.vtt) {
            vttContent = String(transcriptions.en.vtt).trim();
            console.log('📄 Found English VTT content, length:', vttContent.length);
          } else if (typeof transcriptions.en === 'string') {
            const text = transcriptions.en.trim();
            if (text.includes('WEBVTT') || text.includes('-->')) {
              vttContent = text;
            } else {
              transcriptionText = text;
            }
          } else if (transcriptions.en?.text) {
            const text = String(transcriptions.en.text).trim();
            if (text.includes('WEBVTT') || text.includes('-->')) {
              vttContent = text;
            } else {
              transcriptionText = text;
            }
          }
        }
      } else if (videoData) {
        // Try old transcription fields
        switch (finalLocale) {
          case 'es':
            transcriptionText = videoData.transcription_es || videoData.transcription || null;
            break;
          case 'pt':
            transcriptionText = videoData.transcription_pt || videoData.transcription || null;
            break;
          default:
            transcriptionText = videoData.transcription_en || videoData.transcription || null;
            break;
        }
        if (transcriptionText) {
          console.log('📄 Found transcription in old fields, length:', transcriptionText.length);
        }
      }
      
      // If not found in video data, try API endpoint
      if (!transcriptionText && !vttContent) {
        console.log('🌐 Transcription not in video data, trying API endpoint...');
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
          const response = await fetch(
            `${baseUrl}/videos/${videoId}/transcription?locale=${finalLocale}`,
            {
              headers: {
                'Accept': 'application/json',
                'Accept-Language': finalLocale,
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log('📡 API Response:', data);
            if (data.success && data.transcription) {
              transcriptionText = data.transcription;
              console.log('✅ Got transcription from API, length:', transcriptionText.length);
            } else {
              console.warn('⚠️ API response unsuccessful or no transcription:', data);
            }
          }
        } catch (apiError) {
          console.error('❌ Transcription API error:', apiError);
        }
      }
      
      // If we have VTT content, parse it directly (best option - has timestamps)
      if (vttContent) {
        console.log('📊 Parsing VTT content for segments...');
        const segments = parseWebVTT(vttContent);
        console.log('✅ Parsed VTT segments:', {
          segmentCount: segments.length,
          firstSegment: segments[0],
          sampleSegments: segments.slice(0, 3),
        });
        setTranscriptionSegments(segments);
        // Store VTT as transcription text for fallback
        setTranscription(vttContent);
      } else if (transcriptionText) {
        // Handle if transcription is an array of words instead of string
        if (Array.isArray(transcriptionText)) {
          console.log('🔄 Converting array to string, array length:', transcriptionText.length);
          transcriptionText = transcriptionText.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (item && typeof item === 'object') {
              return item.punctuated_word || item.word || item.text || '';
            }
            return '';
          }).join(' ');
          console.log('✅ Converted to string, length:', transcriptionText.length);
        }
        
        // Ensure it's a string
        if (typeof transcriptionText !== 'string') {
          console.warn('⚠️ Transcription is not string, converting:', typeof transcriptionText);
          transcriptionText = String(transcriptionText || '');
        }
        
        // Store full transcription text
        setTranscription(transcriptionText);
        
        // Parse transcription text into segments for display
        const segments = parseTranscription(transcriptionText, video?.duration || videoData?.duration || 0);
        console.log('📊 Parsed transcription segments:', {
          segmentCount: segments.length,
          duration: video?.duration || videoData?.duration || 0,
          firstSegment: segments[0],
        });
        setTranscriptionSegments(segments);
      } else {
        console.warn('❌ No transcription text or VTT found, setting empty');
        setTranscription(null);
        setTranscriptionSegments([]);
      }
    } catch (error) {
      console.error('❌ Error loading transcription:', error);
      setTranscription(null);
      setTranscriptionSegments([]);
    }
  };

  // Helper function to convert WebVTT time to seconds
  const vttTimeToSeconds = (vttTime: string): number => {
    const parts = vttTime.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const secondsParts = parts[2].split('.');
      const seconds = parseInt(secondsParts[0], 10);
      const milliseconds = parseInt(secondsParts[1] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    return 0;
  };

  // Helper function to format seconds to display time (MM:SS)
  const formatDisplayTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse WebVTT format with proper time ranges
  const parseWebVTT = (vtt: string): TranscriptionSegment[] => {
    const segments: TranscriptionSegment[] = [];
    const lines = vtt.split('\n');
    let currentStartTime = '';
    let currentEndTime = '';
    let currentText = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line.startsWith('WEBVTT') || line === '') {
        continue;
      }
      
      // Check for timestamp line (format: 00:00:00.000 --> 00:00:05.000)
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        // Save previous segment if exists
        if (currentStartTime && currentText) {
          const startSeconds = vttTimeToSeconds(currentStartTime);
          const endSeconds = vttTimeToSeconds(currentEndTime || currentStartTime);
          // Clean up text: Remove numbers at the end of sentences
          let cleanedText = currentText.trim();
          cleanedText = cleanedText.replace(/\s*[,\s]*\d+\s*$/g, ''); // Remove trailing numbers
          cleanedText = cleanedText.replace(/\s+\d+(\s|$)/g, ' '); // Remove standalone numbers
          cleanedText = cleanedText.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
          segments.push({
            time: formatDisplayTime(startSeconds),
            startTime: startSeconds,
            endTime: endSeconds,
            text: cleanedText,
            isActive: false,
          });
        }
        // Start new segment
        currentStartTime = timeMatch[1];
        currentEndTime = timeMatch[2];
        currentText = '';
      } else if (line && currentStartTime) {
        // Add text to current segment (remove HTML tags if any)
        let cleanLine = line.replace(/<[^>]*>/g, '').trim();
        // Remove numbers at the end of sentences (like "2, 3, .." from SRT sequence numbers)
        cleanLine = cleanLine.replace(/\s*[,\s]*\d+\s*$/g, '');
        // Remove standalone numbers at the end
        cleanLine = cleanLine.replace(/\s+\d+(\s|$)/g, ' ');
        // Clean up multiple spaces
        cleanLine = cleanLine.replace(/\s+/g, ' ').trim();
        if (cleanLine) {
          currentText += (currentText ? ' ' : '') + cleanLine;
        }
      }
    }
    
    // Add last segment
    if (currentStartTime && currentText) {
      const startSeconds = vttTimeToSeconds(currentStartTime);
      const endSeconds = vttTimeToSeconds(currentEndTime || currentStartTime);
      // Clean up text: Remove numbers at the end of sentences
      let cleanedText = currentText.trim();
      cleanedText = cleanedText.replace(/\s*[,\s]*\d+\s*$/g, ''); // Remove trailing numbers
      cleanedText = cleanedText.replace(/\s+\d+(\s|$)/g, ' '); // Remove standalone numbers
      cleanedText = cleanedText.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
      segments.push({
        time: formatDisplayTime(startSeconds),
        startTime: startSeconds,
        endTime: endSeconds,
        text: cleanedText,
        isActive: false,
      });
    }
    
    return segments;
  };

  // Parse transcription text into segments
  const parseTranscription = (text: string, duration: number): TranscriptionSegment[] => {
    if (!text || !text.trim()) return [];
    
    // Try to parse as WebVTT format (preferred - has proper timing)
    if (text.includes('WEBVTT') || text.includes('-->')) {
      return parseWebVTT(text);
    }
    
    // Try to parse as simple text with timestamps
    const lines = text.split('\n').filter(line => line.trim());
    const segments: TranscriptionSegment[] = [];
    let currentTime = 0;
    const estimatedSegmentDuration = duration / Math.max(lines.length, 1);
    
    lines.forEach((line, index) => {
      // Try to extract timestamp and text
      const timestampMatch = line.match(/(\d{1,2}):(\d{2}):?(\d{2})?/);
      if (timestampMatch) {
        // Parse timestamp to seconds
        const parts = timestampMatch[0].split(':');
        let seconds = 0;
        if (parts.length === 2) {
          seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
          seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
        currentTime = seconds;
        const textPart = line.replace(timestampMatch[0], '').trim();
        if (textPart) {
          segments.push({
            time: formatDisplayTime(seconds),
            startTime: seconds,
            endTime: Math.min(seconds + estimatedSegmentDuration, duration),
            text: textPart,
            isActive: false,
          });
        }
      } else if (line.trim()) {
        // If no timestamp, estimate time based on position
        if (segments.length === 0) {
          // First segment starts at 0
          segments.push({
            time: formatDisplayTime(0),
            startTime: 0,
            endTime: estimatedSegmentDuration,
            text: line.trim(),
            isActive: false,
          });
        } else {
          // Append to last segment or create new one
          const lastSegment = segments[segments.length - 1];
          if (lastSegment.text.length < 200) {
            // Append to last segment if it's not too long
            lastSegment.text += ' ' + line.trim();
            lastSegment.endTime = Math.min(lastSegment.startTime + estimatedSegmentDuration * (segments.length + 1), duration);
          } else {
            // Create new segment
            const newStartTime = lastSegment.endTime;
            segments.push({
              time: formatDisplayTime(newStartTime),
              startTime: newStartTime,
              endTime: Math.min(newStartTime + estimatedSegmentDuration, duration),
              text: line.trim(),
              isActive: false,
            });
          }
        }
      }
    });
    
    // If no segments were created, create one with the full text
    if (segments.length === 0) {
      return [{
        time: formatDisplayTime(0),
        startTime: 0,
        endTime: duration || 0,
        text: text.trim(),
        isActive: false,
      }];
    }
    
    return segments;
  };

  // Reload transcription when language changes
  useEffect(() => {
    if (video && video.id) {
      loadTranscription(video.id, video);
    }
  }, [locale, video?.id]);

  // Update active transcription segment based on current playback time
  useEffect(() => {
    if (transcriptionSegments.length === 0 || currentTime === undefined) return;

    // Find the active segment index first (synchronously)
    const activeIndex = transcriptionSegments.findIndex(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );

    // Update the active caption text for overlay
    if (activeIndex >= 0) {
      setActiveCaptionText(transcriptionSegments[activeIndex].text);
    } else {
      setActiveCaptionText('');
    }

    // Update the active state
    setTranscriptionSegments(prevSegments => {
      const updated = prevSegments.map((segment, index) => ({
        ...segment,
        isActive: index === activeIndex
      }));
      return updated;
    });

    // Auto-scroll within container only (don't scroll the page)
    if (activeIndex >= 0 && transcriptionScrollRef.current) {
      setTimeout(() => {
        const activeElement = document.getElementById(`transcript-segment-${activeIndex}`);
        if (activeElement && transcriptionScrollRef.current) {
          const container = transcriptionScrollRef.current;
          
          // Get accurate position using getBoundingClientRect
          const containerRect = container.getBoundingClientRect();
          const elementRect = activeElement.getBoundingClientRect();
          
          // Calculate element's position relative to the container's visible area
          const elementTopRelative = elementRect.top - containerRect.top;
          const elementBottomRelative = elementRect.bottom - containerRect.top;
          const containerHeight = container.clientHeight;
          
          // Check if element is outside visible area
          const isAbove = elementTopRelative < 0;
          const isBelow = elementBottomRelative > containerHeight;
          
          if (isAbove || isBelow) {
            // Calculate how much to scroll to center the element
            const scrollOffset = elementTopRelative - (containerHeight / 2) + (elementRect.height / 2);
            container.scrollTop = container.scrollTop + scrollOffset;
          }
        }
      }, 50);
    }
  }, [currentTime, transcriptionSegments.length]);

  const handlePlay = () => {
    if (!video) {
      console.error('No video data available');
      return;
    }
    if (!canAccessVideo(video.visibility)) {
      toast.error(t('video.premium_content'));
      return;
    }
    
    // If video has ended, restart it
    if (videoEnded) {
      console.log('Play button clicked, restarting video');
      setVideoEnded(false);
      setShowVideoPlayer(true);
      setVideoStarted(true);
      
      // Use HLS video element directly
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().then(() => {
          console.log('▶️ Restarting video');
        }).catch((error) => {
          console.error('Error restarting video:', error);
        });
      }
      return;
    }
    
    // If video hasn't started yet, start it
    if (!videoStarted) {
      console.log('Play button clicked, starting video');
      setVideoStarted(true);
      setShowVideoPlayer(true);
      
      // Use HLS video element directly
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          console.log('▶️ Starting video');
        }).catch((error) => {
          console.error('Error playing video:', error);
        });
      }
      return;
    }
    
    // Toggle play/pause using HLS video element directly
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          console.log('▶️ Playing video');
        }).catch((error) => {
          console.error('Error playing video:', error);
        });
      } else {
        videoRef.current.pause();
        console.log('⏸️ Pausing video');
      }
    }
  };

  // Proxy download helper function
  const useProxyDownload = async (videoId: number, quality: string, token: string, apiBaseUrl: string) => {
    try {
      console.log('📥 Using proxy download method...');
      toast.loading(t('video.preparing_download', 'Preparing download...'), { id: 'download' });
      
      const proxyUrl = `${apiBaseUrl}/api/videos/${videoId}/proxy-download?quality=${quality}`;
      
      // Fetch video as blob through proxy
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${(video?.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
        
        toast.success(t('video.download_started', 'Download started'), { id: 'download' });
        console.log('✅ Video download via proxy successful');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Proxy download failed' }));
        console.error('❌ Proxy download failed:', errorData);
        toast.error(errorData.message || t('video.download_failed', 'Failed to download video'), { id: 'download' });
      }
    } catch (error) {
      console.error('❌ Proxy download error:', error);
      toast.error(t('video.download_error', 'Failed to download video'), { id: 'download' });
    }
  };

  // Direct video download handler
  const handleVideoDownload = async () => {
    if (!video) {
      toast.error('Video not available');
      return;
    }

    if (!video.allow_download) {
      toast.error('Download is not allowed for this video');
      return;
    }

    if (!video.bunny_video_id && !video.bunny_embed_url && !video.bunny_video_url) {
      toast.error('Video download is not available');
      return;
    }

    try {
      toast.loading('Preparing download...', { id: 'download' });
      
      const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        toast.error(t('video.auth_required', 'Authentication required for download'), { id: 'download' });
        return;
      }
      
      // Use video ID for the API call
      const videoId = video.id;
      const quality = '720'; // Default quality
      
      const response = await fetch(`${apiBaseUrl}/api/videos/${videoId}/download-url?quality=${quality}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.download_url) {
          const downloadUrl = data.download_url;
          console.log('🔗 Bunny.net download URL:', downloadUrl);
          
          // Test if direct download URL is accessible (check for 403)
          try {
            const testResponse = await fetch(downloadUrl, { method: 'HEAD', mode: 'no-cors' });
            // If we can't test (CORS), try direct download first
            console.log('🔄 Attempting direct download...');
            
            const videoTitle = video.title || 'video';
            const videoExtension = video.video_format || 'mp4';
            const filename = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${videoExtension}`;
            
            // Try direct download first
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // If direct download fails (403), fall back to proxy after a short delay
            setTimeout(() => {
              console.log('🔄 If direct download failed, use proxy download method');
              // User can try again, or we can automatically use proxy
            }, 2000);
            
            toast.success(t('video.download_started', 'Download started'), { id: 'download' });
            console.log('✅ Video download triggered (direct method)');
          } catch (testError) {
            console.warn('⚠️ Could not test direct download, using proxy method:', testError);
            // Use proxy download method
            await useProxyDownload(videoId, quality, token, apiBaseUrl);
          }
        } else {
          console.error('❌ Failed to get download URL:', data.message);
          toast.error(data.message || t('video.download_failed', 'Failed to get download URL'), { id: 'download' });
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get download URL' }));
        console.error('❌ Download URL request failed:', errorData);
        toast.error(errorData.message || 'Failed to get download URL', { id: 'download' });
      }
    } catch (error: any) {
      console.error('❌ Error fetching download URL:', error);
      toast.error('Failed to download video. Please try again.', { id: 'download' });
    }
  };

  const handleDownloadMaterials = async () => {
    console.log('📥 Download materials clicked');
    console.log('📦 Downloadable resources:', downloadableResources);
    console.log('📦 Resources count:', downloadableResources.length);
    console.log('Video allow_download:', video?.allow_download);
    console.log('Video bunny_video_id:', video?.bunny_video_id);
    console.log('Video bunny_embed_url:', video?.bunny_embed_url);
    console.log('Video bunny_video_url:', video?.bunny_video_url);
    
    // Priority 1: If video allows download and has bunny_video_id, download video directly
    if (video && video.allow_download && video.bunny_video_id) {
      console.log('✅ Video allows download and has bunny_video_id, downloading video directly...');
      await handleVideoDownload();
      return;
    }
    
    // Priority 2: If video allows download and has bunny URLs, try to download
    if (video && video.allow_download && (video.bunny_embed_url || video.bunny_video_url)) {
      console.log('✅ Video allows download and has bunny URLs, downloading video directly...');
      await handleVideoDownload();
      return;
    }
    
    // Priority 3: Process downloadable resources if available
    if (downloadableResources.length > 0) {
      let downloadedCount = 0;
      let failedCount = 0;
      
      for (let index = 0; index < downloadableResources.length; index++) {
        const resource = downloadableResources[index];
        console.log(`📄 Processing resource ${index + 1}/${downloadableResources.length}:`, resource);
        
        // Handle Bunny.net video download
        if (resource.url && resource.url.startsWith('api://download-video/') && resource.video_id) {
          try {
            // Fetch download URL from API
            const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000';
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const response = await fetch(`${apiBaseUrl}/api/videos/${resource.video_id}/download-url?quality=720`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.download_url) {
                const downloadUrl = data.download_url;
                console.log('🔗 Bunny.net download URL:', downloadUrl);
                
                // Create download link
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.download = resource.filename || resource.name || 'video.mp4';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                downloadedCount++;
                console.log('✅ Video download triggered successfully');
              } else {
                console.error('❌ Failed to get download URL:', data.message);
                failedCount++;
                toast.error(data.message || 'Failed to get download URL');
              }
            } else {
              const errorData = await response.json().catch(() => ({ message: 'Failed to get download URL' }));
              console.error('❌ Download URL request failed:', errorData);
              failedCount++;
              toast.error(errorData.message || 'Failed to get download URL');
            }
          } catch (error) {
            console.error('❌ Error fetching download URL:', error);
            failedCount++;
            toast.error('Failed to download video');
          }
          continue;
        }
        
        if (resource.url) {
          try {
            // Get full URL - handle both relative and absolute URLs
            let downloadUrl = resource.url;
            
            // If it's a relative URL, prepend the API base URL
            if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://') && !downloadUrl.startsWith('api://')) {
              const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
              downloadUrl = `${baseUrl.replace('/api', '')}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
            }
            
            console.log('🔗 Final download URL:', downloadUrl);
            
            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Set download attribute if we have a filename
            if (resource.filename || resource.name) {
              link.download = resource.filename || resource.name;
              console.log('📝 Using filename:', resource.filename || resource.name);
            } else {
              // Extract filename from URL
              const urlParts = downloadUrl.split('/');
              const filename = urlParts[urlParts.length - 1].split('?')[0];
              if (filename) {
                link.download = filename;
                console.log('📝 Extracted filename:', filename);
              }
            }
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            downloadedCount++;
            console.log('✅ Download triggered successfully');
            
            // Add small delay between multiple downloads
            if (index < downloadableResources.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            console.error('❌ Error downloading resource:', error, resource);
            failedCount++;
            // Fallback: open in new tab
            try {
              window.open(resource.url, '_blank');
              console.log('🔄 Fallback: opened in new tab');
            } catch (fallbackError) {
              console.error('❌ Fallback download also failed:', fallbackError);
              toast.error(`Failed to download: ${resource.url || 'unknown resource'}`);
            }
          }
        } else {
          console.warn('⚠️ Resource has no URL:', resource);
          failedCount++;
        }
      }
      
      if (downloadedCount > 0) {
        toast.success(`${downloadedCount} ${downloadedCount === 1 ? 'file' : 'files'} ${t('video.download_started', 'download iniciado')}`);
      } else if (failedCount > 0) {
        toast.error('Failed to download materials. Please check the console for details.');
      }
    } else {
      console.warn('⚠️ No downloadable resources available');
      console.log('Video data:', video);
      console.log('allow_download:', video?.allow_download);
      console.log('downloadable_resources:', video?.downloadable_resources);
      console.log('bunny_video_id:', video?.bunny_video_id);
      
      // If video allows download but we couldn't download it, show specific error
      if (video?.allow_download && !video?.bunny_video_id && !video?.bunny_embed_url && !video?.bunny_video_url) {
        toast.error(t('video.download_not_configured', 'Download is enabled but video source is not configured. Please contact support.'));
      } else if (video?.allow_download === false && !video?.downloadable_resources) {
        toast.info(t('video.no_downloadable_resources', 'No hay materiales descargables disponibles. Los recursos descargables deben agregarse en el panel de administración.'));
      } else {
        toast.info(t('video.no_downloadable_resources', 'No hay materiales descargables disponibles'));
      }
    }
  };

  const handleTranscription = () => {
    // Toggle transcription visibility
    if (activeTab === 'transcription') {
      setActiveTab(null);
    } else {
      setActiveTab('transcription');
      
      // If no transcription loaded yet, try to load it
      if (!transcription && video?.id) {
        loadTranscription(video.id, video);
      }
    }
  };

  const handleLike = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in'));
      return;
    }

    // Store previous state for error rollback
    const previousLikedState = isLiked;
    const previousDislikedState = isDisliked;
    
    // Optimistically update UI immediately for instant feedback
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    if (newLikedState && isDisliked) {
      setIsDisliked(false);
    }

    try {
      const response = await userProgressApi.toggleLike(video.id);
      if (response.success && response.data) {
        // Update state from response data (server truth)
        const isLikedValue = response.data.is_liked === true || response.data.is_liked === 1;
        const isDislikedValue = response.data.is_disliked === true || response.data.is_disliked === 1;
        
        setIsLiked(isLikedValue);
        setIsDisliked(isDislikedValue);
        
        // Update userProgress state as well
        setUserProgress((prev: any) => ({
          ...prev,
          is_liked: isLikedValue,
          is_disliked: isDislikedValue,
        }));
        
        // Show success message
        if (isLikedValue) {
          toast.success(t('video.video_liked', 'Video liked'));
        } else {
          toast.success(t('video.like_removed', 'Like removed'));
        }
      } else {
        // If response doesn't have data, fetch latest progress
        try {
          const progressResponse = await userProgressApi.getVideoProgress(video.id);
          if (progressResponse.success && progressResponse.data) {
            const progress = progressResponse.data;
            setIsLiked(progress.is_liked === true || progress.is_liked === 1);
            setIsDisliked(progress.is_disliked === true || progress.is_disliked === 1);
            setUserProgress(progress);
          }
        } catch (fetchError) {
          console.error('Failed to fetch updated progress:', fetchError);
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert optimistic update on error
      setIsLiked(previousLikedState);
      setIsDisliked(previousDislikedState);
      toast.error(t('video.failed_like', 'Failed to like video'));
    }
  };

  const handleDislike = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in'));
      return;
    }

    // Store previous state for error rollback
    const previousLikedState = isLiked;
    const previousDislikedState = isDisliked;
    
    // Optimistically update UI immediately for instant feedback
    const newDislikedState = !isDisliked;
    setIsDisliked(newDislikedState);
    if (newDislikedState && isLiked) {
      setIsLiked(false);
    }

    try {
      const response = await userProgressApi.toggleDislike(video.id);
      if (response.success && response.data) {
        // Update state from response data (server truth)
        const isLikedValue = response.data.is_liked === true || response.data.is_liked === 1;
        const isDislikedValue = response.data.is_disliked === true || response.data.is_disliked === 1;
        
        setIsLiked(isLikedValue);
        setIsDisliked(isDislikedValue);
        
        // Update userProgress state as well
        setUserProgress((prev: any) => ({
          ...prev,
          is_liked: isLikedValue,
          is_disliked: isDislikedValue,
        }));
        
        // Show success message
        if (isDislikedValue) {
          toast.success(t('video.video_disliked', 'Video disliked'));
        } else {
          toast.success(t('video.dislike_removed', 'Dislike removed'));
        }
      } else {
        // If response doesn't have data, fetch latest progress
        try {
          const progressResponse = await userProgressApi.getVideoProgress(video.id);
          if (progressResponse.success && progressResponse.data) {
            const progress = progressResponse.data;
            setIsLiked(progress.is_liked === true || progress.is_liked === 1);
            setIsDisliked(progress.is_disliked === true || progress.is_disliked === 1);
            setUserProgress(progress);
          }
        } catch (fetchError) {
          console.error('Failed to fetch updated progress:', fetchError);
        }
      }
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
      // Revert optimistic update on error
      setIsLiked(previousLikedState);
      setIsDisliked(previousDislikedState);
      toast.error(t('video.failed_dislike', 'Failed to dislike video'));
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in_favorites', 'Please sign in to add favorites'));
      return;
    }

    // Store previous state for error rollback
    const previousFavoriteState = isFavorite;
    
    // Optimistically update UI immediately for instant feedback
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    try {
      const response = await userProgressApi.toggleFavorite(video.id);
      if (response.success && response.data) {
        // Update state from response data (server truth)
        const isFavoriteValue = response.data.is_favorite === true || response.data.is_favorite === 1;
        
        setIsFavorite(isFavoriteValue);
        
        // Update userProgress state as well
        setUserProgress((prev: any) => ({
          ...prev,
          is_favorite: isFavoriteValue,
        }));
        
        // Show success message
        if (isFavoriteValue) {
          toast.success(t('video.added_to_favorites', 'Added to favorites'));
        } else {
          toast.success(t('video.removed_from_favorites', 'Removed from favorites'));
        }
      } else {
        // If response doesn't have data, fetch latest progress
        try {
          const progressResponse = await userProgressApi.getVideoProgress(video.id);
          if (progressResponse.success && progressResponse.data) {
            const progress = progressResponse.data;
            setIsFavorite(progress.is_favorite === true || progress.is_favorite === 1);
            setUserProgress(progress);
          }
        } catch (fetchError) {
          console.error('Failed to fetch updated progress:', fetchError);
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert optimistic update on error
      setIsFavorite(previousFavoriteState);
      toast.error(error instanceof Error ? error.message : t('video.failed_update_favorites', 'Failed to update favorites'));
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in'));
      return;
    }

    if (!comment.trim()) {
      toast.error(t('video.comment_required'));
      return;
    }

    try {
      const response = await commentsApi.createComment(video.id, {
        comment: comment.trim()
      });

      if (response.success) {
        setComment('');
        // Refresh comments
        const commentsResponse = await commentsApi.getComments(video.id, 'newest');
        if (commentsResponse.success) {
          setComments(commentsResponse.data);
        }
        toast.success(t('video.comment_posted'));
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error(t('video.failed_post_comment'));
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('video.just_now', 'ahora mismo');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('video.minutes_ago', 'minutos')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('video.hours_ago', 'horas')}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t('video.days_ago', 'días')}`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <main className="w-full min-h-screen pb-20 bg-background-dark font-display">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-8">
          <div className="animate-pulse">
            <div className="aspect-video md:aspect-[21/9] bg-surface-dark rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-12 bg-surface-dark rounded w-3/4"></div>
                <div className="h-4 bg-surface-dark rounded w-full"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-surface-dark rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="w-full min-h-screen pb-20 bg-background-dark font-display text-text-light">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('video.video_not_found')}</h1>
          <Button onClick={() => navigateWithLocale('/browse')}>
            {t('video.browse_all_videos')}
          </Button>
        </div>
      </main>
    );
  }

  const hasAccess = canAccessVideo(video.visibility);
  const savedProgressPercentage = userProgress?.progress_percentage || 0;
  // Calculate real-time progress based on current video time
  const videoDuration = video.duration || 0;
  const realTimeProgressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : savedProgressPercentage;
  // Use real-time progress if video is playing, otherwise use saved progress
  const progressPercentage = currentTime > 0 && videoDuration > 0 ? realTimeProgressPercentage : savedProgressPercentage;
  const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || video.bunny_thumbnail_url || '');
  const videoUrl = video.bunny_embed_url || video.bunny_video_url || video.video_url_full || video.video_url;
  
  // Debug logging for video player
  // console.log('=== EpisodeDetail: Video Player State ===');
  // console.log('Has Access:', hasAccess);
  // console.log('Show Video Player:', showVideoPlayer);
  // console.log('Video URL (final):', videoUrl);
  // console.log('Bunny Embed URL:', video.bunny_embed_url);
  // console.log('Bunny Player URL:', video.bunny_player_url);
  // console.log('Thumbnail URL:', thumbnailUrl);

  return (
    <main className="w-full min-h-screen pb-20 bg-background-dark font-display text-text-light">
      {/* Video Player Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div 
          className="relative w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden shadow-2xl group cursor-pointer border border-border-dark/50"
          onClick={() => {
            if (!hasAccess || !video) return;
            if (!showVideoPlayer) {
              setShowVideoPlayer(true);
              setVideoStarted(true);
              
              // Wait for iframe to render and player to initialize, then play
              const tryPlay = (attempts = 0) => {
                if (attempts > 20) { // Max 2 seconds (20 * 100ms)
                  console.error('❌ Player not ready after 2 seconds');
                  return;
                }
                
                const iframe = document.getElementById(`bunny-iframe-${video?.id}`) as HTMLIFrameElement;
                if (iframe && bunnyPlayerRef.current) {
                  console.log('✅ Player is ready, attempting to play');
                  handlePlay();
                } else {
                  console.log(`⏳ Waiting for player to be ready (attempt ${attempts + 1})...`);
                  setTimeout(() => tryPlay(attempts + 1), 100);
                }
              };
              
              // Start checking after a short delay to allow iframe to render
              setTimeout(() => tryPlay(), 200);
            }
          }}
        >
          {hasAccess ? (
            <>
              {!showVideoPlayer && thumbnailUrl ? (
                <>
                  <img
                    alt={video.title}
                    src={thumbnailUrl}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                    <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                  </div>
                </>
              ) : !videoEnded && (video.bunny_embed_url || video.bunny_player_url || video.bunny_hls_url) ? (
                <div className="w-full h-full relative">
                  {playbackError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
                      <div className="text-center max-w-md">
                        <p className="text-red-400 text-lg font-semibold mb-2">
                          {playbackError}
                        </p>
                        <button
                          onClick={() => {
                            setPlaybackError(null);
                            window.location.reload();
                          }}
                          className="mt-4 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                        >
                          {t('common.reload', 'Recargar Página')}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* CC Toggle Button - Top Position */}
                  {transcriptionSegments.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptionOverlayEnabled(!captionOverlayEnabled);
                      }}
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded text-xs font-medium z-20 transition-all ${
                        captionOverlayEnabled 
                          ? 'bg-primary text-white border border-primary' 
                          : 'bg-black/70 text-white/80 border border-white/30 hover:bg-black/90'
                      }`}
                      title={captionOverlayEnabled ? t('video.hide_captions', 'Hide Captions') : t('video.show_captions', 'Show Captions')}
                    >
                      CC
                    </button>
                  )}
                  {/* HLS Video Player */}
                  <video
                    ref={videoRef}
                    key={`hls-video-${video.id}`}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    onPlay={() => {
                      console.log('✅ HLS Video started playing');
                      setIsPlaying(true);
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      // Save progress immediately when user pauses
                      if (videoRef.current && user && video) {
                        const current = videoRef.current.currentTime;
                        const dur = videoRef.current.duration || video.duration;
                        if (dur > 0 && current > 0) {
                          const videoDuration = video.duration || dur;
                          const progressPercentage = (current / videoDuration) * 100;
                          userProgressApi.updateVideoProgress(video.id, {
                            time_watched: Math.floor(current),
                            video_duration: Math.floor(videoDuration),
                            progress_percentage: Math.floor(progressPercentage),
                            is_completed: progressPercentage >= 90,
                          }).then(() => {
                            lastSavedProgress.current = Math.floor(current);
                          }).catch(console.error);
                        }
                      }
                    }}
                    onError={(e) => {
                      console.error('❌ HLS Video failed to load:', e);
                      setPlaybackError(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
                    }}
                    onLoadedData={() => {
                      console.log('✅ HLS Video data loaded');
                      // Seek to saved position if user has progress (only once), then autoplay
                      if (videoRef.current && !hasSeekedToSavedPosition.current) {
                        hasSeekedToSavedPosition.current = true;
                        
                        if (userProgress) {
                          const savedTime = userProgress.time_watched || userProgress.last_position || 0;
                          const videoDuration = videoRef.current.duration || video.duration || 0;
                          const progressPercent = userProgress.progress_percentage || 0;
                          
                          // Only seek if there's a saved position and video isn't completed
                          if (savedTime > 0 && videoDuration > 0 && savedTime < videoDuration && progressPercent < 90) {
                            console.log(`⏩ Seeking HLS video to saved position: ${savedTime} seconds`);
                            videoRef.current.currentTime = savedTime;
                            setCurrentTime(savedTime);
                          }
                        }
                        
                        // Autoplay
                        videoRef.current.play().then(() => {
                          setIsPlaying(true);
                          setVideoStarted(true);
                          console.log('▶️ HLS video autoplay started');
                        }).catch((error) => {
                          console.error('Error autoplaying HLS video:', error);
                        });
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const current = e.currentTarget.currentTime;
                      const dur = e.currentTarget.duration;
                      setCurrentTime(current);
                      // Duration comes from database, not from video element
                      if (dur > 0 && user && video) {
                        const videoDuration = video.duration || dur;
                        const progressPercentage = (current / videoDuration) * 100;
                        const timeWatched = Math.floor(current);
                        
                        // Save progress every 5 seconds
                        const timeSinceLastSave = timeWatched - lastSavedProgress.current;
                        if (timeSinceLastSave >= 5) {
                          if (progressSaveTimeout.current) {
                            clearTimeout(progressSaveTimeout.current);
                          }
                          progressSaveTimeout.current = setTimeout(() => {
                            userProgressApi.updateVideoProgress(video.id, {
                              time_watched: timeWatched,
                              video_duration: Math.floor(videoDuration),
                              progress_percentage: Math.floor(progressPercentage),
                              is_completed: progressPercentage >= 90,
                            }).then(() => {
                              lastSavedProgress.current = timeWatched;
                            }).catch(console.error);
                          }, 1000);
                        }
                      }
                    }}
                    onEnded={() => {
                      setVideoEnded(true);
                      setIsPlaying(false);
                    }}
                  />
                  {/* Caption Overlay */}
                  {captionOverlayEnabled && activeCaptionText && (
                    <div 
                      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-[90%] px-4 py-2 bg-black/80 text-white text-center rounded pointer-events-none z-10 transition-opacity duration-200"
                      style={{ fontSize: '18px', lineHeight: '1.4' }}
                    >
                      {activeCaptionText}
                    </div>
                  )}
                </div>
              ) : videoUrl ? (
                <div className="w-full h-full relative">
                  {/* CC Toggle Button - Top Position */}
                  {transcriptionSegments.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptionOverlayEnabled(!captionOverlayEnabled);
                      }}
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded text-xs font-medium z-20 transition-all ${
                        captionOverlayEnabled 
                          ? 'bg-primary text-white border border-primary' 
                          : 'bg-black/70 text-white/80 border border-white/30 hover:bg-black/90'
                      }`}
                      title={captionOverlayEnabled ? t('video.hide_captions', 'Hide Captions') : t('video.show_captions', 'Show Captions')}
                    >
                      CC
                    </button>
                  )}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    onPlay={() => {
                      console.log('✅ Video started playing');
                      setIsPlaying(true);
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      // Save progress immediately when user pauses
                      if (videoRef.current && user && video) {
                        const current = videoRef.current.currentTime;
                        const dur = videoRef.current.duration || video.duration;
                        if (dur > 0 && current > 0) {
                          const videoDuration = video.duration || dur;
                          const progressPercentage = (current / videoDuration) * 100;
                          userProgressApi.updateVideoProgress(video.id, {
                            time_watched: Math.floor(current),
                            video_duration: Math.floor(videoDuration),
                            progress_percentage: Math.floor(progressPercentage),
                            is_completed: progressPercentage >= 90,
                          }).then(() => {
                            lastSavedProgress.current = Math.floor(current);
                          }).catch(console.error);
                        }
                      }
                    }}
                    onError={(e) => {
                      console.error('❌ Video failed to load:', e);
                      console.error('Video URL:', videoUrl);
                    }}
                    onLoadedData={() => {
                      // console.log('✅ Video data loaded');
                      // Seek to saved position if user has progress (only once), then autoplay
                      if (videoRef.current && !hasSeekedToSavedPosition.current) {
                        hasSeekedToSavedPosition.current = true;
                        
                        if (userProgress) {
                          const savedTime = userProgress.time_watched || userProgress.last_position || 0;
                          const videoDuration = videoRef.current.duration || video.duration || 0;
                          const progressPercent = userProgress.progress_percentage || 0;
                          
                          // Only seek if there's a saved position and video isn't completed
                          if (savedTime > 0 && videoDuration > 0 && savedTime < videoDuration && progressPercent < 90) {
                            console.log(`⏩ Seeking native video to saved position: ${savedTime} seconds, then autoplay`);
                            videoRef.current.currentTime = savedTime;
                            setCurrentTime(savedTime);
                            
                            // Autoplay after seeking
                            setTimeout(() => {
                              if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                  setIsPlaying(true);
                                  setVideoStarted(true);
                                  console.log('▶️ Native video autoplay started from saved position');
                                }).catch((error) => {
                                  console.error('Error autoplaying native video:', error);
                                });
                              }
                            }, 100); // Small delay to ensure seek completes
                          } else {
                            // No saved progress or completed, just autoplay from start
                            videoRef.current.play().then(() => {
                              setIsPlaying(true);
                              setVideoStarted(true);
                              console.log('▶️ Native video autoplay started from beginning');
                            }).catch((error) => {
                              console.error('Error autoplaying native video:', error);
                            });
                          }
                        } else {
                          // No user progress, just autoplay from start
                          videoRef.current.play().then(() => {
                            setIsPlaying(true);
                            setVideoStarted(true);
                            console.log('▶️ Native video autoplay started from beginning');
                          }).catch((error) => {
                            console.error('Error autoplaying native video:', error);
                          });
                        }
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const current = e.currentTarget.currentTime;
                      const dur = e.currentTarget.duration;
                      setCurrentTime(current);
                      // Duration comes from database, not from video element
                      if (dur > 0 && user && video) {
                        const videoDuration = video.duration || dur; // Use database duration if available
                        const progressPercentage = (current / videoDuration) * 100;
                        const timeWatched = Math.floor(current);
                        
                        // Save progress more frequently (every 5 seconds) or if significant change
                        const timeSinceLastSave = timeWatched - lastSavedProgress.current;
                        if (timeSinceLastSave >= 5 || Math.abs(progressPercentage - (lastSavedProgress.current / videoDuration * 100)) >= 5) {
                          // Clear any pending save
                          if (progressSaveTimeout.current) {
                            clearTimeout(progressSaveTimeout.current);
                          }
                          
                          // Debounce: Save after 1 second of no updates (to catch when user pauses)
                          progressSaveTimeout.current = setTimeout(() => {
                            userProgressApi.updateVideoProgress(video.id, {
                              time_watched: timeWatched,
                              video_duration: Math.floor(videoDuration),
                              progress_percentage: Math.floor(progressPercentage),
                              is_completed: progressPercentage >= 90,
                            }).then(() => {
                              lastSavedProgress.current = timeWatched;
                            }).catch(console.error);
                          }, 1000);
                        }
                      }
                    }}
                  />
                  {/* Caption Overlay for native video */}
                  {captionOverlayEnabled && activeCaptionText && (
                    <div 
                      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-[90%] px-4 py-2 bg-black/80 text-white text-center rounded pointer-events-none z-10 transition-opacity duration-200"
                      style={{ fontSize: '18px', lineHeight: '1.4' }}
                    >
                      {activeCaptionText}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-text-dim mb-2">{t('video.video_file_not_available')}</p>
                    <p className="text-xs text-text-dim/60">
                      {t('video.no_video_url_found', 'No video URL found. Check bunny_embed_url, bunny_video_url, or video_url fields.')}
                    </p>
                    <p className="text-xs text-text-dim/60 mt-2">
                      {t('video.available_fields', 'Available fields:')} {JSON.stringify({
                        bunny_embed_url: video.bunny_embed_url,
                        bunny_player_url: video.bunny_player_url,
                        bunny_video_url: video.bunny_video_url,
                        video_url_full: video.video_url_full,
                        video_url: video.video_url
                      }, null, 2)}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {thumbnailUrl ? (
                <>
                  <img
                  alt={video.title}
                  src={thumbnailUrl}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                  <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {!hasAccess && (
                    <div className="text-center">
                      <Lock className="h-16 w-16 text-text-dim mx-auto mb-4" />
                      <p className="text-text-dim">{t('video.premium_content')}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Progress Bar - Shows real-time video progress */}
          {video && videoDuration > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700 z-20">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              ></div>
            </div>
          )}
        </div>
      </section>

      {/* Multi-Language Audio Player - Only for TTS audio (not original) */}
      {/* TODO: Enable audio dubbing feature later */}
      {false && video && video.audio_urls && Object.keys(video.audio_urls).length > 0 && hasAccess && (() => {
        // Get current locale
        const currentLocale = (locale || 'en').substring(0, 2);
        const finalLocale = ['en', 'es', 'pt'].includes(currentLocale) ? currentLocale : 'en';
        
        // Filter out 'original' audio (source language uses video's original audio)
        const ttsAudioTracks = Object.entries(video.audio_urls)
          .filter(([lang, url]) => url !== 'original' && typeof url === 'string')
          .map(([lang, url]) => ({
            language: lang,
            url: url as string,
            label: lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'pt' ? 'Português' : lang.toUpperCase()
          }));
        
        // Only show audio player if there are TTS tracks available
        if (ttsAudioTracks.length === 0) {
          console.log('No TTS audio tracks available (only original audio)');
          return null;
        }
        
        // Check if current locale has audio available, otherwise use first available
        const defaultLang = ttsAudioTracks.find(t => t.language === finalLocale) 
          ? finalLocale 
          : ttsAudioTracks[0]?.language || 'en';
        
        console.log('🎵 Audio tracks available:', {
          tracks: ttsAudioTracks.map(t => t.language),
          currentLocale: finalLocale,
          defaultLang,
        });
        
        return (
          <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6" key={`audio-player-${video.id}-${finalLocale}`}>
            <MultiLanguageAudioPlayer
              audioTracks={ttsAudioTracks}
              defaultLanguage={defaultLang as 'en' | 'es' | 'pt'}
              videoRef={videoRef}
            />
          </section>
        );
      })()}

      {/* Action Buttons Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('▶️ Play button clicked:', {
                showVideoPlayer,
                videoUrl,
                bunnyEmbedUrl: video?.bunny_embed_url,
                hasPlayer: !!bunnyPlayerRef.current
              });
              
              // If video player is not shown, show it first
              if (!showVideoPlayer) {
                console.log('✅ Setting showVideoPlayer to true');
                setShowVideoPlayer(true);
                setVideoStarted(true);
                
                // Wait for iframe to render and player to initialize, then play
                const tryPlay = (attempts = 0) => {
                  if (attempts > 20) { // Max 2 seconds (20 * 100ms)
                    console.error('❌ Player not ready after 2 seconds');
                    return;
                  }
                  
                  const iframe = document.getElementById(`bunny-iframe-${video?.id}`) as HTMLIFrameElement;
                  if (iframe && bunnyPlayerRef.current) {
                    console.log('✅ Player is ready, attempting to play');
                    handlePlay();
                  } else {
                    console.log(`⏳ Waiting for player to be ready (attempt ${attempts + 1})...`);
                    setTimeout(() => tryPlay(attempts + 1), 100);
                  }
                };
                
                // Start checking after a short delay to allow iframe to render
                setTimeout(() => tryPlay(), 200);
              } else {
                // Video player is already shown, just toggle play/pause
                handlePlay();
              }
            }}
            disabled={!hasAccess || !video}
            className="flex items-center gap-3 px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold tracking-wide rounded transition-all shadow-lg hover:shadow-primary/30 w-full md:w-auto justify-center md:justify-start uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            {isPlaying ? t('video.pause', 'PAUSAR') : t('video.play', 'REPRODUCIR')}
          </Button>
          <div className="flex flex-wrap gap-4 w-full md:w-auto md:ml-auto">
            <Button
              onClick={handleDownloadMaterials}
              variant="outline"
              className="flex-1 md:flex-none items-center gap-2 px-6 py-3 border border-primary/40 hover:bg-primary/10 text-primary font-semibold tracking-wide rounded transition-all flex justify-center uppercase text-xs"
            >
              <Download className="h-5 w-5 text-primary" />
              {t('video.download_materials', 'DESCARGAR MATERIALES')}
            </Button>
            <Button
              onClick={handleTranscription}
              variant="outline"
              className="flex-1 md:flex-none items-center gap-2 px-6 py-3 border border-primary/40 hover:bg-primary/10 text-primary font-semibold tracking-wide rounded transition-all flex justify-center uppercase text-xs"
            >
              <FileText className="h-5 w-5 text-primary" />
              {t('video.transcription', 'TRANSCRIPCIÓN')}
            </Button>
          </div>
        </div>
      </section>

      {/* Video Info and Comments Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-text-main-light dark:text-white leading-tight">
              {video.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide">
              <span>{getYear(video.created_at || video.published_at)}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span>{formatDuration(video.duration || 0)}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="border border-current px-1 rounded text-[10px] font-bold">{t('video.transcription_badge', 'T')}</span>
              {series && (
                <>
                  <span className="w-1 h-1 bg-current rounded-full"></span>
                  <span>{getSeriesTitle(series)}</span>
                </>
              )}
              {series && category && (
                <>
                  <span className="w-1 h-1 bg-current rounded-full"></span>
                  <span>{getCategoryName(category)}</span>
                </>
              )}
              {!series && category && (
                <>
                  <span className="w-1 h-1 bg-current rounded-full"></span>
                  <span>{getCategoryName(category)}</span>
                </>
              )}
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-text-main-light dark:text-gray-300 font-light">
                {video.description || video.short_description || ''}
              </p>
            </div>
            {/* Transcription Content - Only shown when button is pressed */}
            {/* TED Talks style transcription with clickable timestamps */}
            {activeTab === 'transcription' && (
                <div data-transcription-section className="py-6 max-w-4xl">
                  {transcriptionSegments.length > 0 ? (
                    <div 
                      ref={transcriptionScrollRef}
                      className="max-h-[500px] overflow-y-auto pr-4 scroll-smooth"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#A05245 #2a2a2a'
                      }}
                    >
                      <div className="space-y-4">
                      {transcriptionSegments.map((segment, index) => (
                        <div
                          id={`transcript-segment-${index}`}
                          key={index}
                          onClick={() => {
                            // Seek to this segment's start time
                            if (video && (video.bunny_embed_url || video.bunny_player_url)) {
                              if (bunnyPlayerRef.current) {
                                try {
                                  bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                                  setCurrentTime(segment.startTime);
                                } catch (error) {
                                  console.error('Error seeking to segment:', error);
                                }
                              }
                            } else if (videoRef.current) {
                              videoRef.current.currentTime = segment.startTime;
                              setCurrentTime(segment.startTime);
                            }
                          }}
                          className={`group relative flex items-start gap-4 p-4 rounded-lg transition-all duration-200 ${
                            segment.isActive
                              ? 'bg-[#A05245]/10 border-l-4 border-[#A05245] shadow-sm'
                              : 'hover:bg-white/5 border-l-4 border-transparent cursor-pointer'
                          }`}
                        >
                          {/* Timestamp - TED Talks style */}
                          <button
                            className={`font-mono text-sm font-medium flex-shrink-0 mt-0.5 transition-colors min-w-[4rem] text-left ${
                              segment.isActive 
                                ? 'text-[#A05245] font-bold' 
                                : 'text-gray-400 hover:text-[#A05245]'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Seek to this segment's start time
                              if (video && (video.bunny_embed_url || video.bunny_player_url)) {
                                if (bunnyPlayerRef.current) {
                                  try {
                                    bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                                    setCurrentTime(segment.startTime);
                                  } catch (error) {
                                    console.error('Error seeking to segment:', error);
                                  }
                                }
                              } else if (videoRef.current) {
                                videoRef.current.currentTime = segment.startTime;
                                setCurrentTime(segment.startTime);
                              }
                            }}
                          >
                            {segment.time}
                          </button>
                          
                          {/* Text content */}
                          <p className={`flex-1 leading-relaxed transition-all ${
                            segment.isActive
                              ? 'text-white font-medium text-base'
                              : 'text-gray-300 font-normal text-base'
                          }`}>
                            {segment.text}
                          </p>
                        </div>
                      ))}
                      </div>
                    </div>
                  ) : transcription ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="text-base leading-relaxed text-gray-300 font-light whitespace-pre-wrap">
                        {transcription}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-base">{t('video.no_transcription', 'No hay transcripción disponible')}</p>
                    </div>
                  )}
                </div>
              )}
            {/* Comments Section - Hidden for now to match code.html design */}
            {false && (
              <div className="mt-12 pt-8 border-t border-border-dark">
                <h3 className="text-xl font-bold text-white mb-6">
                  {t('video.comments', 'Comentarios')} <span className="text-sm font-normal text-text-muted-dark ml-2">{comments.length}</span>
                </h3>
                {user && (
                  <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 bg-zinc-700 rounded-full flex-shrink-0 overflow-hidden">
                      {(user as any).avatar ? (
                        <img src={(user as any).avatar} alt={user.name || t('video.user', 'User')} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {getInitials(user.name || user.email)}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <Input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                        className="w-full bg-transparent border-b border-border-dark focus:border-primary px-2 py-2 text-sm text-white focus:ring-0 placeholder-text-muted-dark transition-colors"
                        placeholder={t('video.add_comment', 'Añade un comentario...')}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-6 max-h-[400px] overflow-y-auto comments-scroll pr-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-text-muted-dark text-center py-4">
                      {t('video.no_comments', 'No hay comentarios aún')}
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {getInitials(comment.user?.name || comment.user?.email)}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-bold text-white">
                              {comment.user?.name || t('video.anonymous', 'Anónimo')}
                            </span>
                            <span className="text-xs text-text-muted-dark">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Participants/Instructors */}
          <div className="lg:col-span-1 border-l border-border-light dark:border-border-dark pl-0 lg:pl-12 pt-6 lg:pt-2">
            <h3 className="text-sm font-bold text-text-muted-dark uppercase tracking-widest mb-6">
              {t('video.participants', 'Intervienen')}
            </h3>
            <ul className="space-y-4 text-text-muted-light dark:text-text-muted-dark text-sm leading-relaxed">
              {video.instructor ? (
                <li className="group">
                  <span className="block text-text-main-light dark:text-white font-bold text-base group-hover:text-primary transition-colors">
                    {typeof video.instructor === 'object' ? video.instructor.name : video.instructor}
                  </span>
                  <span className="text-xs uppercase tracking-wide opacity-80">
                    {typeof video.instructor === 'object' ? video.instructor.title || t('video.instructor', 'Instructor') : t('video.instructor', 'Instructor')}
                  </span>
                </li>
              ) : (
                <li className="group">
                  <span className="block text-text-main-light dark:text-white font-bold text-base group-hover:text-primary transition-colors">
                    Ana Rey
                  </span>
                  <span className="text-xs uppercase tracking-wide opacity-80">
                    {t('video.master_sculptor', 'Maestro tallista Invitado')}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Related Videos Section */}
      {relatedVideos.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8 border-b border-border-dark pb-4">
            <h3 className="text-xl font-bold text-white font-display tracking-wide uppercase">
              {t('video.related_videos', 'Vídeos Relacionados')}
            </h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="text-white" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="text-white" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedVideos.map((relatedVideo) => {
              const relatedThumbnail = getImageUrl(relatedVideo.intro_image_url || relatedVideo.intro_image || relatedVideo.thumbnail_url || relatedVideo.thumbnail || relatedVideo.bunny_thumbnail_url || '');
              const isNew = relatedVideo.created_at && new Date(relatedVideo.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              const shouldShowLock = shouldShowLockIcon(relatedVideo.visibility);
              const isLocked = isVideoLocked(relatedVideo.visibility, user?.subscription_type);
              const showLockIcon = shouldShowLock;
              
              return (
                <div
                  key={relatedVideo.id}
                  className={`group ${showLockIcon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (isLocked || showLockIcon) {
                      toast.error(t('video.locked_content'));
                      return;
                    }
                    navigateWithLocale(`/episode/${relatedVideo.id}`);
                  }}
                >
                  <div className="relative aspect-video rounded-md overflow-hidden mb-3 border border-transparent group-hover:border-primary/50 transition-all">
                    {relatedThumbnail ? (
                      <img
                        alt={relatedVideo.title}
                        src={relatedThumbnail}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${showLockIcon ? 'opacity-60' : ''}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5"></div>
                    )}
                    {showLockIcon ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2 px-3 text-center">
                          <Lock className="h-10 w-10 text-white" />
                          <span className="text-white text-xs font-semibold">{t(getLockMessageKey(relatedVideo.visibility))}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-primary/90 rounded-full p-2 backdrop-blur-sm">
                            <i className="fa-solid fa-play text-white text-xl"></i>
                          </div>
                        </div>
                      </>
                    )}
                    {isNew && (
                      <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                        {t('video.new', 'Nuevo')}
                      </span>
                    )}
                    {relatedVideo.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium tracking-wider">
                        {formatDurationShort(relatedVideo.duration)}
                      </div>
                    )}
                  </div>
                  <h4 className="text-text-main-light dark:text-gray-200 font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {relatedVideo.title}
                  </h4>
                  <p className="text-xs text-text-muted-dark mt-1">
                    {relatedVideo.series ? getSeriesTitle(relatedVideo.series) : (relatedVideo.series?.name || t('video.series', 'Serie'))}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default EpisodeDetail;

