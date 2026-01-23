import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Lock,
  ThumbsUp,
  ThumbsDown,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
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
import { isVideoLocked, shouldShowLockIcon, getLockMessageKey } from '@/utils/videoAccess';

interface ShopProduct {
  name?: string;
  price?: string;
  original_price?: string;
  image?: string;
  description?: string;
  includes?: string[];
  shop_url?: string;
}

interface TranscriptionSegment {
  time: string;
  startTime: number;
  endTime: number;
  text: string;
  isActive?: boolean;
}

const EpisodeShop = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any | null>(null);
  const [category, setCategory] = useState<any | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [shopProduct, setShopProduct] = useState<ShopProduct | null>(null);
  const [downloadableResources, setDownloadableResources] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'transcription' | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const bunnyPlayerRef = useRef<any>(null);
  const transcriptionScrollRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling transcription
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale, getPathWithLocale, locale } = useLocale();

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
        
        setVideo(videoData);
        
        // Set category
        if (videoData.category) {
          setCategory(videoData.category);
        }
        
        // Parse downloadable resources and check for shop product
        if (videoData.downloadable_resources) {
          try {
            const resources = typeof videoData.downloadable_resources === 'string'
              ? JSON.parse(videoData.downloadable_resources)
              : videoData.downloadable_resources;
            
            if (Array.isArray(resources)) {
              setDownloadableResources(resources);
            } else if (typeof resources === 'object' && resources !== null) {
              // Check if it's a shop product structure
              if (resources.episode_type === 'shop' || resources.shop_product) {
                setShopProduct(resources.shop_product || resources);
              } else if (Array.isArray(resources)) {
                setDownloadableResources(resources);
              }
            }
          } catch (e) {
            console.error('Error parsing downloadable_resources:', e);
          }
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
        
        // Set user progress
        if (existingProgress) {
          setUserProgress(existingProgress);
          setIsLiked(existingProgress.is_liked === true || existingProgress.is_liked === 1);
          setIsDisliked(existingProgress.is_disliked === true || existingProgress.is_disliked === 1);
        } else if (user && videoData.id) {
          try {
            const progressResponse = await userProgressApi.getVideoProgress(videoData.id);
            if (progressResponse.success && progressResponse.data) {
              const progress = progressResponse.data;
              setUserProgress(progress);
              setIsLiked(progress.is_liked === true || progress.is_liked === 1);
              setIsDisliked(progress.is_disliked === true || progress.is_disliked === 1);
            }
          } catch (error) {
            console.error('Failed to fetch progress:', error);
          }
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
    }
  }, [id, user, t]);

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

  // Helper to get series title with multilingual support
  const getSeriesTitle = (serie: any): string => {
    if (!serie) return '';
    const localeKey = (locale || 'en').substring(0, 2) as 'en' | 'es' | 'pt';
    
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
    return serie.title || serie.name || '';
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePlay = () => {
    if (!hasAccess) {
      toast.error(t('video.premium_content'));
      return;
    }
    setShowVideoPlayer(true);
    setIsPlaying(true);
  };

  const handleLike = async () => {
    if (!user || !video) return;

    try {
      const response = await userProgressApi.toggleLike(video.id);
      if (response.success) {
        const newLikedState = response.data?.is_liked || !isLiked;
        setIsLiked(newLikedState);
        if (newLikedState && isDisliked) {
          setIsDisliked(false);
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast.error(t('video.failed_like', 'Error al actualizar el like'));
    }
  };

  const handleDislike = async () => {
    if (!user || !video) return;

    try {
      const response = await userProgressApi.toggleDislike(video.id);
      if (response.success) {
        const newDislikedState = response.data?.is_disliked || !isDisliked;
        setIsDisliked(newDislikedState);
        if (newDislikedState && isLiked) {
          setIsLiked(false);
        }
      }
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
      toast.error(t('video.failed_dislike', 'Error al actualizar el dislike'));
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in_favorites', 'Please sign in to add favorites'));
      return;
    }

    const previousFavoriteState = isFavorite;
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    try {
      const response = await userProgressApi.toggleFavorite(video.id);
      if (response.success && response.data) {
        const isFavoriteValue = response.data.is_favorite === true || response.data.is_favorite === 1;
        setIsFavorite(isFavoriteValue);
        setUserProgress((prev: any) => ({
          ...prev,
          is_favorite: isFavoriteValue,
        }));
        if (isFavoriteValue) {
          toast.success(t('video.added_to_favorites', 'Added to favorites'));
        } else {
          toast.success(t('video.removed_from_favorites', 'Removed from favorites'));
        }
      } else {
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
      setIsFavorite(previousFavoriteState);
      toast.error(error instanceof Error ? error.message : t('video.failed_update_favorites', 'Failed to update favorites'));
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user || !video) return;
    
    try {
      const response = await commentsApi.createComment(video.id, {
        comment: comment.trim(),
      });
      
      if (response.success) {
        setComment('');
        // Refresh comments
        const commentsResponse = await commentsApi.getComments(video.id, 'newest');
        if (commentsResponse.success) {
          setComments(commentsResponse.data);
        }
        toast.success(t('video.comment_added'));
      }
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.message || t('video.comment_failed'));
    }
  };

  const handleShopClick = () => {
    if (shopProduct?.shop_url) {
      window.open(shopProduct.shop_url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error(t('episode.shop_url_not_available', 'Shop URL not available'));
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
    let currentTime = 0;
    const estimatedSegmentDuration = duration / Math.max(lines.length, 1);
    
    lines.forEach((line) => {
      const timestampMatch = line.match(/(\d{1,2}):(\d{2}):?(\d{2})?/);
      if (timestampMatch) {
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

  // Load transcription from video data or API
  const loadTranscription = async (videoId: number, videoData?: any) => {
    try {
      const currentLocale = (locale || 'en').substring(0, 2);
      const finalLocale = ['en', 'es', 'pt'].includes(currentLocale) ? currentLocale : 'en';
      
      let transcriptionText: string | null = null;
      
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
      } else if (videoData) {
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
      }
      
      if (!transcriptionText) {
        try {
          const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8000/api';
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
            if (data.success && data.transcription) {
              transcriptionText = data.transcription;
            }
          }
        } catch (apiError) {
          console.error('Transcription API error:', apiError);
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
        setTranscriptionSegments(segments);
      } else {
        setTranscription(null);
        setTranscriptionSegments([]);
      }
    } catch (error) {
      console.error('Error loading transcription:', error);
      setTranscription(null);
      setTranscriptionSegments([]);
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
        toast.error(t('video.auth_required', 'Authentication required for download'), { id: 'download' });
        return;
      }
      
      const videoId = video.id;
      const quality = '720';
      
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
          const link = document.createElement('a');
          link.href = data.download_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.download = `${video.title || 'video'}.mp4`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast.success('Download started', { id: 'download' });
        } else {
          toast.error(data.message || 'Failed to get download URL', { id: 'download' });
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get download URL' }));
        toast.error(errorData.message || 'Failed to get download URL', { id: 'download' });
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video', { id: 'download' });
    }
  };

  const handleDownloadMaterials = async () => {
    if (video && video.allow_download && video.bunny_video_id) {
      await handleVideoDownload();
      return;
    }
    
    if (video && video.allow_download && (video.bunny_embed_url || video.bunny_video_url)) {
      await handleVideoDownload();
      return;
    }
    
    if (downloadableResources.length > 0) {
      let downloadedCount = 0;
      let failedCount = 0;
      
      for (let index = 0; index < downloadableResources.length; index++) {
        const resource = downloadableResources[index];
        
        if (resource.url && resource.url.startsWith('api://download-video/') && resource.video_id) {
          try {
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
                const link = document.createElement('a');
                link.href = data.download_url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.download = resource.filename || resource.name || 'video.mp4';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                downloadedCount++;
              } else {
                failedCount++;
                toast.error(data.message || 'Failed to get download URL');
              }
            } else {
              failedCount++;
              toast.error('Failed to get download URL');
            }
          } catch (error) {
            console.error('Error fetching download URL:', error);
            failedCount++;
            toast.error('Failed to download video');
          }
          continue;
        }
        
        if (resource.url) {
          try {
            let downloadUrl = resource.url;
            
            if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://') && !downloadUrl.startsWith('api://')) {
              const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
              downloadUrl = `${baseUrl.replace('/api', '')}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
            }
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            if (resource.filename || resource.name) {
              link.download = resource.filename || resource.name;
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            downloadedCount++;
            
            if (index < downloadableResources.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            console.error('Error downloading resource:', error);
            failedCount++;
            try {
              window.open(resource.url, '_blank');
            } catch (fallbackError) {
              toast.error(`Failed to download: ${resource.url || 'unknown resource'}`);
            }
          }
        } else {
          failedCount++;
        }
      }
      
      if (downloadedCount > 0) {
        toast.success(`${downloadedCount} ${downloadedCount === 1 ? 'file' : 'files'} ${t('video.download_started', 'download iniciado')}`);
      } else if (failedCount > 0) {
        toast.error('Failed to download materials. Please check the console for details.');
      }
    } else {
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
    if (activeTab === 'transcription') {
      setActiveTab(null);
    } else {
      setActiveTab('transcription');
      
      if (!transcription && video?.id) {
        loadTranscription(video.id, video);
      }
    }
  };

  // Reload transcription when language changes
  useEffect(() => {
    if (video && video.id) {
      loadTranscription(video.id, video);
    }
  }, [locale, video?.id]);

  // Update active transcription segment based on current playback time
  useEffect(() => {
    if (transcriptionSegments.length === 0 || videoCurrentTime === undefined) return;

    // Find the active segment index first (synchronously)
    const activeIndex = transcriptionSegments.findIndex(
      segment => videoCurrentTime >= segment.startTime && videoCurrentTime < segment.endTime
    );

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
  }, [videoCurrentTime, transcriptionSegments.length]);

  if (loading) {
    return (
      <main className="w-full min-h-screen pb-20 bg-[#161313] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A05245] mx-auto mb-4"></div>
          <p className="text-[#b2a6a4]">{t('common.loading', 'Cargando...')}</p>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="w-full min-h-screen pb-20 bg-[#161313] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#b2a6a4]">{t('video.video_not_found', 'Video no encontrado')}</p>
        </div>
      </main>
    );
  }

  const hasAccess = canAccessVideo(video.visibility);
  const progressPercentage = userProgress?.progress_percentage || 0;
  const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || video.bunny_thumbnail_url || '');
  const videoUrl = video.bunny_embed_url || video.bunny_video_url || video.video_url_full || video.video_url;
  const productImage = shopProduct?.image ? getImageUrl(shopProduct.image) : thumbnailUrl;

  const videoDuration = video.duration || 0;
  const currentTime = 0; // Can be tracked if needed
  const realTimeProgressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : progressPercentage;
  const finalProgressPercentage = currentTime > 0 && videoDuration > 0 ? realTimeProgressPercentage : progressPercentage;

  return (
    <main className="flex-1 px-4 md:px-10 py-8 w-full max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column - Video Player, Action Buttons, Video Info */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Video Player Section */}
          <div 
            className="relative w-full aspect-video rounded-none overflow-hidden group shadow-2xl bg-[#1d1615] border-b-2 border-[#a15145]"
            onClick={() => {
              if (!showVideoPlayer && hasAccess) {
                setShowVideoPlayer(true);
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
              ) : (video.bunny_embed_url || video.bunny_player_url) ? (
                <div className="w-full h-full relative">
                  <iframe
                    key={`bunny-video-${video.id}-${locale.substring(0, 2)}-${showVideoPlayer}`}
                    id={`bunny-iframe-${video.id}`}
                    src={(() => {
                      const embedUrl = video.bunny_embed_url || video.bunny_player_url || '';
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
                      finalUrl = `${finalUrl}${separator}autoplay=true&responsive=true&controls=true`;
                      if (video.caption_urls && Object.keys(video.caption_urls).length > 0) {
                        const currentLocale = locale.substring(0, 2);
                        if (video.caption_urls[currentLocale]) {
                          finalUrl += `&defaultTextTrack=${currentLocale}`;
                        } else if (video.caption_urls['en']) {
                          finalUrl += `&defaultTextTrack=en`;
                        }
                      }
                      return finalUrl;
                    })()}
                    className="border-0 absolute top-0 left-0"
                    style={{ 
                      width: '100%',
                      height: '100%'
                    }}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                    title={video.title}
                  />
                </div>
              ) : videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <p className="text-text-dim">{t('video.video_file_not_available')}</p>
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
                  <div className="text-center">
                    <Lock className="h-16 w-16 text-text-dim mx-auto mb-4" />
                    <p className="text-text-dim">{t('video.premium_content')}</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Progress Bar */}
          {userProgress && finalProgressPercentage > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
              <div 
                className="h-full bg-[#a15145] transition-all"
                style={{ width: `${finalProgressPercentage}%` }}
              ></div>
            </div>
          )}
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center justify-between pb-4 border-b border-[#342e2d]">
          <div className="flex items-stretch gap-4">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!showVideoPlayer) {
                  setShowVideoPlayer(true);
                }
                handlePlay();
              }}
              disabled={!hasAccess || !video}
              className="flex items-center justify-center rounded bg-[#a15145] text-white hover:bg-[#b56053] hover:scale-105 transition-all duration-300 shadow-lg shadow-black/50 px-8 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-7 w-7 fill-current" />
              <span className="font-bold text-sm tracking-widest uppercase">{t('video.play', 'Reproducir')}</span>
            </Button>
            <Button
              onClick={handleDownloadMaterials}
              variant="outline"
              className="flex items-center justify-center rounded border border-[#A05245] text-[#A05245] hover:bg-[#A05245] hover:text-white transition-all duration-300 px-6 gap-2"
            >
              <Download className="h-5 w-5" />
              <span className="font-bold text-xs tracking-widest uppercase">{t('video.download_materials', 'Descargar Materiales')}</span>
            </Button>
            <Button
              onClick={handleTranscription}
              variant="outline"
              className="flex items-center justify-center rounded border border-[#A05245] text-[#A05245] hover:bg-[#A05245] hover:text-white transition-all duration-300 px-6 gap-2"
            >
              <FileText className="h-5 w-5" />
              <span className="font-bold text-xs tracking-widest uppercase">{t('video.transcription', 'Transcripción')}</span>
            </Button>
          </div>
          <div className="flex items-center gap-6 pr-2">
            <button
              onClick={handleToggleFavorite}
              className="transition-colors focus:outline-none"
              title={isFavorite ? t('video.removed_from_favorites', 'Remove from favorites') : t('video.added_to_favorites', 'Add to favorites')}
            >
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                isFavorite 
                  ? 'border-primary bg-primary/10' 
                  : 'border-white/30 hover:border-white bg-transparent'
              }`}>
                <Plus className={`h-5 w-5 transition-colors ${
                  isFavorite ? 'text-primary' : 'text-white'
                }`} />
              </div>
            </button>
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center justify-center transition-colors focus:outline-none ${isLiked ? 'text-[#A05245]' : 'text-white hover:text-[#A05245]'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ThumbsUp className="h-8 w-8" />
            </button>
            <button
              onClick={handleDislike}
              disabled={!user}
              className={`flex items-center justify-center transition-colors focus:outline-none ${isDisliked ? 'text-[#A05245]' : 'text-white hover:text-[#A05245]'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ThumbsDown className="h-8 w-8" />
            </button>
          </div>
          </div>

          {/* Video Info Section */}
          <div className="flex flex-col gap-6">

            {/* Video Info */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-white text-4xl md:text-5xl font-serif font-bold leading-tight tracking-tight mb-3">
                  {video.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#b2a6a4] text-[11px] font-bold uppercase tracking-widest mb-6">
                  {video.published_at && (
                    <>
                      <span>{new Date(video.published_at).getFullYear()}</span>
                      <span className="text-[#342e2d]">•</span>
                    </>
                  )}
                  <span>{formatDuration(video.duration)}</span>
                  {category && (
                    <>
                      <span className="text-[#342e2d]">•</span>
                      <span className="border border-white/20 px-1.5 py-0.5 rounded text-[10px]">{category.name}</span>
                    </>
                  )}
                </div>
                {video.description && (
                  <p className="text-[#b2a6a4] text-base leading-relaxed max-w-4xl mb-6">
                    {video.description}
                  </p>
                )}
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
                            if (video && (video.bunny_embed_url || video.bunny_player_url)) {
                              if (bunnyPlayerRef.current) {
                                try {
                                  bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                                  setVideoCurrentTime(segment.startTime);
                                } catch (error) {
                                  console.error('Error seeking to segment:', error);
                                }
                              }
                            } else if (videoRef.current) {
                              videoRef.current.currentTime = segment.startTime;
                              setVideoCurrentTime(segment.startTime);
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
                              if (video && (video.bunny_embed_url || video.bunny_player_url)) {
                                if (bunnyPlayerRef.current) {
                                  try {
                                    bunnyPlayerRef.current.setCurrentTime(segment.startTime);
                                    setVideoCurrentTime(segment.startTime);
                                  } catch (error) {
                                    console.error('Error seeking to segment:', error);
                                  }
                                }
                              } else if (videoRef.current) {
                                videoRef.current.currentTime = segment.startTime;
                                setVideoCurrentTime(segment.startTime);
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
                      <p className="text-base">{t('video.no_transcription_available', 'No hay transcripción disponible para este video.')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  {t('video.comments', 'Comentarios')} <span className="text-[#b2a6a4] text-sm font-normal">{comments.length}</span>
                </h3>
                {user && (
                  <div className="flex gap-4 mb-6">
                    <div className="size-8 rounded-full bg-[#342e2d] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#a15145]">
                      {getInitials(user.name || user.email)}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex-1">
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full bg-transparent border-b border-[#342e2d] focus:border-[#a15145] outline-none pb-2 text-sm text-white placeholder-[#b2a6a4] transition-colors"
                        placeholder={t('video.add_comment', 'Añade un comentario...')}
                        type="text"
                      />
                    </form>
                  </div>
                )}
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="size-8 rounded-full bg-[#251e1d] flex items-center justify-center text-xs font-bold text-[#a15145]">
                        {getInitials(comment.user?.name || comment.user?.email)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">{comment.user?.name || 'Usuario'}</span>
                          <span className="text-[10px] text-[#b2a6a4]">
                            {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-sm text-[#b2a6a4]">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Shop Product Sidebar */}
        <div className="lg:col-span-4 flex flex-col h-full">
            <div className="bg-[#1d1615] border border-[#342e2d] rounded-xl overflow-hidden sticky top-24 shadow-xl">
              <div className="px-6 py-4 border-b border-[#342e2d] bg-[#251e1d]">
                <h3 className="text-white text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#a15145] text-lg">palette</span>
                  {t('episode.workshop_materials', 'Materiales de este taller')}
                </h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {productImage && (
                  <div className="aspect-square w-full rounded-lg bg-[#2a2423] relative overflow-hidden group">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${productImage})` }}
                    />
                    {shopProduct?.name && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] font-bold border border-white/10 tracking-wider uppercase">
                        {t('episode.complete_kit', 'Kit Completo')}
                      </div>
                    )}
                  </div>
                )}
                {shopProduct && (
                  <>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-white leading-tight">
                        {shopProduct.name || video.title}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        {shopProduct.price && (
                          <span className="text-3xl font-bold text-white">{shopProduct.price}€</span>
                        )}
                        {shopProduct.original_price && (
                          <span className="text-sm text-[#b2a6a4] line-through decoration-white/30">
                            {shopProduct.original_price}€
                          </span>
                        )}
                      </div>
                    </div>
                    {shopProduct.includes && shopProduct.includes.length > 0 && (
                      <div className="bg-black/20 rounded-lg p-4 border border-[#342e2d]/50">
                        <p className="text-sm text-[#b2a6a4] leading-relaxed">
                          <strong className="text-white block mb-2 text-xs uppercase tracking-wider">
                            {t('episode.includes', 'Incluye:')}
                          </strong>
                          {shopProduct.includes.map((item, index) => (
                            <span key={index} className="block mb-1">• {item}</span>
                          ))}
                        </p>
                      </div>
                    )}
                    {shopProduct.description && (
                      <p className="text-sm text-[#b2a6a4] leading-relaxed">
                        {shopProduct.description}
                      </p>
                    )}
                  </>
                )}
                <button
                  onClick={handleShopClick}
                  className="w-full flex items-center justify-center gap-2 bg-[#a15145] hover:bg-[#b56053] text-white py-4 rounded-lg font-bold text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-[#a15145]/20 group"
                >
                  <ShoppingCart className="h-5 w-5 group-hover:-translate-y-0.5 group-hover:rotate-[-10deg] transition-transform" />
                  {t('episode.go_to_shop', 'Ir a tienda')}
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Related Videos Section */}
      {relatedVideos.length > 0 && (
        <div className="mt-16 lg:mt-24 border-t border-[#342e2d] pt-8 mb-20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-bold text-white tracking-tight uppercase">
              {t('video.related_videos', 'Vídeos Relacionados')}
            </h3>
            <div className="flex gap-4">
              <button className="size-8 flex items-center justify-center text-white hover:text-[#a15145] transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="size-8 flex items-center justify-center text-white hover:text-[#a15145] transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
            {relatedVideos.map((relatedVideo) => {
              const relatedThumbnail = getImageUrl(relatedVideo.intro_image_url || relatedVideo.intro_image || relatedVideo.thumbnail_url || relatedVideo.thumbnail || relatedVideo.bunny_thumbnail_url || '');
              const shouldShowLock = shouldShowLockIcon(relatedVideo.visibility);
              const isLocked = isVideoLocked(relatedVideo.visibility, user?.subscription_type);
              const showLockIcon = shouldShowLock;
              
              return (
                <div
                  key={relatedVideo.id}
                  className={`group min-w-[300px] w-[300px] flex flex-col gap-3 ${showLockIcon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (isLocked || showLockIcon) {
                      toast.error(t('video.locked_content'));
                      return;
                    }
                    navigateWithLocale(`/episode/${relatedVideo.id}`);
                  }}
                >
                  <div className="relative aspect-video rounded-sm overflow-hidden bg-[#1d1615]">
                    {relatedThumbnail ? (
                      <div 
                        className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 ${showLockIcon ? 'opacity-60' : ''}`}
                        style={{ backgroundImage: `url(${relatedThumbnail})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#a15145]/20 to-[#a15145]/5" />
                    )}
                    {showLockIcon ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2 px-3 text-center">
                          <Lock className="h-10 w-10 text-white" />
                          <span className="text-white text-xs font-semibold">{t(getLockMessageKey(relatedVideo.visibility))}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play className="h-12 w-12 text-white drop-shadow-lg" />
                      </div>
                    )}
                    {relatedVideo.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white z-20">
                        {formatDurationShort(relatedVideo.duration)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold leading-tight group-hover:text-[#a15145] transition-colors line-clamp-2 text-sm">
                      {relatedVideo.title}
                    </h4>
                    <p className="text-[#b2a6a4] text-[11px] mt-1 uppercase tracking-wide">
                      {relatedVideo.series ? getSeriesTitle(relatedVideo.series) : (relatedVideo.series?.name || t('video.series', 'Serie'))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
};

export default EpisodeShop;



