import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Download, ShoppingBag } from 'lucide-react';
import kidsApi, { KidsResource, KidsProduct } from '@/services/kidsApi';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SacrartKids = () => {
  const [heroVideo, setHeroVideo] = useState<any>(null);
  const [kidsVideos, setKidsVideos] = useState<any[]>([]);
  const [pdfResources, setPdfResources] = useState<KidsResource[]>([]);
  const [products, setProducts] = useState<KidsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const { user } = useAuth();

  // Helper to get image URL
  const getImageUrl = (src: string | null | undefined): string => {
    if (!src || !src.trim()) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Format video duration
  const formatVideoDuration = (seconds: number | string | null | undefined): string => {
    if (!seconds) return '';
    const numSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
    if (isNaN(numSeconds) || numSeconds <= 0) return '';
    
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    const secs = numSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Fetch kids content from API
  useEffect(() => {
    const fetchKidsContent = async () => {
      setLoading(true);
      try {
        const response = await kidsApi.getContent();
        
        console.log('Kids content API response:', response);
        
        // apiCall returns the JSON directly, so response is { success: true, data: {...} }
        if (response.success && response.data) {
          const content = response.data;
          setHeroVideo(content.hero_video);
          setKidsVideos(content.videos || []);
          setPdfResources(content.resources || []);
          setProducts(content.products || []);
        } else {
          console.error('Invalid response structure:', response);
          toast.error(t('kids.error_loading', 'Failed to load content'));
        }
      } catch (error) {
        console.error('Error fetching kids content:', error);
        toast.error(t('kids.error_loading', 'Failed to load content'));
      } finally {
        setLoading(false);
      }
    };

    fetchKidsContent();
  }, [t, i18n.language, locale]);

  const handleVideoClick = (videoId: number) => {
    navigateWithLocale(`/episode/${videoId}`);
  };

  const handlePdfDownload = async (resource: KidsResource) => {
    try {
      const response = await kidsApi.downloadResource(resource.id);
      if (response.success && response.data && response.data.url) {
        window.open(response.data.url, '_blank');
        toast.success(t('kids.download_started', 'Download started'));
      }
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast.error(t('kids.download_failed', 'Download failed'));
    }
  };

  const handleProductClick = (productId: number) => {
    // Navigate to store or product detail page
    navigateWithLocale('/store');
  };

  if (loading) {
    return (
      <main className="flex-1 w-full pt-0 bg-[#252525] min-h-screen font-display">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full pt-0 bg-[#252525] min-h-screen font-display">
      {/* Hero Section */}
      <div className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-start overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: kidsVideos[0] 
                ? `url(${getImageUrl(kidsVideos[0].intro_image_url || kidsVideos[0].intro_image || kidsVideos[0].thumbnail_url || kidsVideos[0].thumbnail || '')})`
                : undefined,
              filter: 'brightness(0.7) sepia(0.2)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#252525] via-[#252525]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#252525] via-transparent to-transparent"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(255,190,120,0.15),_transparent_70%)]"></div>
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-6 pt-20">
          <div className="flex items-center gap-3 animate-fade-in-up">
            <div className="size-14 md:size-16 rounded-full bg-gradient-to-br from-[#A05245] to-[#7a3b30] flex items-center justify-center shadow-lg shadow-[#A05245]/30 ring-2 ring-[#A05245]/50">
              <i className="fa-solid fa-heart text-3xl md:text-4xl text-white"></i>
            </div>
          </div>
          <h1 className="animate-fade-in-up text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight max-w-5xl drop-shadow-2xl font-display" style={{ animationDelay: '0.1s' }}>
            SACRART <span className="text-[#A05245]">KIDS</span>
          </h1>
          <p className="animate-fade-in-up text-xl md:text-2xl text-gray-200 font-medium max-w-2xl leading-relaxed drop-shadow-md" style={{ animationDelay: '0.2s' }}>
            {t('kids.hero_description', 'Aprende, dibuja y crea tu primera colección de Arte Sacro.')}
          </p>
          <div className="animate-fade-in-up flex flex-wrap items-center gap-4 mt-6" style={{ animationDelay: '0.3s' }}>
            <Button
              onClick={() => {
                const videoToPlay = heroVideo || kidsVideos[0];
                if (videoToPlay) {
                  handleVideoClick(videoToPlay.id);
                }
              }}
              className="flex items-center gap-3 bg-[#A05245] hover:bg-[#8e493e] text-white px-8 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 shadow-[0_10px_30px_-10px_rgba(160,82,69,0.5)] group"
              disabled={!heroVideo && kidsVideos.length === 0}
            >
              <i className="fa-solid fa-play-circle text-xl group-hover:animate-pulse"></i>
              {t('kids.start_adventure', 'Comenzar Aventura')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Scroll to "Pequeños Curiosos" section or show modal with info
                const section = document.getElementById('little-curious-section');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/20 backdrop-blur-md text-white px-8 py-4 rounded-xl text-lg font-bold transition-all hover:border-white/40"
            >
              {t('kids.more_info', 'Más Información')}
            </Button>
          </div>
        </div>
      </div>

      {/* Pequeños Curiosos Section */}
      <section id="little-curious-section" className="relative z-10 -mt-20 pb-16 pl-4 md:pl-12 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide flex items-center gap-3">
            {t('kids.curious_ones', 'PEQUEÑOS CURIOSOS')}
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent mr-12"></span>
        </div>
        <div className="flex overflow-x-auto gap-5 pb-12 pr-6 md:pr-12 hide-scrollbar snap-x">
          {kidsVideos.length > 0 ? (
            kidsVideos.map((video) => {
              const thumbnailUrl = getImageUrl(video.intro_image_url || video.intro_image || video.thumbnail_url || video.thumbnail || '');
              return (
                <div
                  key={video.id}
                  className="group relative shrink-0 w-[300px] md:w-[360px] snap-start cursor-pointer"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <div className="aspect-video w-full rounded-xl overflow-hidden relative shadow-2xl border border-white/10 bg-[#1a1a1a]">
                    {thumbnailUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${thumbnailUrl})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#A05245] to-[#5e2e26]"></div>
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <div className="size-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-white/30 shadow-xl">
                        <Play className="text-3xl text-white" fill="currentColor" />
                      </div>
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded">
                        {formatVideoDuration(video.duration)}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#A05245] transition-colors line-clamp-1">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                      {video.short_description || video.description || t('kids.no_description', 'Sin descripción')}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400">
              {t('kids.no_videos', 'No hay videos disponibles')}
            </div>
          )}
        </div>
      </section>

      {/* El Rincón del Dibujante Section */}
      <section className="relative z-10 pb-16 pl-4 md:pl-12 bg-white/5 border-y border-white/5 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide flex items-center gap-3">
            {t('kids.drawing_corner', 'EL RINCÓN DEL DIBUJANTE')}
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent mr-12"></span>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-12 pr-6 md:pr-12 hide-scrollbar snap-x">
          {pdfResources.length > 0 ? (
            pdfResources.map((resource) => (
              <div
                key={resource.id}
                className="group relative shrink-0 w-[220px] md:w-[260px] snap-start cursor-pointer"
                onClick={() => handlePdfDownload(resource)}
              >
                <div className="aspect-[3/4] w-full rounded-xl overflow-hidden relative shadow-xl border border-white/10 bg-[#f0f0f0] transition-transform duration-300 group-hover:-translate-y-2">
                  {resource.thumbnail_url ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover opacity-80 mix-blend-luminosity contrast-150 brightness-110"
                        style={{ backgroundImage: `url(${resource.thumbnail_url})` }}
                      />
                      <div className="absolute inset-0 bg-white/40 mix-blend-overlay"></div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <i className="fa-solid fa-draw-polygon text-9xl text-black"></i>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white"></div>
                    </>
                  )}
                  <div className="absolute top-3 right-3 size-10 rounded-full bg-[#A05245] text-white flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-file-pdf text-xl"></i>
                  </div>
                  <div className="absolute inset-0 bg-[#A05245]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-sm">
                    <Download className="text-4xl text-white mb-1" />
                    <span className="text-white font-bold uppercase text-sm tracking-widest border-b border-white pb-1">
                      {t('kids.download', 'Descargar')}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-bold text-gray-200 group-hover:text-[#A05245] transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 w-full">
              {t('kids.no_pdfs', 'No hay recursos descargables disponibles')}
            </div>
          )}
        </div>
      </section>

      {/* El Pequeño Imaginer Section */}
      <section className="relative z-10 pb-20 pl-4 md:pl-12 pt-16 bg-gradient-to-b from-[#252525] to-black">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide flex items-center gap-3">
            {t('kids.little_imaginer', 'EL PEQUEÑO IMAGINERO')}
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent mr-12"></span>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-12 pr-6 md:pr-12 hide-scrollbar snap-x">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="group relative shrink-0 w-[280px] md:w-[320px] snap-start cursor-pointer"
                onClick={() => handleProductClick(product.id)}
              >
                <div className="aspect-[4/5] w-full rounded-xl overflow-hidden relative shadow-2xl border border-white/10 bg-[#151515]">
                  {product.image_url ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${product.image_url})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#151515]"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <i className="fa-solid fa-palette text-8xl text-white"></i>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    className="absolute top-4 right-4 bg-white text-[#A05245] p-3 rounded-full shadow-lg z-20 hover:bg-[#A05245] hover:text-white transition-colors"
                  >
                    <ShoppingBag className="text-[22px]" />
                  </button>
                  <div className="absolute bottom-0 w-full p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    {product.badge_text && (
                      <span className={`inline-block px-2 py-0.5 rounded ${product.badge_color || 'bg-[#A05245]'} text-[10px] font-bold uppercase tracking-wider text-white mb-2 shadow-md`}>
                        {product.badge_text}
                      </span>
                    )}
                    <h3 className="text-2xl font-bold text-white leading-tight mb-1">{product.title}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2 backdrop-blur-sm border border-white/5">
                      <span className="text-lg font-bold text-[#A05245]">
                        {typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)} {product.currency}
                      </span>
                      {product.original_price && parseFloat(product.original_price || 0) > parseFloat(product.price || 0) && (
                        <span className="text-sm text-gray-500 line-through">
                          {typeof product.original_price === 'number' ? product.original_price.toFixed(2) : parseFloat(product.original_price || 0).toFixed(2)} {product.currency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 w-full">
              {t('kids.no_products', 'No hay productos disponibles')}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default SacrartKids;

