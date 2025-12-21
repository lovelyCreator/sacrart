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
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { videoApi } from '@/services/videoApi';
import { userProgressApi } from '@/services/userProgressApi';
import { commentsApi, VideoComment } from '@/services/commentsApi';
import { toast } from 'sonner';

interface ShopProduct {
  name?: string;
  price?: string;
  original_price?: string;
  image?: string;
  description?: string;
  includes?: string[];
  shop_url?: string;
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
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [shopProduct, setShopProduct] = useState<ShopProduct | null>(null);
  const [downloadableResources, setDownloadableResources] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { navigateWithLocale, getPathWithLocale } = useLocale();

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

        // Check for transcription
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
  const thumbnailUrl = getImageUrl(video.thumbnail_url || video.intro_image_url || video.bunny_thumbnail_url || '');
  const videoUrl = video.bunny_embed_url || video.bunny_video_url || video.video_url_full || video.video_url;
  const productImage = shopProduct?.image ? getImageUrl(shopProduct.image) : thumbnailUrl;

  return (
    <main className="w-full min-h-screen pb-20 bg-[#161313] text-white">
      <div className="flex-1 px-4 md:px-10 py-8 w-full max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Video Thumbnail */}
            <div className="relative w-full aspect-video rounded-none overflow-hidden group shadow-2xl bg-[#1d1615] border-b-2 border-[#a15145]">
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
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#a15145]/20 to-[#a15145]/5 flex items-center justify-center">
                      <p className="text-[#b2a6a4]">{t('video.video_file_not_available')}</p>
                    </div>
                  )}
                </>
              ) : thumbnailUrl ? (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${thumbnailUrl})` }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
                  {hasAccess && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={handlePlay}
                    >
                      <div className="w-20 h-20 bg-[#a15145]/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                        <Play className="h-10 w-10 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#a15145]/20 to-[#a15145]/5 flex items-center justify-center">
                  {!hasAccess && (
                    <div className="text-center">
                      <Lock className="h-16 w-16 text-[#b2a6a4] mx-auto mb-4" />
                      <p className="text-[#b2a6a4]">{t('video.premium_content')}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Progress Bar */}
              {userProgress && progressPercentage > 0 && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                  <div 
                    className="h-full bg-[#a15145] transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pb-4 border-b border-[#342e2d]">
              <div className="flex items-stretch gap-4">
                <button
                  onClick={handlePlay}
                  disabled={!hasAccess}
                  className="flex items-center justify-center rounded bg-[#a15145] text-white hover:bg-[#b56053] hover:scale-105 transition-all duration-300 shadow-lg shadow-black/50 px-8 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-7 w-7 fill-current" />
                  <span className="font-bold text-sm tracking-widest uppercase">{t('video.play', 'Reproducir')}</span>
                </button>
                {downloadableResources.length > 0 && (
                  <button className="flex items-center justify-center rounded border border-[#A05245] text-[#A05245] hover:bg-[#A05245] hover:text-white transition-all duration-300 px-6 gap-2">
                    <Download className="h-5 w-5" />
                    <span className="font-bold text-xs tracking-widest uppercase">{t('video.download_materials', 'Descargar Materiales')}</span>
                  </button>
                )}
                {transcription && (
                  <button className="flex items-center justify-center rounded border border-[#A05245] text-[#A05245] hover:bg-[#A05245] hover:text-white transition-all duration-300 px-6 gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-bold text-xs tracking-widest uppercase">{t('video.transcription', 'Transcripción')}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-6 pr-2">
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

          {/* Sidebar - Shop Product */}
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

        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <div className="mt-16 lg:mt-24 border-t border-[#342e2d] pt-8 mb-20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-bold text-white tracking-tight uppercase">
                {t('video.related_videos', 'Vídeos Relacionados')}
              </h3>
            </div>
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
              {relatedVideos.map((relatedVideo) => {
                const relatedThumbnail = getImageUrl(relatedVideo.thumbnail_url || relatedVideo.intro_image_url || relatedVideo.bunny_thumbnail_url || '');
                return (
                  <Link
                    key={relatedVideo.id}
                    to={getPathWithLocale(`/episode/${relatedVideo.id}`)}
                    className="group min-w-[300px] w-[300px] flex flex-col gap-3"
                  >
                    <div className="relative aspect-video rounded-sm overflow-hidden bg-[#1d1615]">
                      {relatedThumbnail ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url(${relatedThumbnail})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#a15145]/20 to-[#a15145]/5" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play className="h-12 w-12 text-white drop-shadow-lg" />
                      </div>
                      {relatedVideo.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                          {formatDurationShort(relatedVideo.duration)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold leading-tight group-hover:text-[#a15145] transition-colors line-clamp-2 text-sm">
                        {relatedVideo.title}
                      </h4>
                      {relatedVideo.category && (
                        <p className="text-[#b2a6a4] text-[11px] mt-1 uppercase tracking-wide">
                          {relatedVideo.category.name}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default EpisodeShop;



