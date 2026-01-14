import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { liveArchiveVideoApi, LiveArchiveVideo } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { toast } from 'sonner';

const LiveArchiveDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<LiveArchiveVideo | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<LiveArchiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  
  interface TranscriptionSegment {
    time: string;
    startTime: number;
    endTime: number;
    text: string;
    isActive?: boolean;
  }
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [activeTab, setActiveTab] = useState<'transcription' | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const lastSavedProgress = useRef<number>(0);
  const progressSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasSeekedToSavedPosition = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const bunnyPlayerRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();

  // Load Player.js library for Bunny.net iframe control
  useEffect(() => {
    if ((window as any).playerjs) {
      return;
    }

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
      await liveArchiveVideoApi.updateProgress(video.id, {
        time_watched: Math.floor(timeWatched),
        video_duration: Math.floor(videoDuration),
        progress_percentage: Math.floor(progressPercentage),
        is_completed: progressPercentage >= 90,
      });
      lastSavedProgress.current = Math.floor(timeWatched);
      // console.log('✅ Progress saved for live archive video:', Math.floor(progressPercentage) + '%');
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }, [user, video]);

  // Initialize Bunny.net player when iframe loads
  useEffect(() => {
    if (!video) return;
    
    const videoUrl = video.bunny_embed_url || video.bunny_player_url || video.bunny_video_url;
    if (!videoUrl) {
      console.log('⚠️ No video URL available for player initialization');
      return;
    }

    console.log('🎬 Initializing Bunny.net player for video:', video.id);

    const initPlayer = () => {
      if (!(window as any).playerjs) {
        console.log('⏳ Waiting for Player.js library to load...');
        setTimeout(initPlayer, 100);
        return;
      }

      const iframe = document.getElementById(`bunny-iframe-${video.id}`) as HTMLIFrameElement;
      if (!iframe) {
        console.log('⏳ Waiting for iframe to be created...', `bunny-iframe-${video.id}`);
        setTimeout(initPlayer, 100);
        return;
      }

      console.log('✅ Iframe found, initializing Player.js...');

      try {
        const player = new (window as any).playerjs.Player(iframe);
        bunnyPlayerRef.current = player;
        console.log('✅ Player.js initialized successfully');

        player.on('ready', () => {
          bunnyPlayerRef.current = player;
          console.log('✅ Bunny.net player ready');
          
          // Set up timeout as fallback - if userProgress doesn't load within 3 seconds, play from start
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
          }, 3000);
          
          (player as any)._seekTimeout = timeoutId;
          
          // Check if video is already playing (from autoplay attribute)
          // This ensures the button shows "pause" if autoplay worked
          setTimeout(() => {
            player.getPaused((paused: boolean) => {
              if (!paused && !hasSeekedToSavedPosition.current) {
                // Video is already playing (autoplay worked)
                setIsPlaying(true);
                setVideoStarted(true);
                setShowVideoPlayer(true);
                console.log('▶️ Video is already playing (autoplay detected)');
              }
            });
          }, 500);
          
          player.getCurrentTime((time: number) => {
            setCurrentTime(time);
          });
        });

        player.on('timeupdate', (data: { seconds?: number }) => {
          if (data.seconds !== undefined) {
            setCurrentTime(data.seconds);
            
            if (user && video && video.duration) {
              const timeWatched = data.seconds;
              const videoDuration = video.duration;
              const timeSinceLastSave = Math.floor(timeWatched) - lastSavedProgress.current;
              
              if (timeSinceLastSave >= 5) {
                if (progressSaveTimeout.current) {
                  clearTimeout(progressSaveTimeout.current);
                }
                
                progressSaveTimeout.current = setTimeout(() => {
                  saveProgressToDatabase(timeWatched, videoDuration);
                }, 1000);
              }
            }
          }
        });

        player.on('play', () => {
          setIsPlaying(true);
          if (!videoStarted) {
            setVideoStarted(true);
            setShowVideoPlayer(true);
          }
        });

        player.on('pause', () => {
          setIsPlaying(false);
          
          if (user && video && currentTime > 0 && video.duration) {
            saveProgressToDatabase(currentTime, video.duration);
          }
        });

        player.on('ended', () => {
          setIsPlaying(false);
          setVideoEnded(true);
          setShowVideoPlayer(false);
        });

        player.on('error', (error: any) => {
          if (error && error.fatal === true) {
            setPlaybackError(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
            toast.error(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
          }
        });

        iframe.addEventListener('error', (e) => {
          setPlaybackError(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
        });
      } catch (error) {
        console.error('Error initializing Bunny.net player:', error);
        setPlaybackError(t('video.player_init_error', 'Error al inicializar el reproductor. Por favor, recargue la página.'));
      }
    };

    const timer = setTimeout(initPlayer, 500);

    return () => {
      clearTimeout(timer);
      bunnyPlayerRef.current = null;
    };
  }, [video?.id, video?.bunny_embed_url, video?.bunny_player_url, video?.bunny_video_url, video?.duration, user, saveProgressToDatabase, t, showVideoPlayer]);

  // Seek to saved position when userProgress is loaded and player is ready
  useEffect(() => {
    if (!userProgress || !bunnyPlayerRef.current || !video || hasSeekedToSavedPosition.current) return;
    
    const savedTime = userProgress.time_watched || userProgress.last_position || 0;
    const videoDuration = video.duration || 0;
    const progressPercent = userProgress.progress_percentage || 0;
    
    console.log('📊 UserProgress loaded, attempting seek and play:', {
      savedTime,
      videoDuration,
      progressPercent,
      hasSeeked: hasSeekedToSavedPosition.current,
      currentTime
    });
    
    // Only seek if there's a saved position, video isn't completed, and we haven't already seeked
    // Check if currentTime is very close to 0 (within 2 seconds) to avoid seeking after video has progressed
    if (savedTime > 0 && videoDuration > 0 && savedTime < videoDuration && progressPercent < 90 && currentTime < 2) {
      console.log(`⏩ Seeking Bunny.net player to saved position: ${savedTime} seconds`);
      hasSeekedToSavedPosition.current = true;
      
      // Clear any timeout that might be waiting
      if ((bunnyPlayerRef.current as any)._seekTimeout) {
        clearTimeout((bunnyPlayerRef.current as any)._seekTimeout);
      }
      
      try {
        // Seek to saved position, then auto-play
        try {
          bunnyPlayerRef.current.setCurrentTime(savedTime);
          setCurrentTime(savedTime);
          console.log(`✅ Successfully seeked to ${savedTime} seconds`);
          
          // Small delay to ensure seek completes before playing
          setTimeout(() => {
            try {
              // Always auto-play when resuming from saved position
              bunnyPlayerRef.current.play();
              setIsPlaying(true);
              setVideoStarted(true);
              setShowVideoPlayer(true);
              console.log('▶️ Video resumed from saved position and auto-playing');
            } catch (error) {
              console.error('Error resuming video:', error);
              setIsPlaying(false);
            }
          }, 100);
        } catch (seekError) {
          console.error('Error seeking to saved position:', seekError);
          // Fallback: just play from start
          try {
            bunnyPlayerRef.current.play();
            setIsPlaying(true);
            setVideoStarted(true);
            setShowVideoPlayer(true);
            console.log('▶️ Video playing from start (seek failed)');
          } catch (playError) {
            console.error('Error playing video:', playError);
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error('Error accessing player state:', error);
        // Fallback: just play from start
        try {
          bunnyPlayerRef.current.play();
          setIsPlaying(true);
          setVideoStarted(true);
          setShowVideoPlayer(true);
        } catch (playError) {
          console.error('Error playing video:', playError);
          setIsPlaying(false);
        }
      }
    } else {
      // No saved progress or already completed, just play from start
      if (!hasSeekedToSavedPosition.current) {
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
    }
  }, [userProgress, video, currentTime]);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        // Fetch video details
        const videoResponse = await liveArchiveVideoApi.getPublicById(parseInt(id || '0'));
        
        if (!videoResponse || !videoResponse.success) {
          throw new Error('Failed to fetch video data');
        }
        
        const videoData = videoResponse.data;
        
        if (!videoData) {
          throw new Error('No video data received');
        }
        
        console.log('=== LiveArchiveDetail: Video Data ===');
        console.log('Video ID:', videoData.id);
        console.log('Video Title:', videoData.title);
        console.log('Bunny Embed URL:', videoData.bunny_embed_url);
        console.log('Bunny Thumbnail URL:', videoData.bunny_thumbnail_url);
        console.log('Thumbnail URL:', videoData.thumbnail_url);
        console.log('Full Video Data:', videoData);
        console.log('All Video Keys:', Object.keys(videoData));
        
        // Check if bunny_embed_url exists
        if (!videoData.bunny_embed_url) {
          console.warn('⚠️ WARNING: bunny_embed_url is missing!', {
            hasBunnyEmbedUrl: !!videoData.bunny_embed_url,
            hasBunnyVideoUrl: !!videoData.bunny_video_url,
            hasBunnyPlayerUrl: !!videoData.bunny_player_url,
            allKeys: Object.keys(videoData)
          });
        }
        
        setVideo(videoData);
        
        // Fetch user progress if user is logged in
        if (user && videoData.id) {
          try {
            const progressResponse = await liveArchiveVideoApi.getProgress(videoData.id);
            if (progressResponse.success && progressResponse.data) {
              setUserProgress(progressResponse.data);
              console.log('✅ User progress loaded:', progressResponse.data);
            } else {
              setUserProgress(null);
              console.log('ℹ️ No saved progress found');
            }
          } catch (error) {
            console.error('Failed to fetch user progress:', error);
            setUserProgress(null);
          }
        } else {
          setUserProgress(null);
        }
        
        // Fetch related videos from the same section
        const section = (videoData as any).section;
        if (section) {
          try {
            const relatedResponse = await liveArchiveVideoApi.getPublic({ 
              section: section,
              per_page: 100,
              status: 'published'
            });
            const relatedData = Array.isArray(relatedResponse.data.data) 
              ? relatedResponse.data.data 
              : relatedResponse.data?.data || [];
            // Filter out current video and limit to 4
            const filtered = relatedData.filter((v: LiveArchiveVideo) => v.id !== videoData.id).slice(0, 4);
            setRelatedVideos(filtered);
            console.log('Related videos from section:', filtered.length, 'section:', section);
          } catch (error) {
            console.error('Failed to fetch related videos:', error);
            setRelatedVideos([]);
          }
        } else {
          setRelatedVideos([]);
        }
        
        // Load transcription
        if (videoData.id) {
          loadTranscription(videoData.id, videoData);
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
      hasSeekedToSavedPosition.current = false;
    }
  }, [id, user, t]);

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

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
  };

  // Load transcription
  const loadTranscription = async (videoId: number, videoData?: any) => {
    try {
      const currentLocale = (locale || 'en').substring(0, 2);
      const finalLocale = ['en', 'es', 'pt'].includes(currentLocale) ? currentLocale : 'en';
      
      console.log('🔍 Loading transcription for live archive video:', {
        videoId,
        locale: finalLocale,
        hasVideoData: !!videoData,
      });
      
      let transcriptionText: string | null = null;
      
      // First, try to get transcription from video data
      if (videoData && videoData.transcriptions && typeof videoData.transcriptions === 'object') {
        const transcriptions = videoData.transcriptions;
        
        if (transcriptions[finalLocale]) {
          if (typeof transcriptions[finalLocale] === 'string') {
            transcriptionText = transcriptions[finalLocale].trim();
          } else if (transcriptions[finalLocale]?.text) {
            transcriptionText = String(transcriptions[finalLocale].text).trim();
          }
        } else if (transcriptions.en) {
          if (typeof transcriptions.en === 'string') {
            transcriptionText = transcriptions.en;
          } else if (transcriptions.en?.text) {
            transcriptionText = transcriptions.en.text;
          }
        }
      }
      
      // If not found in video data, try API endpoint
      if (!transcriptionText) {
        console.log('🌐 Transcription not in video data, trying API endpoint...');
        try {
          const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000/api';
          const token = localStorage.getItem('auth_token');
          const headers: HeadersInit = {
            'Accept': 'application/json',
            'Accept-Language': finalLocale,
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(
            `${baseUrl}/live-archive-videos/${videoId}/transcription?locale=${finalLocale}`,
            { headers }
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
      
      if (transcriptionText) {
        if (Array.isArray(transcriptionText)) {
          transcriptionText = transcriptionText.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (item && typeof item === 'object') {
              return item.punctuated_word || item.word || item.text || '';
            }
            return '';
          }).join(' ');
        }
        
        if (typeof transcriptionText !== 'string') {
          transcriptionText = String(transcriptionText || '');
        }
        
        setTranscription(transcriptionText);
        const segments = parseTranscription(transcriptionText, video?.duration || videoData?.duration || 0);
        console.log('📊 Parsed transcription segments:', {
          segmentCount: segments.length,
          duration: video?.duration || videoData?.duration || 0,
        });
        setTranscriptionSegments(segments);
      } else {
        console.warn('❌ No transcription text found, setting empty');
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

  // Parse WebVTT format
  const parseWebVTT = (vtt: string): TranscriptionSegment[] => {
    const segments: TranscriptionSegment[] = [];
    const lines = vtt.split('\n');
    let currentStartTime = '';
    let currentEndTime = '';
    let currentText = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'WEBVTT' || line.startsWith('WEBVTT') || line === '') {
        continue;
      }
      
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        if (currentStartTime && currentText) {
          const startSeconds = vttTimeToSeconds(currentStartTime);
          const endSeconds = vttTimeToSeconds(currentEndTime || currentStartTime);
          segments.push({
            time: formatDisplayTime(startSeconds),
            startTime: startSeconds,
            endTime: endSeconds,
            text: currentText.trim(),
            isActive: false,
          });
        }
        currentStartTime = timeMatch[1];
        currentEndTime = timeMatch[2];
        currentText = '';
      } else if (line && currentStartTime) {
        const cleanLine = line.replace(/<[^>]*>/g, '').trim();
        if (cleanLine) {
          currentText += (currentText ? ' ' : '') + cleanLine;
        }
      }
    }
    
    if (currentStartTime && currentText) {
      const startSeconds = vttTimeToSeconds(currentStartTime);
      const endSeconds = vttTimeToSeconds(currentEndTime || currentStartTime);
      segments.push({
        time: formatDisplayTime(startSeconds),
        startTime: startSeconds,
        endTime: endSeconds,
        text: currentText.trim(),
        isActive: false,
      });
    }
    
    return segments;
  };

  // Parse transcription text into segments
  const parseTranscription = (text: string, duration: number): TranscriptionSegment[] => {
    if (!text || !text.trim()) return [];
    
    if (text.includes('WEBVTT') || text.includes('-->')) {
      return parseWebVTT(text);
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    const segments: TranscriptionSegment[] = [];
    let segmentCurrentTime = 0;
    const estimatedSegmentDuration = duration / Math.max(lines.length, 1);
    
    lines.forEach((line, index) => {
      const timestampMatch = line.match(/(\d{1,2}):(\d{2}):?(\d{2})?/);
      if (timestampMatch) {
        const parts = timestampMatch[0].split(':');
        let seconds = 0;
        if (parts.length === 2) {
          seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
          seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
        segmentCurrentTime = seconds;
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
        if (segments.length === 0) {
          segments.push({
            time: formatDisplayTime(0),
            startTime: 0,
            endTime: estimatedSegmentDuration,
            text: line.trim(),
            isActive: false,
          });
        } else {
          const lastSegment = segments[segments.length - 1];
          if (lastSegment.text.length < 200) {
            lastSegment.text += ' ' + line.trim();
            lastSegment.endTime = Math.min(lastSegment.startTime + estimatedSegmentDuration * (segments.length + 1), duration);
          } else {
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

    setTranscriptionSegments(prevSegments => {
      const updated = prevSegments.map(segment => {
        const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
        return { ...segment, isActive };
      });

      return updated;
    });
  }, [currentTime, transcriptionSegments.length]);

  const handlePlay = () => {
    if (!video) {
      console.error('No video data available');
      return;
    }
    
    if (videoEnded) {
      setVideoEnded(false);
      setShowVideoPlayer(true);
      
      if (video.bunny_embed_url) {
        if (bunnyPlayerRef.current) {
          try {
            bunnyPlayerRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            console.error('Error restarting Bunny.net player:', error);
          }
        }
      }
      return;
    }
    
    if (!videoStarted) {
      setVideoStarted(true);
      setShowVideoPlayer(true);
      
      if (video.bunny_embed_url) {
        if (bunnyPlayerRef.current) {
          try {
            bunnyPlayerRef.current.getPaused((paused: boolean) => {
              if (paused) {
                bunnyPlayerRef.current.play();
                setIsPlaying(true);
              }
            });
          } catch (error) {
            console.error('Error starting Bunny.net player:', error);
          }
        }
      }
      return;
    }
    
    if (video.bunny_embed_url) {
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
          setIsPlaying(!isPlaying);
        }
      }
    }
  };

  const handleDownloadMaterials = async () => {
    toast.info(t('video.download_not_available', 'Download not available for live archive videos'));
  };

  const handleTranscription = () => {
    if (activeTab === 'transcription') {
      setActiveTab(null);
    } else {
      setActiveTab('transcription');
      if (!transcription && video) {
        loadTranscription(video.id, video);
      }
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background-light dark:bg-background-dark pt-24 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-96">
            <p className="text-text-muted-light dark:text-text-muted-dark">{t('video.loading', 'Loading...')}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="min-h-screen bg-background-light dark:bg-background-dark pt-24 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-96">
            <p className="text-text-muted-light dark:text-text-muted-dark">{t('video.not_found', 'Video not found')}</p>
          </div>
        </div>
      </main>
    );
  }

  const thumbnailUrl = getImageUrl(video.bunny_thumbnail_url || video.thumbnail_url || '');
  // Try multiple URL fields in order of preference - check for non-empty strings
  const bunnyEmbedUrl = video.bunny_embed_url && String(video.bunny_embed_url).trim() ? video.bunny_embed_url : null;
  const bunnyPlayerUrl = video.bunny_player_url && String(video.bunny_player_url).trim() ? video.bunny_player_url : null;
  const bunnyVideoUrl = video.bunny_video_url && String(video.bunny_video_url).trim() ? video.bunny_video_url : null;
  const videoUrl = bunnyEmbedUrl || bunnyPlayerUrl || bunnyVideoUrl;
  const videoDuration = video.duration || 0;
  const progressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  console.log('🎬 LiveArchiveDetail Render:', {
    hasVideo: !!video,
    hasThumbnail: !!thumbnailUrl,
    hasVideoUrl: !!videoUrl,
    showVideoPlayer,
    videoStarted,
    bunnyEmbedUrl: bunnyEmbedUrl,
    bunnyEmbedUrlRaw: video?.bunny_embed_url,
    bunnyEmbedUrlType: typeof video?.bunny_embed_url,
    bunnyEmbedUrlLength: video?.bunny_embed_url?.length,
    bunnyPlayerUrl: bunnyPlayerUrl,
    bunnyVideoUrl: bunnyVideoUrl,
    videoUrl: videoUrl
  });

  return (
    <main className="min-h-screen bg-black dark:bg-black pt-24 pb-16">
      {/* Video Player Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
          {(showVideoPlayer || videoUrl) ? (
            <>
              {videoUrl ? (
                <div className="w-full h-full relative bg-black">
                  {playbackError && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
                      <div className="text-center text-white px-4">
                        <p className="text-lg font-semibold mb-2">{playbackError}</p>
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
                  <iframe
                    key={`bunny-video-${video.id}-${locale.substring(0, 2)}-${showVideoPlayer}`}
                    id={`bunny-iframe-${video.id}`}
                    src={(() => {
                      // Use the videoUrl that was already determined (checks all fields)
                      const embedUrl = videoUrl || '';
                      
                      if (!embedUrl || !embedUrl.trim()) {
                        console.error('❌ No video URL found in video data', {
                          bunnyEmbedUrl: video.bunny_embed_url,
                          bunnyPlayerUrl: video.bunny_player_url,
                          bunnyVideoUrl: video.bunny_video_url,
                          videoUrl: videoUrl
                        });
                        return '';
                      }
                      
                      // Convert /play/ URLs to /embed/ URLs
                      let finalUrl = String(embedUrl).trim();
                      if (finalUrl.includes('/play/')) {
                        // Extract library ID and video ID from /play/ URL
                        const playMatch = finalUrl.match(/\/play\/(\d+)\/([^/?]+)/);
                        if (playMatch) {
                          const libraryId = playMatch[1];
                          const videoId = playMatch[2];
                          // Convert to /embed/ URL
                          finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
                          console.log('✅ Converted /play/ to /embed/ URL:', finalUrl);
                        }
                      }
                      
                      // Enable autoplay - video should start playing automatically
                      const separator = finalUrl.includes('?') ? '&' : '?';
                      finalUrl = `${finalUrl}${separator}autoplay=true&responsive=true&controls=true`;
                      
                      console.log('🎥 Final iframe URL:', finalUrl);
                      return finalUrl;
                    })()}
                    className="border-0 absolute top-0 left-0"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      zIndex: 1
                    }}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                    title={video.title}
                    onLoad={() => {
                      // console.log('✅ Bunny.net iframe loaded successfully');
                    }}
                    onError={(e) => {
                      console.error('❌ Bunny.net iframe failed to load:', e);
                      setPlaybackError(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
                      toast.error(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
                    }}
                  />
                </div>
              ) : null}
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
                <>
                  {videoUrl ? (
                    // If video URL exists but player isn't showing, show thumbnail or placeholder
                    thumbnailUrl ? (
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
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <div className="text-center text-white px-4">
                          <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg mx-auto mb-4">
                            <Play className="h-8 w-8 text-white ml-1" />
                          </div>
                          <p className="text-white mb-2 text-lg">Click "REPRODUCIR" to play the video</p>
                          <p className="text-xs text-gray-400">
                            Video URL is available. Click the play button above to start playback.
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    // No video URL at all
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <div className="text-center text-white px-4">
                        <p className="text-white mb-2 text-lg">{t('video.video_file_not_available', 'Archivo de video no disponible')}</p>
                        <p className="text-xs text-gray-400">
                          {t('video.no_video_url_found', 'No video URL found. Check bunny_embed_url, bunny_player_url, or bunny_video_url fields.')}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Available fields: bunny_embed_url={bunnyEmbedUrl ? '✓' : '✗'}, bunny_player_url={bunnyPlayerUrl ? '✓' : '✗'}, bunny_video_url={bunnyVideoUrl ? '✓' : '✗'}
                        </p>
                        <p className="text-xs text-gray-600 mt-2 font-mono break-all">
                          bunny_embed_url value: {video?.bunny_embed_url || '(empty)'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          
          {/* Progress Bar */}
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
                bunnyEmbedUrl: video?.bunny_embed_url
              });
              if (!showVideoPlayer) {
                console.log('✅ Setting showVideoPlayer to true');
                setShowVideoPlayer(true);
                setVideoStarted(true);
              }
              // Small delay to ensure state updates before calling handlePlay
              setTimeout(() => {
                handlePlay();
              }, 100);
            }}
            className="flex items-center gap-3 px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold tracking-wide rounded transition-all shadow-lg hover:shadow-primary/30 w-full md:w-auto justify-center md:justify-start uppercase text-sm"
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

      {/* Video Info Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-text-main-light dark:text-white leading-tight">
              {video.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide">
              <span>{getYear(video.published_at || video.created_at)}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span>{formatDuration(video.duration || 0)}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-text-main-light dark:text-gray-300 font-light">
                {video.description || ''}
              </p>
            </div>
            {/* Transcription Content */}
            {activeTab === 'transcription' && (
                <div data-transcription-section className="py-6 space-y-6 max-w-3xl">
                  {transcriptionSegments.length > 0 ? (
                    transcriptionSegments.map((segment, index) => (
                      <div
                        id={`transcript-segment-${index}`}
                        key={index}
                        onClick={() => {
                          if (video && video.bunny_embed_url) {
                            if (bunnyPlayerRef.current) {
                              try {
                                bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                                setCurrentTime(segment.startTime);
                              } catch (error) {
                                console.error('Error seeking to segment:', error);
                              }
                            }
                          }
                        }}
                        className={`group flex gap-6 transition-all duration-200 ${
                          segment.isActive
                            ? 'relative opacity-100'
                            : 'opacity-60 hover:opacity-90 cursor-pointer'
                        }`}
                      >
                        {segment.isActive && (
                          <div className="absolute -left-12 top-0 bottom-0 w-1 bg-[#A05245] rounded-r transition-all"></div>
                        )}
                        <span className={`font-mono text-xs pt-1 min-w-[3rem] transition-colors ${
                          segment.isActive ? 'text-[#A05245] font-bold' : 'text-gray-500'
                        }`}>
                          {segment.time}
                        </span>
                        <p className={`leading-relaxed transition-all ${
                          segment.isActive
                            ? 'text-lg text-white font-semibold'
                            : 'text-base text-gray-300 font-normal'
                        }`}>
                          {segment.text}
                        </p>
                      </div>
                    ))
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 border-l border-border-light dark:border-border-dark pl-0 lg:pl-12 pt-6 lg:pt-2">
            <h3 className="text-sm font-bold text-text-muted-dark uppercase tracking-widest mb-6">
              {t('video.participants', 'Intervienen')}
            </h3>
            <ul className="space-y-4 text-text-muted-light dark:text-text-muted-dark text-sm leading-relaxed">
              <li className="group">
                <span className="block text-text-main-light dark:text-white font-bold text-base group-hover:text-primary transition-colors">
                  Ana Rey
                </span>
                <span className="text-xs uppercase tracking-wide opacity-80">
                  {t('video.master_sculptor', 'Maestro tallista Invitado')}
                </span>
              </li>
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
              const relatedThumbnail = getImageUrl(relatedVideo.bunny_thumbnail_url || relatedVideo.thumbnail_url || '');
              const isNew = relatedVideo.created_at && new Date(relatedVideo.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              
              return (
                <div
                  key={relatedVideo.id}
                  className="group cursor-pointer"
                  onClick={() => {
                    navigateWithLocale(`/live-archive/${relatedVideo.id}`);
                  }}
                >
                  <div className="relative aspect-video rounded-md overflow-hidden mb-3 border border-transparent group-hover:border-primary/50 transition-all">
                    {relatedThumbnail ? (
                      <img
                        alt={relatedVideo.title}
                        src={relatedThumbnail}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5"></div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-primary/90 rounded-full p-2 backdrop-blur-sm">
                        <i className="fa-solid fa-play text-white text-xl"></i>
                      </div>
                    </div>
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
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default LiveArchiveDetail;
