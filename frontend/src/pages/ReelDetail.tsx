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
  time: string; // Display time (e.g., "00:05")
  startTime: number; // Start time in seconds
  endTime: number; // End time in seconds
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

  // Transcription data
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);

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
            console.log('📦 Reel data loaded:', response.data);
            console.log('📦 Reel transcriptions field:', response.data.transcriptions);
            console.log('📦 Reel transcriptions type:', typeof response.data.transcriptions);
            console.log('📦 Reel transcriptions value (full):', JSON.stringify(response.data.transcriptions, null, 2));
            console.log('📦 Category reels:', response.data.category_reels);
            setReel(response.data);
            // Extract transcription from reel data or API
            await loadTranscriptionFromReel(response.data);
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

  // Load transcription from reel data or API
  const loadTranscriptionFromReel = async (reelData: Reel) => {
    console.log('🔍 Loading transcription for reel:', {
      reelId: reelData.id,
      reelTitle: reelData.title,
      hasTranscriptions: !!reelData.transcriptions,
      transcriptionsType: typeof reelData.transcriptions,
      transcriptionsValue: reelData.transcriptions,
    });

    try {
      // Get locale from i18n, ensuring it's one of the supported languages
      const i18nLang = i18n.language || locale || 'en';
      const currentLocale = i18nLang.substring(0, 2).toLowerCase();
      // Ensure locale is one of: en, es, pt
      const supportedLocales = ['en', 'es', 'pt'];
      const finalLocale = supportedLocales.includes(currentLocale) ? currentLocale : 'en';
      console.log('🌐 Current locale:', {
        i18nLanguage: i18n.language,
        locale: locale,
        extracted: currentLocale,
        final: finalLocale,
      });
      let transcriptionText: string | null = null;

      // First, try to get transcription from reel data (if available)
      if (reelData.transcriptions && typeof reelData.transcriptions === 'object') {
        const transcriptions = reelData.transcriptions as any;
        console.log('📝 Transcriptions object:', transcriptions);
        console.log('📝 Available languages:', Object.keys(transcriptions));
        
        if (transcriptions[finalLocale]) {
          console.log(`✅ Found transcription for locale "${finalLocale}":`, transcriptions[finalLocale]);
          if (typeof transcriptions[finalLocale] === 'string') {
            const text = transcriptions[finalLocale].trim();
            if (text) {
              transcriptionText = text;
              console.log('📄 Transcription is string, length:', transcriptionText.length);
            } else {
              console.warn('⚠️ Transcription for locale is empty string');
            }
          } else if (transcriptions[finalLocale]?.text) {
            const text = String(transcriptions[finalLocale].text).trim();
            if (text) {
              transcriptionText = text;
              console.log('📄 Transcription from .text field, length:', transcriptionText.length);
            } else {
              console.warn('⚠️ Transcription .text field is empty or whitespace');
            }
          } else if (transcriptions[finalLocale]?.error) {
            console.warn('⚠️ Transcription for locale has error:', transcriptions[finalLocale].error);
          } else {
            console.warn('⚠️ Transcription for locale exists but is not string or has no .text field:', transcriptions[finalLocale]);
          }
        } else if (transcriptions.en) {
          // Fallback to English
          console.log('🔄 Falling back to English transcription:', transcriptions.en);
          if (typeof transcriptions.en === 'string') {
            transcriptionText = transcriptions.en;
            console.log('📄 English transcription is string, length:', transcriptionText.length);
          } else if (transcriptions.en?.text) {
            transcriptionText = transcriptions.en.text;
            console.log('📄 English transcription from .text field, length:', transcriptionText.length);
          } else {
            console.warn('⚠️ English transcription exists but is not string or has no .text field:', transcriptions.en);
          }
        } else {
          console.warn('⚠️ No transcription found for current locale or English');
        }
      } else {
        console.log('❌ No transcriptions object in reel data');
      }

      // If not found in reel data, try API endpoint
      if (!transcriptionText && reelData.id) {
        console.log('🌐 Transcription not in reel data, trying API endpoint...');
        try {
          const response = await reelApi.getTranscription(reelData.id, finalLocale);
          console.log('📡 API Response:', response);
          if (response.success && response.transcription) {
            transcriptionText = response.transcription;
            console.log('✅ Got transcription from API, length:', transcriptionText.length);
          } else {
            console.warn('⚠️ API response unsuccessful or no transcription:', response);
          }
        } catch (apiError) {
          console.error('❌ Transcription API error:', apiError);
        }
      }

      if (transcriptionText) {
        const isArray = Array.isArray(transcriptionText);
        const isString = typeof transcriptionText === 'string';
        
        console.log('📝 Processing transcription text:', {
          type: typeof transcriptionText,
          isArray: isArray,
          length: isString 
            ? transcriptionText.length 
            : (isArray 
              ? (transcriptionText as unknown as any[]).length 
              : 0),
          preview: isString 
            ? transcriptionText.substring(0, 100) 
            : (isArray 
              ? JSON.stringify((transcriptionText as unknown as any[]).slice(0, 5)) 
              : 'N/A'),
        });

        // Handle if transcription is an array of words instead of string
        if (isArray) {
          const transcriptionArray = transcriptionText as unknown as any[];
          console.log('🔄 Converting array to string, array length:', transcriptionArray.length);
          transcriptionText = transcriptionArray.map(item => {
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

        // Parse transcription text into segments
        const segments = parseTranscription(transcriptionText, reelData.duration || 0);
        console.log('📊 Parsed transcription segments:', {
          segmentCount: segments.length,
          duration: reelData.duration,
          firstSegment: segments[0],
        });
        setTranscription(segments);
      } else {
        console.warn('❌ No transcription text found, setting empty array');
        setTranscription([]);
      }
    } catch (error) {
      console.error('❌ Error loading transcription from reel:', error);
      setTranscription([]);
    }
  };

  // Parse transcription text into segments
  const parseTranscription = (text: string, duration: number): TranscriptionSegment[] => {
    if (!text || !text.trim()) return [];
    
    // Try to parse as WebVTT format
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
          segments.push({
            time: formatDisplayTime(startSeconds),
            startTime: startSeconds,
            endTime: endSeconds,
            text: currentText.trim(),
            isActive: false,
          });
        }
        // Start new segment
        currentStartTime = timeMatch[1];
        currentEndTime = timeMatch[2];
        currentText = '';
      } else if (line && currentStartTime) {
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

  // Reload transcription when language changes
  useEffect(() => {
    if (reel) {
      loadTranscriptionFromReel(reel).catch(error => {
        console.error('Error reloading transcription:', error);
      });
    }
  }, [i18n.language, locale, reel?.id]);

  // Update active transcription segment based on current playback time
  useEffect(() => {
    if (transcription.length === 0 || currentTime === undefined) return;

    setTranscription(prevSegments => {
      const updated = prevSegments.map(segment => {
        // Check if current time is within this segment's time range
        const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
        return { ...segment, isActive };
      });

      return updated;
    });
  }, [currentTime, transcription.length]);

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
            toast.error(t('reel.playback_error', 'Playback error. Please try reloading the page.'));
          }
        });

        // Listen for iframe errors
        iframe.addEventListener('error', (e) => {
          console.error('Bunny.net iframe error:', e);
          toast.error(t('reel.load_error', 'Error loading video. Please check your connection.'));
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
          toast.error(t('reel.fullscreen_error', 'Error entering fullscreen'));
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
      <main className="w-full h-[calc(100vh-80px)] bg-[#0A0A0A] text-white relative overflow-hidden flex flex-col">
        {/* Video Container - Takes most of the screen, above buttons */}
        <div className="flex-1 relative z-0 min-h-0">
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
                // Make sure controls are always visible on mobile
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
              className="border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              title={reelTitle}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 50, // Higher than modal (z-30) to keep controls visible
                border: 'none'
              }}
            />
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 50 // Higher than modal (z-30) to keep controls visible
              }}
            />
          ) : thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={reelTitle} 
              className="w-full h-full object-cover"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0
            }}></div>
          )}
          {/* Gradient overlay - subtle, doesn't interfere with controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" style={{ zIndex: 2 }}></div>
        </div>

        {/* Multi-Language Audio Player - Only for TTS audio (not original) */}
        {reel && reel.audio_urls && Object.keys(reel.audio_urls).length > 0 && (() => {
          // Filter out 'original' audio (source language uses video's original audio)
          const ttsAudioTracks = Object.entries(reel.audio_urls)
            .filter(([lang, url]) => url !== 'original')
            .map(([lang, url]) => ({
              language: lang,
              url: url as string,
              label: lang === 'en' ? t('common.language_en', 'English') : lang === 'es' ? t('common.language_es', 'Español') : t('common.language_pt', 'Português')
            }));
          
          if (ttsAudioTracks.length === 0) return null;
          
          return (
            <div className="absolute top-4 right-4 left-4 z-20" key={`audio-player-mobile-${reel.id}-${i18n.language.substring(0, 2)}`}>
              <MultiLanguageAudioPlayer
                audioTracks={ttsAudioTracks.map(track => ({
                  ...track,
                  label: track.language === 'en' ? t('common.language_en', 'English') : track.language === 'es' ? t('common.language_es', 'Español') : t('common.language_pt', 'Português')
                }))}
                defaultLanguage={i18n.language.substring(0, 2) as 'en' | 'es' | 'pt'}
                videoRef={null}
              />
            </div>
          );
        })()}

        {/* Custom video controls hidden - using Bunny.net native controls */}

        {/* Action Buttons - Fixed at bottom, below video */}
        <div className="relative z-10 px-6 py-4 bg-[#0A0A0A] border-t border-white/10">
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
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors text-sm font-medium touch-manipulation ${
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
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors text-sm font-medium touch-manipulation ${
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
        {/* Modal appears above the buttons */}
        {showMobileModal && (
          <div className="absolute bottom-[72px] left-0 right-0 z-30 bg-[#141414] rounded-t-[2rem] shadow-[0_-10px_60px_rgba(0,0,0,0.8)] border-t border-white/10 flex flex-col max-h-[calc(85vh-72px)] transition-all duration-500">
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
                  {t('reel.no_episodes', 'No more episodes in this category')}
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
                    <p className="text-sm">{t('reel.no_transcription', 'No transcription available for this reel')}</p>
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

        {/* Multi-Language Audio Player - Only for TTS audio (not original) */}
        {reel && reel.audio_urls && Object.keys(reel.audio_urls).length > 0 && (() => {
          // Filter out 'original' audio (source language uses video's original audio)
            const ttsAudioTracks = Object.entries(reel.audio_urls)
              .filter(([lang, url]) => url !== 'original')
              .map(([lang, url]) => ({
                language: lang,
                url: url as string,
                label: lang === 'en' ? t('common.language_en', 'English') : lang === 'es' ? t('common.language_es', 'Español') : t('common.language_pt', 'Português')
              }));
          
          if (ttsAudioTracks.length === 0) return null;
          
          return (
            <div className="mt-6" key={`audio-player-desktop-${reel.id}-${i18n.language.substring(0, 2)}`}>
              <MultiLanguageAudioPlayer
                audioTracks={ttsAudioTracks}
                defaultLanguage={i18n.language.substring(0, 2) as 'en' | 'es' | 'pt'}
                videoRef={null}
              />
            </div>
          );
        })()}
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
            <div className="px-12 py-10 space-y-6 max-w-3xl">
              {transcription.length > 0 ? (
                transcription.map((segment, index) => (
                  <div
                    id={`transcript-segment-${index}`}
                    key={index}
                    onClick={() => {
                      // Seek to this segment's start time
                      if (reel && (reel.bunny_embed_url || reel.bunny_player_url)) {
                        if (bunnyPlayerRef.current) {
                          try {
                            bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                            setCurrentTime(segment.startTime);
                            if (reel.duration) {
                              setProgress((segment.startTime / reel.duration) * 100);
                            }
                          } catch (error) {
                            console.error('Error seeking to segment:', error);
                          }
                        }
                      } else if (videoRef.current) {
                        videoRef.current.currentTime = segment.startTime;
                        setCurrentTime(segment.startTime);
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
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-base">{t('reel.no_transcription', 'No transcription available for this reel')}</p>
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

