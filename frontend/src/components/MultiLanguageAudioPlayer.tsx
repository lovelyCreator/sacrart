import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

interface AudioTrack {
  language: string;
  url: string;
  label: string;
}

interface MultiLanguageAudioPlayerProps {
  audioTracks: AudioTrack[];
  defaultLanguage?: string;
  videoRef?: React.RefObject<HTMLVideoElement | HTMLIFrameElement>;
}

/**
 * Multi-Language Audio Player Component
 * 
 * Plays TTS audio in sync with video
 * User can switch between languages
 * 
 * Usage:
 * <MultiLanguageAudioPlayer 
 *   audioTracks={[
 *     { language: 'en', url: 'https://...', label: 'English' },
 *     { language: 'es', url: 'https://...', label: 'Español' },
 *     { language: 'pt', url: 'https://...', label: 'Português' }
 *   ]}
 *   defaultLanguage="en"
 *   videoRef={videoRef}
 * />
 */
export const MultiLanguageAudioPlayer: React.FC<MultiLanguageAudioPlayerProps> = ({
  audioTracks,
  defaultLanguage = 'en',
  videoRef,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Update selected language when defaultLanguage prop changes (URL language change)
  useEffect(() => {
    console.log('MultiLanguageAudioPlayer - defaultLanguage changed:', defaultLanguage);
    if (defaultLanguage && audioTracks.find(t => t.language === defaultLanguage)) {
      console.log('Updating selected language to:', defaultLanguage);
      setSelectedLanguage(defaultLanguage);
    }
  }, [defaultLanguage, audioTracks]);

  // Get current audio track
  const currentTrack = audioTracks.find(t => t.language === selectedLanguage) || audioTracks[0];

  // Handle language change
  const handleLanguageChange = (language: string) => {
    console.log('User changed audio language to:', language);
    const audio = audioRef.current;
    if (!audio) return;

    const currentTime = audio.currentTime;
    const wasPlaying = !audio.paused;

    console.log('Switching audio:', { from: selectedLanguage, to: language, currentTime, wasPlaying });
    setSelectedLanguage(language);
    
    // After state updates, restore position and playback
    setTimeout(() => {
      if (audio) {
        audio.currentTime = currentTime;
        if (wasPlaying) {
          audio.play().catch(e => console.error('Audio play error:', e));
        }
      }
    }, 100);

    setShowLanguageMenu(false);
  };

  // Sync with video if videoRef is provided
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !videoRef?.current) return;

    const videoElement = videoRef.current as HTMLVideoElement;

    const handleVideoPlay = () => {
      audio.play().catch(e => console.error('Audio play error:', e));
      setIsPlaying(true);
    };

    const handleVideoPause = () => {
      audio.pause();
      setIsPlaying(false);
    };

    const handleVideoSeeking = () => {
      audio.currentTime = videoElement.currentTime;
    };

    const handleVideoSeeked = () => {
      audio.currentTime = videoElement.currentTime;
    };

    // Sync time periodically (in case they drift)
    const syncInterval = setInterval(() => {
      if (Math.abs(audio.currentTime - videoElement.currentTime) > 0.3) {
        audio.currentTime = videoElement.currentTime;
      }
    }, 1000);

    videoElement.addEventListener('play', handleVideoPlay);
    videoElement.addEventListener('pause', handleVideoPause);
    videoElement.addEventListener('seeking', handleVideoSeeking);
    videoElement.addEventListener('seeked', handleVideoSeeked);

    return () => {
      videoElement.removeEventListener('play', handleVideoPlay);
      videoElement.removeEventListener('pause', handleVideoPause);
      videoElement.removeEventListener('seeking', handleVideoSeeking);
      videoElement.removeEventListener('seeked', handleVideoSeeked);
      clearInterval(syncInterval);
    };
  }, [videoRef]);

  // Handle volume change
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Update audio source when language changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load(); // Reload with new source
  }, [currentTrack]);

  // Debug logging
  useEffect(() => {
    console.log('MultiLanguageAudioPlayer mounted/updated:', {
      audioTracks: audioTracks.map(t => ({ lang: t.language, label: t.label })),
      selectedLanguage,
      defaultLanguage,
      currentTrack: currentTrack ? { lang: currentTrack.language, label: currentTrack.label } : null
    });
  }, [audioTracks, selectedLanguage, defaultLanguage, currentTrack]);

  if (!currentTrack || audioTracks.length === 0) {
    console.warn('MultiLanguageAudioPlayer: No tracks available');
    return null;
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(e => console.error('Audio play error:', e));
      setIsPlaying(true);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#A05245]/10 to-[#C5A065]/10 border border-white/10 rounded-lg p-4 shadow-lg">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-[#A05245]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        <h3 className="text-white font-semibold text-sm">Audio Dubbing</h3>
      </div>

      {/* Audio element (hidden) */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        preload="auto"
        className="hidden"
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-[#A05245] hover:bg-[#b56053] text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4l10 6-10 6V4z"/>
            </svg>
          )}
        </button>

        {/* Language selector */}
        <div className="flex-1 relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="w-full flex items-center justify-between gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2.5 rounded-lg transition-all"
            title="Select audio language"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#A05245]" />
              <span className="font-medium text-sm">{currentTrack.label}</span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Language menu */}
          {showLanguageMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-black/95 rounded-lg shadow-xl overflow-hidden min-w-full z-10">
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold uppercase tracking-wide">
                  Audio Language
                </div>
                {audioTracks.map(track => (
                  <button
                    key={track.language}
                    onClick={() => handleLanguageChange(track.language)}
                    className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
                      track.language === selectedLanguage
                        ? 'bg-[#A05245]/30 text-white font-semibold'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {track.label}
                    {track.language === selectedLanguage && (
                      <span className="ml-2 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Volume control */}
              <div className="border-t border-white/10 p-3">
                <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
                  <span>Volume</span>
                  <span className="text-white font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#A05245]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Info badge */}
        <div className="flex-shrink-0 text-xs text-gray-400 bg-black/20 px-3 py-1.5 rounded-full">
          🎙️ AI Dubbed
        </div>
      </div>
    </div>
  );
};

export default MultiLanguageAudioPlayer;




