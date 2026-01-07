import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rewindApi, Rewind, Video } from '@/services/videoApi';
import { useLocale } from '@/hooks/useLocale';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, MoreVertical, RotateCcw, Plus, ThumbsUp, ThumbsDown, ListOrdered, Lock, Subtitles } from 'lucide-react';
import { toast } from 'sonner';
import { MultiLanguageAudioPlayer } from '@/components/MultiLanguageAudioPlayer';

// Transcription segment interface
interface TranscriptionSegment {
  time: string;
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

  // Load transcription for current video
  const loadTranscription = async (video: Video) => {
    if (!video.id) return;
    
    try {
      const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
      const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000/api';
      const response = await fetch(
        `${baseUrl}/videos/${video.id}/transcription?locale=${currentLocale}`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': currentLocale,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Transcription API response:', data); // Debug log
        
        if (data.success && data.transcription) {
          let transcriptionText = data.transcription;
          
          // CRITICAL FIX: Handle if transcription is an array of words instead of string
          if (Array.isArray(transcriptionText)) {
            console.warn('Transcription is an array! Converting to string...', transcriptionText);
            transcriptionText = transcriptionText.map(item => {
              if (typeof item === 'string') {
                return item;
              } else if (item && typeof item === 'object') {
                return item.punctuated_word || item.word || item.text || '';
              }
              return '';
            }).join(' ');
            console.log('Converted to string:', transcriptionText.substring(0, 100));
          }
          
          // Ensure it's a string
          if (typeof transcriptionText !== 'string') {
            console.error('Transcription is not a string or array:', typeof transcriptionText, transcriptionText);
            transcriptionText = String(transcriptionText || '');
          }
          
          // Parse transcription text into segments
          const segments = parseTranscription(transcriptionText, video.duration || 0);
          console.log('Parsed transcription segments:', segments.length); // Debug log
          setTranscription(segments);
        } else {
          console.log('No transcription data in response'); // Debug log
          setTranscription([]);
        }
      } else {
        console.error('Transcription API error:', response.status, response.statusText);
        setTranscription([]);
      }
    } catch (error) {
      console.error('Error loading transcription:', error);
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
    
    lines.forEach((line, index) => {
      // Try to extract timestamp and text
      const timestampMatch = line.match(/(\d{1,2}):(\d{2}):?(\d{2})?/);
      if (timestampMatch) {
        const time = timestampMatch[0];
        const textPart = line.replace(timestampMatch[0], '').trim();
        if (textPart) {
          segments.push({
            time,
            text: textPart,
            isActive: false,
          });
        }
      } else if (line.trim() && segments.length > 0) {
        // Append to last segment if no timestamp
        segments[segments.length - 1].text += ' ' + line.trim();
      }
    });
    
    return segments.length > 0 ? segments : [{ time: '00:00', text, isActive: false }];
  };

  // Parse WebVTT format
  const parseWebVTT = (vtt: string): TranscriptionSegment[] => {
    const segments: TranscriptionSegment[] = [];
    const lines = vtt.split('\n');
    let currentTime = '';
    let currentText = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) continue;
      
      // Check for timestamp line (format: 00:00:00.000 --> 00:00:05.000)
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        // Save previous segment if exists
        if (currentTime && currentText) {
          segments.push({
            time: currentTime.split('.')[0], // Remove milliseconds
            text: currentText.trim(),
            isActive: false,
          });
        }
        currentTime = timestampMatch[1];
        currentText = '';
      } else if (currentTime && line) {
        // Text line
        currentText += (currentText ? ' ' : '') + line;
      }
    }
    
    // Add last segment
    if (currentTime && currentText) {
      segments.push({
        time: currentTime.split('.')[0],
        text: currentText.trim(),
        isActive: false,
      });
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
            {currentVideo && (currentVideo.bunny_embed_url || currentVideo.bunny_player_url) ? (
              <iframe
                key={`bunny-iframe-${currentVideo.id}-${(i18n.language || locale || 'en').substring(0, 2)}`}
                id={`bunny-iframe-${currentVideo.id}`}
                src={(() => {
                  const embedUrl = currentVideo.bunny_embed_url || currentVideo.bunny_player_url || '';
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
                  finalUrl = `${finalUrl}${separator}autoplay=false&responsive=true&controls=true`;
                  
                  // Add captions if available
                  if (currentVideo.caption_urls && Object.keys(currentVideo.caption_urls).length > 0) {
                    const currentLocale = (i18n.language || locale || 'en').substring(0, 2);
                    // Bunny.net uses 'defaultTextTrack' parameter to set the active caption language
                    // Must match the 'srclang' attribute of the caption track uploaded to Bunny.net
                    if (currentVideo.caption_urls[currentLocale]) {
                      finalUrl += `&defaultTextTrack=${currentLocale}`;
                    } else if (currentVideo.caption_urls['en']) {
                      finalUrl += `&defaultTextTrack=en`;
                    }
                  }
                  
                  return finalUrl;
                })()}
                className="w-full h-full object-cover border-0"
                style={{ width: '100%', height: '100%' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                title={currentVideo.title || ''}
              />
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

          {/* Multi-Language Audio Player */}
          {currentVideo && currentVideo.audio_urls && Object.keys(currentVideo.audio_urls).length > 0 && (
            <div className="mt-6" key={`audio-player-${currentVideo.id}-${i18n.language.substring(0, 2)}`}>
              <MultiLanguageAudioPlayer
                audioTracks={Object.entries(currentVideo.audio_urls).map(([lang, url]) => ({
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
              <div className="py-6 space-y-8 max-w-3xl">
                {/* Caption Info Banner */}
                {currentVideo && currentVideo.caption_urls && Object.keys(currentVideo.caption_urls).length > 0 && (
                  <div className="mb-6 p-4 bg-[#A05245]/10 border border-[#A05245]/20 rounded-lg flex items-start gap-3">
                    <Subtitles className="h-5 w-5 text-[#A05245] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        <span className="text-white font-semibold">{t('rewind.captions_available', 'Captions available in video player')}</span>
                        <br />
                        {t('rewind.captions_hint', 'Click the CC button in the video player to enable subtitles.')}
                        {' '}
                        <span className="text-[#A05245]">
                          {t('rewind.available_languages', 'Available')}: {Object.keys(currentVideo.caption_urls).map(lang => lang.toUpperCase()).join(', ')}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                
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
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">
                      {t('rewind.no_transcription', 'No transcription available for this video')}
                    </p>
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
