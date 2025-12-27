import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { commentsApi, VideoComment } from '@/services/commentsApi';
import { toast } from 'sonner';

const EpisodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any | null>(null);
  const [category, setCategory] = useState<any | null>(null);
  const [series, setSeries] = useState<any | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(true); // Always show video player initially
  const [videoStarted, setVideoStarted] = useState(true); // Video starts automatically
  const [videoEnded, setVideoEnded] = useState(false); // Track if video has ended
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [downloadableResources, setDownloadableResources] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const bunnyPlayerRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef<boolean>(false); // Track if we should autoplay when player is ready
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();

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
      console.log('✅ Player.js library loaded');
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
          console.log('✅ Bunny.net player ready');
          
          // Auto-play video when page loads
          try {
            player.play();
            setIsPlaying(true);
            setVideoStarted(true);
            setShowVideoPlayer(true);
            console.log('▶️ Video autoplay started');
          } catch (error) {
            console.error('Error autoplaying video:', error);
            setIsPlaying(false);
          }
          
          // Duration is already saved in database from backend, no need to fetch here
          // Just get current time for progress tracking
          player.getCurrentTime((time: number) => {
            console.log('⏱️ Current playback time:', time, 'seconds');
            setCurrentTime(time);
          });
        });

        // Listen to timeupdate events to track current playback time only
        // Duration comes from database, not from Player.js
        player.on('timeupdate', (data: { seconds?: number }) => {
          if (data.seconds !== undefined) {
            setCurrentTime(data.seconds);
          }
        });

        player.on('play', () => {
          console.log('▶️ Video playing - updating button state to PAUSE');
          setIsPlaying(true);
          // Also update videoStarted if not already set
          if (!videoStarted) {
            setVideoStarted(true);
            setShowVideoPlayer(true);
          }
        });

        player.on('pause', () => {
          console.log('⏸️ Video paused - updating button state to PLAY/CONTINUE');
          setIsPlaying(false);
        });

        player.on('ended', () => {
          console.log('⏹️ Video ended - showing first frame image');
          setIsPlaying(false);
          setVideoEnded(true);
          setShowVideoPlayer(false); // Hide video player, show thumbnail
        });

        // Handle playback errors (HLS errors, network issues, etc.)
        player.on('error', (error: any) => {
          console.warn('⚠️ Bunny.net player error (non-fatal):', error);
          // Most HLS errors are non-fatal and the player will retry automatically
          // Only show error message for fatal errors
          if (error && error.fatal === true) {
            setPlaybackError(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
            toast.error(t('video.playback_error', 'Error de reproducción. Por favor, intente recargar la página.'));
          }
        });

        // Listen for iframe errors (network, CORS, etc.)
        iframe.addEventListener('error', (e) => {
          console.warn('⚠️ Bunny.net iframe error:', e);
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
  }, [video?.id, video?.bunny_embed_url, video?.bunny_player_url, video?.visibility, user]);

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

        // Check for transcription in description or downloadable_resources
        if (videoData.description && videoData.description.includes('TRANSCRIPCIÓN:')) {
          const transcriptionMatch = videoData.description.match(/TRANSCRIPCIÓN:\s*(.+)/i);
          if (transcriptionMatch) {
            setTranscription(transcriptionMatch[1]);
          }
        }

        // Fetch related videos
        if (videoData.category_id) {
          try {
            const relatedResponse = await videoApi.getPublic({ 
              category_id: videoData.category_id, 
              per_page: 5 
            });
            const relatedData = Array.isArray(relatedResponse.data) 
              ? relatedResponse.data 
              : relatedResponse.data?.data || [];
            setRelatedVideos(relatedData.filter((v: any) => v.id !== videoData.id).slice(0, 4));
          } catch (error) {
            console.error('Failed to fetch related videos:', error);
          }
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
      
      // Start playback immediately
      if (video.bunny_embed_url || video.bunny_player_url) {
        if (bunnyPlayerRef.current) {
          try {
            bunnyPlayerRef.current.play();
            console.log('▶️ Restarting video via Player.js');
            setIsPlaying(true);
          } catch (error) {
            console.error('Error restarting Bunny.net player:', error);
          }
        }
      } else if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Error playing video:', error);
        });
      }
      return;
    }
    
    // If video hasn't started yet, start it
    if (!videoStarted) {
      console.log('Play button clicked, starting video');
      setVideoStarted(true);
      setShowVideoPlayer(true);
      
      // Start playback immediately
      if (video.bunny_embed_url || video.bunny_player_url) {
        // Try to play immediately if player is already ready
        if (bunnyPlayerRef.current) {
          try {
            console.log('Player.js is already ready, calling play() immediately');
            // Use a callback to ensure play() is called correctly
            bunnyPlayerRef.current.getPaused((paused: boolean) => {
              if (paused) {
                bunnyPlayerRef.current.play();
                console.log('▶️ Starting video via Player.js');
                // Optimistically set state - Player.js event will confirm
                setIsPlaying(true);
                // Reset flag since we're playing
                shouldAutoPlayRef.current = false;
              } else {
                console.log('Video is already playing');
                setIsPlaying(true);
                shouldAutoPlayRef.current = false;
              }
            });
          } catch (error) {
            console.error('Error starting Bunny.net player:', error);
            // If play fails, set flag to retry when ready
            shouldAutoPlayRef.current = true;
          }
        } else {
          console.log('Player.js not ready yet, setting flag to play when ready');
          // Set flag to autoplay when player becomes ready
          shouldAutoPlayRef.current = true;
        }
      } else if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Error playing video:', error);
        });
      }
      return;
    }
    
    // If video has started, toggle play/pause
    if (video.bunny_embed_url || video.bunny_player_url) {
      // For Bunny.net iframes, use Player.js API
      if (bunnyPlayerRef.current) {
        try {
          bunnyPlayerRef.current.getPaused((paused: boolean) => {
            if (paused) {
              bunnyPlayerRef.current.play();
              console.log('▶️ Playing video via Player.js - state will update via event');
              // Don't set isPlaying here - let the 'play' event handle it
            } else {
              bunnyPlayerRef.current.pause();
              console.log('⏸️ Pausing video via Player.js - state will update via event');
              // Don't set isPlaying here - let the 'pause' event handle it
            }
          });
        } catch (error) {
          console.error('Error controlling Bunny.net player:', error);
          // Fallback: toggle UI state only if Player.js fails
          setIsPlaying(!isPlaying);
        }
      } else {
        console.log('Player.js not initialized yet, waiting...');
        // Wait a bit for player to initialize
        setTimeout(() => {
          if (bunnyPlayerRef.current) {
            handlePlay();
          } else {
            console.log('Player.js still not ready, toggling UI state as fallback');
            setIsPlaying(!isPlaying);
          }
        }, 200);
      }
    } else if (videoRef.current) {
      // For native video elements, control playback directly
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error);
        });
        setIsPlaying(true);
      }
    }
  };

  const handleDownloadMaterials = async () => {
    console.log('📥 Download materials clicked');
    console.log('📦 Downloadable resources:', downloadableResources);
    console.log('📦 Resources count:', downloadableResources.length);
    
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
            const apiBaseUrl = import.meta.env.VITE_SERVER_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/videos/${resource.video_id}/download-url?quality=720`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
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
              const errorData = await response.json();
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
      
      if (video?.allow_download === false && !video?.downloadable_resources) {
        toast.info(t('video.no_downloadable_resources', 'No hay materiales descargables disponibles. Los recursos descargables deben agregarse en el panel de administración.'));
      } else {
        toast.info(t('video.no_downloadable_resources', 'No hay materiales descargables disponibles'));
      }
    }
  };

  const handleTranscription = () => {
    if (transcription) {
      // Open transcription in a modal or new window
      const transcriptionWindow = window.open('', '_blank');
      if (transcriptionWindow) {
        transcriptionWindow.document.write(`
          <html>
            <head><title>${video?.title} - Transcripción</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
              <h1>${video?.title}</h1>
              <h2>Transcripción</h2>
              <pre style="white-space: pre-wrap; line-height: 1.6;">${transcription}</pre>
            </body>
          </html>
        `);
      }
    } else {
      toast.info(t('video.no_transcription', 'No hay transcripción disponible'));
    }
  };

  const handleLike = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in'));
      return;
    }

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
      toast.error(t('video.failed_like'));
    }
  };

  const handleDislike = async () => {
    if (!user || !video) {
      toast.error(t('video.please_sign_in'));
      return;
    }

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
      toast.error(t('video.failed_dislike'));
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
  const progressPercentage = userProgress?.progress_percentage || 0;
  const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || video.bunny_thumbnail_url || '');
  const videoUrl = video.bunny_embed_url || video.bunny_video_url || video.video_url_full || video.video_url;
  
  // Debug logging for video player
  console.log('=== EpisodeDetail: Video Player State ===');
  console.log('Has Access:', hasAccess);
  console.log('Show Video Player:', showVideoPlayer);
  console.log('Video URL (final):', videoUrl);
  console.log('Bunny Embed URL:', video.bunny_embed_url);
  console.log('Bunny Player URL:', video.bunny_player_url);
  console.log('Thumbnail URL:', thumbnailUrl);

  return (
    <main className="w-full min-h-screen pb-20 bg-background-dark font-display text-text-light">
      {/* Video Player Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div 
          className={`relative w-full rounded-lg overflow-hidden shadow-2xl border border-border-dark/50 bg-black aspect-video md:aspect-[21/9]`}
        >
          {hasAccess ? (
            <>
              {!videoEnded && (video.bunny_embed_url || video.bunny_player_url) ? (
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
                  <iframe
                    key={`bunny-video-${video.id}-${showVideoPlayer}`}
                    id={`bunny-iframe-${video.id}`}
                    src={(() => {
                      const embedUrl = video.bunny_embed_url || video.bunny_player_url || '';
                      console.log('Original embed URL:', embedUrl);
                      
                      // Convert /play/ URLs to /embed/ URLs
                      let finalUrl = embedUrl;
                      if (embedUrl.includes('/play/')) {
                        // Extract library ID and video ID from /play/ URL
                        const playMatch = embedUrl.match(/\/play\/(\d+)\/([^/?]+)/);
                        if (playMatch) {
                          const libraryId = playMatch[1];
                          const videoId = playMatch[2];
                          // Convert to /embed/ URL
                          finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
                          console.log('Converted /play/ to /embed/ URL:', finalUrl);
                        }
                      }
                      
                      // Enable autoplay - video should start playing automatically
                      const separator = finalUrl.includes('?') ? '&' : '?';
                      finalUrl = `${finalUrl}${separator}autoplay=true&responsive=true`;
                      
                      console.log('Final iframe URL (with autoplay):', finalUrl);
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
                    onLoad={() => {
                      console.log('✅ Bunny.net iframe loaded successfully');
                    }}
                    onError={(e) => {
                      console.error('❌ Bunny.net iframe failed to load:', e);
                      setPlaybackError(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
                      toast.error(t('video.load_error', 'Error al cargar el video. Por favor, verifique su conexión.'));
                    }}
                  />
                </div>
              ) : videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  onPlay={() => {
                    console.log('✅ Video started playing');
                    setIsPlaying(true);
                  }}
                  onPause={() => setIsPlaying(false)}
                  onError={(e) => {
                    console.error('❌ Video failed to load:', e);
                    console.error('Video URL:', videoUrl);
                  }}
                  onLoadedData={() => {
                    console.log('✅ Video data loaded');
                    // Duration is already saved in database from backend, no need to set it here
                  }}
                  onTimeUpdate={(e) => {
                    const current = e.currentTarget.currentTime;
                    const dur = e.currentTarget.duration;
                    setCurrentTime(current);
                    // Duration comes from database, not from video element
                    if (dur > 0 && user && video) {
                      const videoDuration = video.duration || dur; // Use database duration if available
                      const progressPercentage = (current / videoDuration) * 100;
                      // Save progress periodically (every 10 seconds)
                      if (Math.floor(current) % 10 === 0) {
                        userProgressApi.updateVideoProgress(video.id, {
                          time_watched: Math.floor(current),
                          video_duration: Math.floor(videoDuration),
                          progress_percentage: Math.floor(progressPercentage),
                          is_completed: progressPercentage >= 90,
                        }).catch(console.error);
                      }
                    }
                  }}
                />
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
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {!hasAccess && (
                <div className="text-center">
                  <Lock className="h-16 w-16 text-text-dim mx-auto mb-4" />
                  <p className="text-text-dim">{t('video.premium_content')}</p>
                </div>
              )}
            </div>
          )}
          {/* Show thumbnail image only when video has ended */}
          {videoEnded && hasAccess && thumbnailUrl && (
            <div className="absolute inset-0 z-10">
              <img
                alt={video.title}
                src={thumbnailUrl}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Restart video
                    setVideoEnded(false);
                    setShowVideoPlayer(true);
                    setVideoStarted(true);
                    if (bunnyPlayerRef.current) {
                      bunnyPlayerRef.current.play();
                      setIsPlaying(true);
                    }
                  }}
                  className="h-16 w-16 rounded-full bg-primary hover:bg-primary-hover text-white font-bold shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
                  size="lg"
                >
                  <Play className="h-8 w-8 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Progress Bar */}
          {userProgress && progressPercentage > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700 z-20">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6 mb-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePlay();
              }}
              disabled={!hasAccess || !video}
              className="h-12 flex items-center gap-3 px-8 bg-primary hover:bg-primary-hover text-white font-bold tracking-wide rounded transition-all shadow-lg hover:shadow-primary/30 w-full sm:w-auto justify-center sm:justify-start uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!videoStarted ? (
                <>
                  <Play className="h-5 w-5" />
                  {t('video.play', 'REPRODUCIR')}
                </>
              ) : isPlaying ? (
                <>
                  <i className="fa-solid fa-pause text-2xl"></i>
                  {t('video.pause', 'PAUSAR')}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-play text-2xl"></i>
                  {t('video.play', 'REPRODUCIR')}
                </>
              )}
            </Button>
            <div className="flex gap-4 w-full sm:w-auto">
              <Button
                onClick={handleDownloadMaterials}
                variant="outline"
                className="h-12 flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 border border-primary hover:bg-primary/10 text-primary font-bold tracking-widest text-[11px] uppercase rounded transition-all whitespace-nowrap"
              >
                <Download className="text-lg" />
                {t('video.download_materials', 'DESCARGAR MATERIALES')}
              </Button>
              <Button
                onClick={handleTranscription}
                variant="outline"
                className="h-12 flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 border border-primary hover:bg-primary/10 text-primary font-bold tracking-widest text-[11px] uppercase rounded transition-all whitespace-nowrap"
              >
                <FileText className="text-lg" />
                {t('video.transcription', 'TRANSCRIPCIÓN')}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto self-end lg:self-center">
            <button
              onClick={handleLike}
              className={`text-white hover:text-primary active:text-primary transition-colors focus:text-primary ${
                isLiked ? 'text-primary' : ''
              }`}
            >
              <i className="fa-solid fa-thumbs-up text-3xl"></i>
            </button>
            <button
              onClick={handleDislike}
              className={`text-white hover:text-primary active:text-primary transition-colors focus:text-primary ${
                isDisliked ? 'text-primary' : ''
              }`}
            >
              <i className="fa-solid fa-thumbs-down text-3xl"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Video Info and Comments Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-text-muted-dark uppercase tracking-wide">
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
                <p className="text-lg leading-relaxed text-gray-300 font-light">
                  {video.episode_number && (
                    <strong className="font-semibold text-primary">
                      {t('video.chapter', 'Capítulo')} {video.episode_number}: {video.title}
                    </strong>
                  )}
                  {' '}
                  {video.description || video.short_description || t('video.no_description', 'Sin descripción')}
                </p>
              </div>
            </div>

            {/* Comments Section */}
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
          </div>

          {/* Sidebar - Participants/Instructors */}
          <div className="lg:col-span-1 space-y-8">
            <div className="border-l border-border-dark pl-0 lg:pl-12 pt-6 lg:pt-2">
              <h3 className="text-sm font-bold text-text-muted-dark uppercase tracking-widest mb-6">
                {t('video.participants', 'Intervienen')}
              </h3>
              <ul className="space-y-4 text-text-muted-dark text-sm leading-relaxed">
                {video.instructor ? (
                  <li className="group">
                    <span className="block text-white font-bold text-base group-hover:text-primary transition-colors">
                      {typeof video.instructor === 'object' ? video.instructor.name : video.instructor}
                    </span>
                    <span className="text-xs uppercase tracking-wide opacity-80">
                      {typeof video.instructor === 'object' ? video.instructor.title || t('video.instructor', 'Instructor') : t('video.instructor', 'Instructor')}
                    </span>
                  </li>
                ) : (
                  <li className="group">
                    <span className="block text-white font-bold text-base group-hover:text-primary transition-colors">
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
              
              return (
                <div
                  key={relatedVideo.id}
                  className="group cursor-pointer"
                  onClick={() => navigateWithLocale(`/episode/${relatedVideo.id}`)}
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
                  <h4 className="text-gray-200 font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {relatedVideo.title}
                  </h4>
                  <p className="text-xs text-text-muted-dark mt-1">
                    {relatedVideo.category?.name || t('video.category', 'Categoría')}
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

