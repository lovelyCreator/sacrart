import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rewindApi, Rewind, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, MoreVertical, RotateCcw, Plus, ThumbsUp, ThumbsDown, ListOrdered, Lock, Subtitles } from 'lucide-react';
import { toast } from 'sonner';
import { MultiLanguageAudioPlayer } from '@/components/MultiLanguageAudioPlayer';
import Hls from 'hls.js';

// Transcription segment interface
interface TranscriptionSegment {
  time: string; // Display time (e.g., "00:05")
  startTime: number; // Start time in seconds
  endTime: number; // End time in seconds
  text: string;
  isActive?: boolean;
}

const RewindEpisodes = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const [rewind, setRewind] = useState<Rewind | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodios' | 'transcripcion'>('episodios');
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [captionOverlayEnabled, setCaptionOverlayEnabled] = useState<boolean>(true);
  const [activeCaptionText, setActiveCaptionText] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const bunnyPlayerRef = useRef<any>(null);
  const transcriptionScrollRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling transcription

  // Helper function to construct HLS URL from video data
  const getHlsUrl = (videoData: any): string | null => {
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
  };

  // Initialize HLS.js player
  useEffect(() => {
    if (!currentVideo) return;
    
    const hlsUrl = getHlsUrl(currentVideo);
    if (!hlsUrl) {
      console.log('❌ HLS Init: No HLS URL available');
      return;
    }

    console.log('🔗 Using HLS URL:', hlsUrl);

    const initHls = () => {
      if (!videoRef.current) {
        setTimeout(initHls, 100);
        return;
      }

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

        // Function to switch audio track based on locale
        const switchAudioToLocale = () => {
          const currentLocale = (locale || 'en').substring(0, 2).toLowerCase();
          console.log('🔊 Rewind audio tracks available:', hls.audioTracks);
          
          if (!hls.audioTracks || hls.audioTracks.length === 0) return;

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
            console.log(`🔊 Switching audio track to index ${trackIndex} for locale "${currentLocale}"`);
            hls.audioTrack = trackIndex;
          }
        };

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ Rewind HLS manifest parsed');
          switchAudioToLocale();
          // Autoplay
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => switchAudioToLocale());

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event: any, data: any) => {
          const track = hls.audioTracks[data.id];
          console.log(`🔊 Audio track switched to: ${track?.name || 'Track ' + data.id} (${track?.lang || 'unknown'})`);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
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

    setTimeout(initHls, 100);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id]);

  // Effect to switch audio track when locale changes
  useEffect(() => {
    if (!hlsRef.current || !hlsRef.current.audioTracks || hlsRef.current.audioTracks.length === 0) return;

    const currentLocale = (locale || 'en').substring(0, 2).toLowerCase();
    const trackIndex = hlsRef.current.audioTracks.findIndex((track: any) => {
      const trackLang = (track.lang || '').toLowerCase();
      const trackName = (track.name || '').toLowerCase();
      return trackLang === currentLocale || 
             trackLang.startsWith(currentLocale) ||
             trackName.includes(currentLocale) ||
             (currentLocale === 'es' && (trackLang === 'spa' || trackName.includes('spanish') || trackName.includes('español'))) ||
             (currentLocale === 'en' && (trackLang === 'eng' || trackName.includes('english') || trackName.includes('inglés'))) ||
             (currentLocale === 'pt' && (trackLang === 'por' || trackName.includes('portuguese') || trackName.includes('portugués')));
    });

    if (trackIndex !== -1 && trackIndex !== hlsRef.current.audioTrack) {
      hlsRef.current.audioTrack = trackIndex;
    }
  }, [locale]);

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

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Helper to get translated value for rewinds
  const getTranslatedValue = (rewind: Rewind, field: 'title' | 'description' | 'short_description'): string => {
    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
    if (rewind.translations && rewind.translations[field]) {
      return rewind.translations[field][currentLocale as 'en' | 'es' | 'pt'] || 
             rewind.translations[field].en || 
             (rewind as any)[field] || '';
    }
    return (rewind as any)[`${field}_${currentLocale}`] || (rewind as any)[field] || '';
  };

  // Load rewind and videos from API
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch rewind from API
        const response = await rewindApi.getPublicById(parseInt(id));
        
        if (response.success && response.data) {
          const rewindData = response.data;
          setRewind(rewindData);
          
          // Videos are included in the rewind relationship
          if (rewindData.videos && Array.isArray(rewindData.videos)) {
            // Filter only published videos and sort by sort_order or episode_number
            const publishedVideos = rewindData.videos.filter((v: Video) => v.status === 'published');
            const sortedVideos = [...publishedVideos].sort((a, b) => {
              if (a.sort_order !== undefined && b.sort_order !== undefined) {
                return a.sort_order - b.sort_order;
              }
              if (a.episode_number !== undefined && b.episode_number !== undefined) {
                return a.episode_number - b.episode_number;
              }
              return 0;
            });
            setVideos(sortedVideos);
            if (sortedVideos.length > 0) {
              setCurrentVideo(sortedVideos[0]);
              setCurrentVideoIndex(0);
              // Load transcription for first video
              loadTranscription(sortedVideos[0]);
            }
          } else {
            setVideos([]);
          }
        } else {
          toast.error(t('rewind.series_not_found', 'Series not found'));
          setRewind(null);
          setVideos([]);
        }
      } catch (error: any) {
        console.error('Error loading rewind:', error);
        toast.error(error.message || t('rewind.error_load', 'Error loading series'));
        setRewind(null);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, t, i18n.language, locale]);

  // Reload transcription when language or current video changes
  useEffect(() => {
    if (currentVideo && currentVideo.id) {
      loadTranscription(currentVideo);
    }
  }, [i18n.language, locale, currentVideo?.id]);

  // Initialize Bunny.net player and track currentTime
  useEffect(() => {
    if (!currentVideo || !(currentVideo.bunny_embed_url || currentVideo.bunny_player_url)) {
      return;
    }

    const iframe = document.getElementById(`bunny-iframe-${currentVideo.id}`) as HTMLIFrameElement;
    if (!iframe) return;

    const initPlayer = () => {
      if (!(window as any).playerjs) {
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        const player = new (window as any).playerjs.Player(iframe);
        bunnyPlayerRef.current = player;

        player.on('ready', () => {
          // Get current time periodically
          const interval = setInterval(() => {
            try {
              player.getCurrentTime((time: number) => {
                if (time !== undefined) {
                  setCurrentTime(time);
                }
              });
            } catch (error) {
              // Ignore errors
            }
          }, 1000); // Update every second

          // Store interval for cleanup
          (player as any)._timeInterval = interval;
        });

        player.on('timeupdate', (data: { seconds?: number }) => {
          if (data.seconds !== undefined) {
            setCurrentTime(data.seconds);
          }
        });
      } catch (error) {
        console.error('Error initializing Bunny.net player:', error);
      }
    };

    const timer = setTimeout(initPlayer, 500);

    return () => {
      clearTimeout(timer);
      if (bunnyPlayerRef.current && (bunnyPlayerRef.current as any)._timeInterval) {
        clearInterval((bunnyPlayerRef.current as any)._timeInterval);
      }
      bunnyPlayerRef.current = null;
    };
  }, [currentVideo?.id, currentVideo?.bunny_embed_url, currentVideo?.bunny_player_url]);

  // Update active transcription segment based on current playback time
  useEffect(() => {
    if (transcription.length === 0 || currentTime === undefined) return;

    // Find the active segment index first (synchronously)
    const activeIndex = transcription.findIndex(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );

    // Update the active caption text for overlay
    if (activeIndex >= 0) {
      setActiveCaptionText(transcription[activeIndex].text);
    } else {
      setActiveCaptionText('');
    }

    // Update the active state
    setTranscription(prevSegments => {
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
  }, [currentTime, transcription.length]);

  // Load transcription from video data or API (like EpisodeDetail)
  const loadTranscription = async (video: Video) => {
    if (!video.id) return;
    
    try {
      const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
      const finalLocale = ['en', 'es', 'pt'].includes(currentLocale) ? currentLocale : 'en';
      
      console.log('🔍 Loading transcription for video:', {
        videoId: video.id,
        locale: finalLocale,
        hasVideoData: !!video,
      });
      
      let transcriptionText: string | null = null;
      
      // First, try to get transcription from video data (if available)
      if (video && video.transcriptions && typeof video.transcriptions === 'object') {
        const transcriptions = video.transcriptions;
        console.log('📝 Transcriptions object:', transcriptions);
        console.log('📝 Available languages:', Object.keys(transcriptions));
        
        if (transcriptions[finalLocale]) {
          console.log(`✅ Found transcription for locale "${finalLocale}":`, transcriptions[finalLocale]);
          if (typeof transcriptions[finalLocale] === 'string') {
            const text = transcriptions[finalLocale].trim();
            if (text) {
              transcriptionText = text;
              console.log('📄 Transcription is string, length:', transcriptionText.length);
            }
          } else if (transcriptions[finalLocale]?.text) {
            const text = String(transcriptions[finalLocale].text).trim();
            if (text) {
              transcriptionText = text;
              console.log('📄 Transcription from .text field, length:', transcriptionText.length);
            }
          }
        } else if (transcriptions.en) {
          // Fallback to English
          console.log('🔄 Falling back to English transcription:', transcriptions.en);
          if (typeof transcriptions.en === 'string') {
            transcriptionText = transcriptions.en;
          } else if (transcriptions.en?.text) {
            transcriptionText = transcriptions.en.text;
          }
        }
      } else if (video) {
        // Try old transcription fields
        switch (finalLocale) {
          case 'es':
            transcriptionText = (video as any).transcription_es || (video as any).transcription || null;
            break;
          case 'pt':
            transcriptionText = (video as any).transcription_pt || (video as any).transcription || null;
            break;
          default:
            transcriptionText = (video as any).transcription_en || (video as any).transcription || null;
            break;
        }
        if (transcriptionText) {
          console.log('📄 Found transcription in old fields, length:', transcriptionText.length);
        }
      }
      
      // If not found in video data, try API endpoint
      if (!transcriptionText) {
        console.log('🌐 Transcription not in video data, trying API endpoint...');
        try {
          const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000/api';
          const response = await fetch(
            `${baseUrl}/videos/${video.id}/transcription?locale=${finalLocale}`,
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
      
      if (transcriptionText) {
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
        setTranscriptionText(transcriptionText);
        
        // Parse transcription text into segments
        const segments = parseTranscription(transcriptionText, video.duration || 0);
        console.log('📊 Parsed transcription segments:', {
          segmentCount: segments.length,
          duration: video.duration || 0,
          firstSegment: segments[0],
        });
        setTranscription(segments);
      } else {
        console.warn('❌ No transcription text found, setting empty');
        setTranscription([]);
        setTranscriptionText(null);
      }
    } catch (error) {
      console.error('❌ Error loading transcription:', error);
      setTranscription([]);
      setTranscriptionText(null);
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
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) continue;
      
      // Check for timestamp line (format: 00:00:00.000 --> 00:00:05.000)
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        // Save previous segment if exists
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
      } else if (currentStartTime && line) {
        // Add text to current segment (remove HTML tags if any)
        const cleanLine = line.replace(/<[^>]*>/g, '').trim();
        if (cleanLine) {
          currentText += (currentText ? ' ' : '') + cleanLine;
        }
      }
    }
    
    // Add last segment
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

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video: Video, index: number) => {
    setCurrentVideo(video);
    setCurrentVideoIndex(index);
    setIsPlaying(true);
    // Load transcription for the selected video
    loadTranscription(video);
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      handleVideoClick(videos[nextIndex], nextIndex);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1;
      handleVideoClick(videos[prevIndex], prevIndex);
    }
  };

  const getYear = () => {
    if (rewind?.year) return rewind.year.toString();
    if (rewind?.published_at) {
      return new Date(rewind.published_at).getFullYear().toString();
    }
    return new Date().getFullYear().toString();
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

  if (!rewind || !currentVideo) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{t('rewind.series_not_found', 'Series not found')}</p>
          <button
            onClick={() => navigateWithLocale('/rewind')}
            className="px-6 py-2 bg-[#A05245] text-white rounded-full hover:bg-[#b56053] transition-colors"
          >
            {t('rewind.back_to_rewind', 'Back to Rewind')}
          </button>
        </div>
      </main>
    );
  }

  const thumbnailUrl = getImageUrl(
    currentVideo.thumbnail_url || 
    currentVideo.intro_image_url || 
    currentVideo.bunny_thumbnail_url || 
    rewind.cover_image || 
    rewind.thumbnail || 
    rewind.image_url ||
    ''
  );

  return (
    <main className="flex-grow w-full relative min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0A0A0A] z-10"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#A05245]/10 rounded-full blur-[150px] z-0 opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#C5A065]/5 rounded-full blur-[150px] z-0 opacity-40"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1588693895311-574d6c44243b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center blur-3xl opacity-10 z-0"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto p-6 lg:p-12 lg:pt-16 flex flex-col lg:flex-row gap-16 items-start justify-center">
        {/* Video Player Section */}
        <div className="w-full lg:w-[450px] flex-shrink-0 mx-auto sticky top-24">
          <div className="relative aspect-[9/16] bg-stone-900 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] border border-white/10 group ring-1 ring-white/5">
            {currentVideo && (currentVideo.bunny_embed_url || currentVideo.bunny_player_url || currentVideo.bunny_hls_url || currentVideo.bunny_video_id) ? (
              <>
                {/* CC Toggle Button - Top Position */}
                {transcription.length > 0 && (
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
                  key={`hls-video-${currentVideo.id}`}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                  }}
                />
                {/* Caption Overlay */}
                {captionOverlayEnabled && activeCaptionText && (
                  <div 
                    className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-[90%] px-4 py-2 bg-black/80 text-white text-center rounded pointer-events-none z-10 transition-opacity duration-200"
                    style={{ fontSize: '16px', lineHeight: '1.4' }}
                  >
                    {activeCaptionText}
                  </div>
                )}
              </>
            ) : thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={currentVideo.title || ''}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black"></div>
            )}
            
            {/* Next Video Button - Only show if not using Bunny.net player */}
            {!(currentVideo && (currentVideo.bunny_embed_url || currentVideo.bunny_player_url)) && (
              <div className="absolute bottom-6 right-6 z-30">
                <button
                  onClick={handleNextVideo}
                  disabled={currentVideoIndex >= videos.length - 1}
                  className="group/btn relative overflow-hidden bg-white text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#A05245] hover:text-white transition-all shadow-lg flex items-center gap-2 transform translate-y-0 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {t('rewind.next', 'Next')} <span className="hidden group-hover/btn:inline">{t('rewind.episode', 'Episode')}</span>
                  </span>
                  <SkipForward className="h-4 w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* Multi-Language Audio Player - Only for TTS audio (not original) */}
          {/* TODO: Enable audio dubbing feature later */}
          {false && currentVideo && currentVideo.audio_urls && Object.keys(currentVideo.audio_urls).length > 0 && (() => {
            // Filter out 'original' audio (source language uses video's original audio)
            const ttsAudioTracks = Object.entries(currentVideo.audio_urls)
              .filter(([lang, url]) => url !== 'original')
              .map(([lang, url]) => ({
                language: lang,
                url: url as string,
                label: lang === 'en' ? t('common.language_en', 'English') : lang === 'es' ? t('common.language_es', 'Español') : t('common.language_pt', 'Português')
              }));
            
            if (ttsAudioTracks.length === 0) return null;
            
            return (
              <div className="mt-6" key={`audio-player-${currentVideo.id}-${i18n.language.substring(0, 2)}`}>
                <MultiLanguageAudioPlayer
                  audioTracks={ttsAudioTracks}
                  defaultLanguage={i18n.language.substring(0, 2) as 'en' | 'es' | 'pt'}
                  videoRef={null}
                />
              </div>
            );
          })()}
        </div>

        {/* Content Section */}
        <div className="flex-1 w-full lg:max-w-3xl pt-2 lg:pt-0">
        <div className="mb-10 border-b border-white/10 pb-8 relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A05245] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A05245]"></span>
            </span>
            <span className="text-[#A05245] text-xs font-bold tracking-[0.2em] uppercase">
              {t('rewind.watching_now', 'Watching Now')}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 leading-tight">
            {getTranslatedValue(rewind, 'title')}
          </h1>
          <h2 className="text-xl text-gray-200 font-serif mb-5 font-medium tracking-wide">
            {t('rewind.chapter', 'Chapter')} {currentVideo?.episode_number-1 || currentVideoIndex + 1} {t('rewind.of', 'of')} {videos.length} • <span className="text-[#A05245]">{currentVideo?.title || t('rewind.episode', 'Episode')}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400 font-medium mb-6 tracking-wide">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/5">4K HDR</span>
              <span className="bg-[#A05245]/20 text-[#A05245] px-2 py-0.5 rounded text-[10px] font-bold border border-[#A05245]/20">T +7</span>
            </div>
            <span>{getYear()}</span>
            <span className="text-white/20">•</span>
            <span className="text-white">{getTranslatedValue(rewind, 'title') || t('rewind.documentary', 'Documentary')}</span>
          </div>
          <p className="text-gray-300 text-base lg:text-lg leading-relaxed font-light font-sans max-w-2xl mb-8">
            {currentVideo.description || currentVideo.short_description || getTranslatedValue(rewind, 'description') || ''}
          </p>
          <div className="flex gap-6">
            <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white group-hover:bg-white/5 transition-all">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('rewind.my_list', 'My List')}</span>
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.like', 'Like')}>
              <ThumbsUp className="h-5 w-5 text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group transition-all hover:bg-white/5 hover:border-[#A05245] focus:border-[#A05245] outline-none" title={t('rewind.dislike', 'Dislike')}>
              <ThumbsDown className="h-5 w-5 text-white group-hover:text-[#A05245] group-focus:text-[#A05245] transition-colors" />
            </button>
          </div>
        </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-white/10 flex items-center gap-8">
            <button
              onClick={() => setActiveTab('episodios')}
              className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                activeTab === 'episodios'
                  ? 'text-white border-b-2 border-[#A05245]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('rewind.episodes_list', 'Episodes List')}
            </button>
            <button
              onClick={() => setActiveTab('transcripcion')}
              className={`pb-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                activeTab === 'transcripcion'
                  ? 'text-white border-b-2 border-[#A05245]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('rewind.transcription', 'Transcription')}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto relative">
            {activeTab === 'transcripcion' ? (
              <div className="py-6 max-w-4xl">
                {/* TED Talks style transcription with clickable timestamps */}
                {transcription.length > 0 ? (
                  <div 
                    ref={transcriptionScrollRef}
                    className="max-h-[500px] overflow-y-auto pr-4 scroll-smooth"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#A05245 #2a2a2a'
                    }}
                  >
                    <div className="space-y-4">
                    {transcription.map((segment, index) => (
                      <div
                        id={`transcript-segment-${index}`}
                        key={index}
                        onClick={() => {
                          // Seek to this segment's start time
                          if (currentVideo && (currentVideo.bunny_embed_url || currentVideo.bunny_player_url)) {
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
                            if (currentVideo && (currentVideo.bunny_embed_url || currentVideo.bunny_player_url)) {
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
                ) : transcriptionText ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <pre className="text-base leading-relaxed text-gray-300 font-light whitespace-pre-wrap">
                      {transcriptionText}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-base">{t('rewind.no_transcription', 'No transcription available for this video')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-white tracking-widest flex items-center gap-3">
                    <ListOrdered className="h-5 w-5 text-[#A05245]" />
                    {t('rewind.episodes_list', 'Episodes List')}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                    {videos.length} {t('rewind.chapters', 'Chapters')}
                  </span>
                </div>
                <div className="flex flex-col border-t border-white/5">
                  {videos.map((video, index) => {
                    const isActive = index === currentVideoIndex;
                    const isLocked = video.status !== 'published';
                    
                    return (
                      <div
                        key={video.id}
                        onClick={() => !isLocked && handleVideoClick(video, index)}
                        className={`group flex justify-between items-center py-4 border-b ${
                          isActive ? 'border-white/10 text-[#A05245]' : 'border-white/5 text-gray-300 hover:text-white'
                        } cursor-pointer hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className={`flex items-center gap-4 ${isActive ? 'font-semibold' : 'font-medium'} text-lg font-display`}>
                          {isActive ? (
                            <Play className="h-5 w-5 animate-pulse fill-current" />
                          ) : (
                            <span className="w-6 text-center text-sm font-sans text-gray-500 group-hover:text-[#A05245] transition-colors">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          )}
                          <span className={isActive ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}>
                            {isActive ? `${String(index + 1).padStart(2, '0')}. ${video.title || `${t('rewind.episode', 'Episode')} ${index + 1}`}` : video.title || `${t('rewind.episode', 'Episode')} ${index + 1}`}
                          </span>
                          {isLocked && (
                            <span className="text-xs uppercase tracking-wider font-sans border border-gray-700 rounded px-1.5 py-0.5">
                              {t('rewind.coming_soon', 'Coming Soon')}
                            </span>
                          )}
                        </div>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-gray-600" />
                        ) : (
                          <span className={`font-mono text-sm ${isActive ? 'opacity-100 font-medium' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="sticky bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RewindEpisodes;
