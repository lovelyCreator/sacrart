import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Hls from 'hls.js';
// @ts-ignore - node-webvtt may not have TypeScript definitions
import WebVTT from 'node-webvtt';

interface Cue {
  identifier?: string;
  start: number;
  end: number;
  text: string;
  styles?: string;
}

// Manual VTT parser fallback
const parseVTTManually = (vttContent: string): { cues: Cue[] } => {
  const cues: Cue[] = [];
  const lines = vttContent.split('\n');
  let currentCue: Partial<Cue> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines
    if (!line || line === 'WEBVTT' || line.startsWith('WEBVTT')) {
      continue;
    }
    
    // Check for timestamp line (format: 00:00:00.000 --> 00:00:05.000)
    const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (timeMatch) {
      // Save previous cue if exists
      if (currentCue && currentCue.start !== undefined && currentCue.text) {
        cues.push(currentCue as Cue);
      }
      
      // Parse timestamps
      const startHours = parseInt(timeMatch[1]);
      const startMinutes = parseInt(timeMatch[2]);
      const startSeconds = parseInt(timeMatch[3]);
      const startMs = parseInt(timeMatch[4]);
      const startTime = startHours * 3600 + startMinutes * 60 + startSeconds + startMs / 1000;
      
      const endHours = parseInt(timeMatch[5]);
      const endMinutes = parseInt(timeMatch[6]);
      const endSeconds = parseInt(timeMatch[7]);
      const endMs = parseInt(timeMatch[8]);
      const endTime = endHours * 3600 + endMinutes * 60 + endSeconds + endMs / 1000;
      
      // Start new cue
      currentCue = {
        start: startTime,
        end: endTime,
        text: '',
      };
    } else if (currentCue && line) {
      // Add text to current cue (remove HTML tags)
      let cleanLine = line.replace(/<[^>]*>/g, '').trim();
      
      // If the line is just punctuation, add it without a space
      if (cleanLine && /^[.,!?;:]+$/.test(cleanLine)) {
        currentCue.text = (currentCue.text || '') + cleanLine;
      } else if (cleanLine) {
        // For regular text, add with a space if there's existing text
        if (currentCue.text && !currentCue.text.match(/[.,!?;:]\s*$/)) {
          currentCue.text = currentCue.text + ' ' + cleanLine;
        } else {
          currentCue.text = (currentCue.text || '') + cleanLine;
        }
      }
    }
  }
  
  // Add last cue
  if (currentCue && currentCue.start !== undefined && currentCue.text) {
    // Clean up the final text
    let finalText = currentCue.text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+([.,!?;:])/g, '$1') // Remove spaces before punctuation
      .replace(/\s+/g, ' ') // Remove multiple spaces
      .trim();
    
    if (finalText) {
      currentCue.text = finalText;
      cues.push(currentCue as Cue);
    }
  }
  
  // Filter out empty cues and merge very short punctuation-only cues with previous cues
  const cleanedCues: Cue[] = [];
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const text = cue.text.trim();
    
    // If this is a punctuation-only cue and very close to the previous cue, merge it
    if (i > 0 && /^[.,!?;:]+$/.test(text)) {
      const prevCue = cleanedCues[cleanedCues.length - 1];
      const timeDiff = cue.start - prevCue.end;
      // If the cues are within 0.1 seconds, merge them
      if (timeDiff < 0.1) {
        prevCue.text = prevCue.text + text;
        prevCue.end = cue.end; // Extend the end time
        continue;
      }
    }
    
    if (text.length > 0) {
      cleanedCues.push(cue);
    }
  }
  
  return { cues: cleanedCues };
};

interface HLSPlayerWithCaptionsProps {
  videoId?: string;
  hlsUrl?: string;
  captionUrl?: string;
  captionUrls?: Record<string, string>; // { en: 'url', es: 'url', pt: 'url' }
  defaultLanguage?: string;
  defaultAudioTrack?: 'en' | 'es' | 'pt';
  defaultCaptionLanguage?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  style?: React.CSSProperties;
  captionStyle?: React.CSSProperties;
  savedPosition?: number;
  onPositionRestored?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  videoType?: 'video' | 'reel' | 'live-archive-video';
}

export interface HLSPlayerWithCaptionsRef {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPaused: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unmute: () => void;
  getMuted: () => boolean;
  setAudioTrack: (trackIndex: number) => void;
  getAudioTracks: () => any[];
  getCurrentAudioTrack: () => number;
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
  getVideoElement: () => HTMLVideoElement | null;
}

const HLSPlayerWithCaptions = forwardRef<HLSPlayerWithCaptionsRef, HLSPlayerWithCaptionsProps>(({
  videoId,
  hlsUrl,
  captionUrl,
  captionUrls,
  defaultLanguage = 'en',
  defaultAudioTrack,
  defaultCaptionLanguage,
  autoplay = false,
  controls = true,
  className = '',
  style = {},
  captionStyle = {},
  savedPosition,
  onPositionRestored,
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onError,
  videoType = 'video',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [cues, setCues] = useState<Record<string, Cue[]>>({}); // Store cues by language
  const [activeCue, setActiveCue] = useState<Cue | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>(defaultCaptionLanguage || defaultLanguage);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const hasSeekedToSavedPosition = useRef(false);
  
  // Use refs to access latest state in event handlers
  const cuesRef = useRef<Record<string, Cue[]>>({});
  const currentLanguageRef = useRef<string>(defaultCaptionLanguage || defaultLanguage);
  
  // Keep refs in sync with state
  useEffect(() => {
    cuesRef.current = cues;
  }, [cues]);
  
  useEffect(() => {
    currentLanguageRef.current = currentLanguage;
  }, [currentLanguage]);

  // Extract available languages from captionUrls
  useEffect(() => {
    if (captionUrls && Object.keys(captionUrls).length > 0) {
      const languages = Object.keys(captionUrls);
      setAvailableLanguages(languages);
      if (languages.length > 0 && !languages.includes(currentLanguage)) {
        setCurrentLanguage(languages[0]);
      }
    } else if (captionUrl) {
      setAvailableLanguages([currentLanguage]);
    }
  }, [captionUrls, captionUrl, currentLanguage]);

  // Update language when defaultCaptionLanguage changes
  useEffect(() => {
    if (defaultCaptionLanguage && defaultCaptionLanguage !== currentLanguage) {
      setCurrentLanguage(defaultCaptionLanguage);
    }
  }, [defaultCaptionLanguage, currentLanguage]);

  // Get the current caption URL based on selected language
  const getCurrentCaptionUrl = useCallback((): string | undefined => {
    if (captionUrls && captionUrls[currentLanguage]) {
      return captionUrls[currentLanguage];
    }
    return captionUrl;
  }, [captionUrls, captionUrl, currentLanguage]);

  // Load and parse VTT file
  const loadCaptions = useCallback(async (url: string, language: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      
      // Check if URL is a CDN URL, convert to API endpoint
      let captionUrl = url;
      if (url.includes('b-cdn.net') || url.includes('bunnycdn.com') || url.includes('mediadelivery.net')) {
        if (videoId) {
          let endpoint = 'videos';
          if (videoType === 'reel') {
            endpoint = 'reels';
          } else if (videoType === 'live-archive-video') {
            endpoint = 'live-archive-videos';
          }
          captionUrl = `${apiBaseUrl}/${endpoint}/${videoId}/subtitles/${language}`;
          console.log(`🔄 Converted CDN caption URL to API endpoint: ${url} -> ${captionUrl}`);
        }
      }

      const response = await fetch(captionUrl, {
        headers: {
          'Accept': 'text/vtt',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch captions: ${response.status} ${response.statusText}`);
      }

      const vttContent = await response.text();
      
      // Parse VTT using node-webvtt with fallback to manual parser
      let parsed: any;
      try {
        if (typeof WebVTT === 'function') {
          parsed = WebVTT(vttContent, { strict: false });
        } else if (typeof WebVTT.parse === 'function') {
          parsed = WebVTT.parse(vttContent, { strict: false });
        } else if (WebVTT.default && typeof WebVTT.default.parse === 'function') {
          parsed = WebVTT.default.parse(vttContent, { strict: false });
        } else {
          parsed = parseVTTManually(vttContent);
        }
      } catch (parseError) {
        console.warn('node-webvtt parsing failed, using manual parser:', parseError);
        parsed = parseVTTManually(vttContent);
      }
      
      // Extract cues and clean up text
      const extractedCues: Cue[] = (parsed.cues || []).map((cue: any) => {
        let text = cue.text || (typeof cue.text === 'string' ? cue.text : '');
        
        // Remove HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Clean up spacing around punctuation
        text = text.replace(/\s+([.,!?;:])/g, '$1');
        text = text.replace(/\s+/g, ' ');
        text = text.trim();
        
        return {
          identifier: cue.identifier,
          start: cue.start,
          end: cue.end,
          text: text,
          styles: cue.styles,
        };
      }).filter((cue: Cue) => cue.text && cue.text.length > 0);

      setCues(prev => ({ ...prev, [language]: extractedCues }));
      console.log(`✅ Loaded ${extractedCues.length} caption cues for language: ${language}`);
      if (extractedCues.length > 0) {
        console.log(`📊 First cue: ${extractedCues[0].start}s - ${extractedCues[0].end}s: "${extractedCues[0].text.substring(0, 50)}"`);
        console.log(`📊 Last cue: ${extractedCues[extractedCues.length - 1].start}s - ${extractedCues[extractedCues.length - 1].end}s: "${extractedCues[extractedCues.length - 1].text.substring(0, 50)}"`);
      }
    } catch (err) {
      console.error(`❌ Failed to load captions for ${language}:`, err);
      setCues(prev => {
        const updated = { ...prev };
        delete updated[language];
        return updated;
      });
    }
  }, [videoId, videoType]);

  // Load all caption files
  useEffect(() => {
    if (captionUrls && Object.keys(captionUrls).length > 0) {
      Object.entries(captionUrls).forEach(([lang, url]) => {
        if (url && typeof url === 'string') {
          loadCaptions(url, lang);
        }
      });
    } else if (captionUrl) {
      loadCaptions(captionUrl, currentLanguage);
    }
  }, [captionUrls, captionUrl, currentLanguage, loadCaptions]);

  // Fetch HLS URL if not provided
  useEffect(() => {
    const fetchHlsUrl = async () => {
      if (hlsUrl || !videoId) return;

      try {
        let response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reels/${videoId}/hls-url`);
        let data = await response.json();
        
        if (!data.success && response.status === 404) {
          response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/live-archive-videos/${videoId}/hls-url`);
          data = await response.json();
        }
        
        if (!data.success && response.status === 404) {
          response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/videos/${videoId}/hls-url`);
          data = await response.json();
        }
        
        if (data.success && data.hls_url) {
          loadVideo(data.hls_url);
        } else {
          throw new Error(data.message || 'Failed to get HLS URL');
        }
      } catch (error) {
        console.error('Error fetching HLS URL:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to fetch HLS URL'));
        }
      }
    };

    if (videoId && !hlsUrl) {
      fetchHlsUrl();
    } else if (hlsUrl) {
      loadVideo(hlsUrl);
    }
  }, [videoId, hlsUrl]);

  const loadVideo = (url: string) => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        xhrSetup: (xhr, requestUrl) => {
          // Only set credentials for our own API endpoints, not for CDN URLs
          const isApiUrl = requestUrl.includes(import.meta.env.VITE_API_BASE_URL || 'localhost:8000');
          xhr.withCredentials = isApiUrl;
        },
      });

      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed');
        setIsReady(true);
        setIsLoading(false);

        // Set default audio track
        if (hls.audioTracks && hls.audioTracks.length > 0 && defaultAudioTrack) {
          const supportedLanguages = ['en', 'es', 'pt'];
          const targetLanguage = defaultAudioTrack || 'en';
          
          for (let i = 0; i < hls.audioTracks.length; i++) {
            const track = hls.audioTracks[i];
            if (track && (track.lang === targetLanguage || track.name?.toLowerCase().includes(targetLanguage))) {
              hls.audioTrack = i;
              setCurrentAudioTrack(i);
              console.log(`🎵 Set default audio track to: ${targetLanguage} (index: ${i})`);
              break;
            }
          }
        }

        // Seek to saved position
        if (savedPosition && savedPosition > 0 && !hasSeekedToSavedPosition.current) {
          setTimeout(() => {
            video.currentTime = savedPosition;
            hasSeekedToSavedPosition.current = true;
            if (onPositionRestored) {
              onPositionRestored();
            }
          }, 500);
        }

        if (onReady) {
          onReady();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              setError('Video playback error');
              if (onError) {
                onError(new Error('HLS playback failed'));
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsReady(true);
        setIsLoading(false);
        if (onReady) {
          onReady();
        }
      });
    } else {
      setError('HLS is not supported in this browser');
      if (onError) {
        onError(new Error('HLS is not supported'));
      }
    }

    // Set video attributes
    video.autoplay = autoplay;
    video.controls = controls;
    video.crossOrigin = 'anonymous';

    // Event listeners
    const handlePlay = () => {
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      if (onPause) onPause();
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      
      if (onTimeUpdate) {
        onTimeUpdate(currentTime);
      }

      // Update active caption based on current time using refs for latest state
      if (cuesRef.current[currentLanguageRef.current]) {
        const languageCues = cuesRef.current[currentLanguageRef.current];
        if (languageCues && languageCues.length > 0) {
          const tolerance = 0.1;
          const active = languageCues.find(
            (cue) => currentTime >= (cue.start - tolerance) && currentTime <= (cue.end + tolerance)
          );
          
          setActiveCue(prev => {
            if (active && prev && active.start === prev.start && active.end === prev.end && active.text === prev.text) {
              return prev;
            }
            if (active && (!prev || active.start !== prev.start)) {
              console.log(`📝 Active cue at ${currentTime.toFixed(2)}s: "${active.text.substring(0, 50)}" (${active.start.toFixed(2)}s - ${active.end.toFixed(2)}s)`);
            }
            return active || null;
          });
        } else {
          setActiveCue(null);
        }
      } else {
        setActiveCue(null);
      }
    };

    const handleDurationChange = () => {
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
    };

    const handleEnded = () => {
      setActiveCue(null);
      if (onEnded) onEnded();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  };

  // Update audio track when defaultAudioTrack changes
  useEffect(() => {
    if (!hlsRef.current || !isReady) return;

    const hls = hlsRef.current;
    if (hls.audioTracks && hls.audioTracks.length > 0 && defaultAudioTrack) {
      for (let i = 0; i < hls.audioTracks.length; i++) {
        const track = hls.audioTracks[i];
        if (track && (track.lang === defaultAudioTrack || track.name?.toLowerCase().includes(defaultAudioTrack))) {
          hls.audioTrack = i;
          setCurrentAudioTrack(i);
          console.log(`🎵 Updated audio track to: ${defaultAudioTrack} (index: ${i})`);
          break;
        }
      }
    }
  }, [defaultAudioTrack, isReady]);

  // Update active cue when cues or language changes
  useEffect(() => {
    if (!videoRef.current || !cues[currentLanguage] || cues[currentLanguage].length === 0) {
      setActiveCue(null);
      return;
    }

    const video = videoRef.current;
    const tolerance = 0.1;
    
    const updateActiveCue = () => {
      const currentTime = video.currentTime;
      const languageCues = cues[currentLanguage];
      if (languageCues && languageCues.length > 0) {
        const matchingCues = languageCues.filter(
          (cue) => currentTime >= (cue.start - tolerance) && currentTime <= (cue.end + tolerance)
        );
        
        let active = null;
        if (matchingCues.length > 0) {
          active = matchingCues.reduce((best, cue) => {
            const bestCenter = (best.start + best.end) / 2;
            const cueCenter = (cue.start + cue.end) / 2;
            const bestDistance = Math.abs(currentTime - bestCenter);
            const cueDistance = Math.abs(currentTime - cueCenter);
            return cueDistance < bestDistance ? cue : best;
          });
        }
        
        setActiveCue(prev => {
          if (active && prev && active.start === prev.start && active.end === prev.end && active.text === prev.text) {
            return prev;
          }
          return active || null;
        });
      }
    };

    updateActiveCue();
    
    let rafId: number;
    const rafUpdate = () => {
      if (video && !video.paused) {
        updateActiveCue();
      }
      rafId = requestAnimationFrame(rafUpdate);
    };
    
    video.addEventListener('timeupdate', updateActiveCue);
    rafId = requestAnimationFrame(rafUpdate);

    return () => {
      video.removeEventListener('timeupdate', updateActiveCue);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [cues, currentLanguage]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (videoRef.current) {
        await videoRef.current.play();
      }
    },
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    getCurrentTime: () => {
      return videoRef.current?.currentTime || 0;
    },
    getDuration: () => {
      return videoRef.current?.duration || 0;
    },
    getPaused: () => {
      return videoRef.current?.paused ?? true;
    },
    setVolume: (volume: number) => {
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, Math.min(1, volume));
      }
    },
    getVolume: () => {
      return videoRef.current?.volume ?? 1;
    },
    mute: () => {
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    },
    unmute: () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
    },
    getMuted: () => {
      return videoRef.current?.muted ?? false;
    },
    setAudioTrack: (trackIndex: number) => {
      if (hlsRef.current && hlsRef.current.audioTracks && trackIndex >= 0 && trackIndex < hlsRef.current.audioTracks.length) {
        hlsRef.current.audioTrack = trackIndex;
        setCurrentAudioTrack(trackIndex);
        console.log(`🎵 Switched audio track to index: ${trackIndex}`);
      }
    },
    getAudioTracks: () => {
      if (hlsRef.current && hlsRef.current.audioTracks) {
        return Array.from(hlsRef.current.audioTracks).map((track, index) => ({
          id: index,
          lang: track.lang,
          name: track.name,
          enabled: hlsRef.current?.audioTrack === index,
        }));
      }
      return [];
    },
    getCurrentAudioTrack: () => {
      return currentAudioTrack;
    },
    setCaptionTrack: (language: string) => {
      if (language && (cues[language] || captionUrls?.[language])) {
        setCurrentLanguage(language);
        console.log(`📝 Enabled captions for language: ${language}`);
      } else if (language === '') {
        setActiveCue(null);
        console.log('❌ Disabled captions');
      } else {
        console.warn(`⚠️ No captions available for language: ${language}`);
      }
    },
    getCaptionStatus: () => {
      const status = {
        captionUrls: captionUrls || {},
        textTracks: Object.keys(cues).map((lang) => ({
          language: lang,
          mode: lang === currentLanguage ? 'showing' : 'hidden',
          readyState: cues[lang] ? 2 : 0,
          activeCues: lang === currentLanguage && activeCue ? 1 : 0,
          url: captionUrls?.[lang],
        })),
        hlsSubtitleTracks: [],
        currentSubtitleTrack: Object.keys(cues).indexOf(currentLanguage) >= 0 ? Object.keys(cues).indexOf(currentLanguage) : null,
      };
      return status;
    },
    getCurrentCaptionText: () => {
      if (activeCue) {
        return activeCue.text;
      }
      return null;
    },
    getVideoElement: () => {
      return videoRef.current;
    },
  }));

  // Default caption style
  const defaultCaptionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 16px',
    borderRadius: '4px',
    maxWidth: '90%',
    textAlign: 'center',
    lineHeight: '1.4',
    zIndex: 10,
    pointerEvents: 'none',
    userSelect: 'none',
    ...captionStyle,
  };

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />
      
      {/* Hide native video captions */}
      <style>{`
        video::cue {
          display: none !important;
        }
        video::-webkit-media-text-track-display {
          display: none !important;
        }
      `}</style>

      {/* Caption Overlay */}
      {activeCue && (
        <div style={defaultCaptionStyle}>
          {activeCue.text}
        </div>
      )}

      {/* Language Switcher */}
      {availableLanguages.length > 1 && (
        <div className="absolute top-4 right-4 z-20">
          <select
            value={currentLanguage}
            onChange={(e) => setCurrentLanguage(e.target.value)}
            className="bg-black/70 text-white px-3 py-2 rounded-md text-sm border border-white/20 backdrop-blur-sm"
            style={{ zIndex: 20 }}
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-red-400 text-center px-4">
            <p className="text-lg font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
});

HLSPlayerWithCaptions.displayName = 'HLSPlayerWithCaptions';

export default HLSPlayerWithCaptions;
