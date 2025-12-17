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
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [downloadableResources, setDownloadableResources] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();

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
        
        // Parse downloadable resources
        if (videoData.downloadable_resources) {
          try {
            const resources = typeof videoData.downloadable_resources === 'string'
              ? JSON.parse(videoData.downloadable_resources)
              : videoData.downloadable_resources;
            
            if (Array.isArray(resources)) {
              setDownloadableResources(resources);
            }
          } catch (e) {
            console.error('Error parsing downloadable_resources:', e);
          }
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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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

  const getYear = (dateString: string | null | undefined) => {
    if (!dateString) return new Date().getFullYear().toString();
    return new Date(dateString).getFullYear().toString();
  };

  const handlePlay = () => {
    if (!video) return;
    if (!canAccessVideo(video.visibility)) {
      toast.error(t('video.premium_content'));
      return;
    }
    setShowVideoPlayer(true);
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownloadMaterials = () => {
    if (downloadableResources.length > 0) {
      downloadableResources.forEach((resource: any) => {
        if (resource.url) {
          window.open(resource.url, '_blank');
        }
      });
    } else {
      toast.info(t('video.no_downloadable_resources', 'No hay materiales descargables disponibles'));
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
  const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || video.bunny_thumbnail_url || '');
  const videoUrl = video.bunny_embed_url || video.bunny_video_url || video.video_url_full || video.video_url;

  return (
    <main className="w-full min-h-screen pb-20 bg-background-dark font-display text-text-light">
      {/* Video Thumbnail Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div 
          className="relative w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden shadow-2xl group cursor-pointer border border-border-dark/50"
          onClick={hasAccess && !showVideoPlayer ? handlePlay : undefined}
        >
          {showVideoPlayer && hasAccess ? (
            <>
              {video.bunny_embed_url || video.bunny_player_url ? (
                <iframe
                  src={video.bunny_embed_url || video.bunny_player_url}
                  className="w-full h-full border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  title={video.title}
                />
              ) : videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    const current = e.currentTarget.currentTime;
                    const dur = e.currentTarget.duration;
                    if (dur > 0 && user && video) {
                      const progressPercentage = (current / dur) * 100;
                      // Save progress periodically (every 10 seconds)
                      if (Math.floor(current) % 10 === 0) {
                        userProgressApi.updateVideoProgress(video.id, {
                          time_watched: Math.floor(current),
                          video_duration: Math.floor(dur),
                          progress_percentage: Math.floor(progressPercentage),
                          is_completed: progressPercentage >= 90,
                        }).catch(console.error);
                      }
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <p className="text-text-dim">{t('video.video_file_not_available')}</p>
                </div>
              )}
            </>
          ) : thumbnailUrl ? (
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
                  <i className="fa-solid fa-play text-white text-4xl ml-1"></i>
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
          {/* Progress Bar */}
          {userProgress && progressPercentage > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700">
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
              onClick={handlePlay}
              disabled={!hasAccess}
              className="h-12 flex items-center gap-3 px-8 bg-primary hover:bg-primary-hover text-white font-bold tracking-wide rounded transition-all shadow-lg hover:shadow-primary/30 w-full sm:w-auto justify-center sm:justify-start uppercase text-sm"
            >
              <i className="fa-solid fa-play text-2xl"></i>
              {t('video.play', 'REPRODUCIR')}
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
                <span className="border border-current px-1 rounded text-[10px] font-bold">T</span>
                <span className="w-1 h-1 bg-current rounded-full"></span>
                <span>{category?.name || video.category?.name || t('video.category', 'Categoría')}</span>
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
                      <img src={(user as any).avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
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
                      className="w-full bg-transparent border-b border-border-dark focus:border-primary px-0 py-2 text-sm text-white focus:ring-0 placeholder-text-muted-dark transition-colors"
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
              const relatedThumbnail = getImageUrl(relatedVideo.thumbnail_url || relatedVideo.intro_image_url || relatedVideo.bunny_thumbnail_url || '');
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

