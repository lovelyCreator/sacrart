import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { settingsApi } from '@/services/settingsApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Youtube, Clock, Users, MessageCircle } from 'lucide-react';

const Live = () => {
  const { t } = useTranslation();
  const { navigateWithLocale, locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [liveSettings, setLiveSettings] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);

  // Extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Extract YouTube channel ID from URL
  const extractYouTubeChannelId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /youtube\.com\/channel\/([^\/\?&]+)/,
      /youtube\.com\/c\/([^\/\?&]+)/,
      /youtube\.com\/@([^\/\?&]+)/,
      /^([a-zA-Z0-9_-]+)$/ // Direct channel ID or handle
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  useEffect(() => {
    const fetchLiveSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsApi.getPublicSettings(locale);
        
        if (response.success && response.data) {
          const settings = response.data;
          const liveData = {
            videoUrl: settings.youtube_live_video_url || '',
            channelId: settings.youtube_channel_id || '',
            channelUrl: settings.youtube_channel_url || '',
            isEnabled: settings.youtube_live_enabled === 'true' || settings.youtube_live_enabled === true || settings.youtube_live_enabled === '1',
          };
          
          setLiveSettings(liveData);
          setIsLive(liveData.isEnabled && liveData.videoUrl);
        }
      } catch (error) {
        console.error('Error fetching live settings:', error);
        toast.error(t('live.error_loading', 'Failed to load live stream'));
      } finally {
        setLoading(false);
      }
    };

    fetchLiveSettings();
  }, [locale, t]);

  const videoId = liveSettings?.videoUrl ? extractYouTubeVideoId(liveSettings.videoUrl) : null;
  const channelId = liveSettings?.channelId ? extractYouTubeChannelId(liveSettings.channelId) : null;

  if (loading) {
    return (
      <main className="flex-1 w-full pt-0 bg-[#0a0a0a] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  // Not live - show message and link to archive
  if (!isLive || !videoId) {
    return (
      <main className="flex-1 w-full pt-20 bg-[#0a0a0a] min-h-screen">
        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-2xl">
                  <Youtube className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gray-800 rounded-full p-3 border-4 border-[#0a0a0a]">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('live.not_streaming', 'No estamos en directo ahora')}
              </h1>
              <p className="text-xl text-gray-400">
                {t('live.check_archive', 'Pero puedes ver nuestros directos anteriores en el archivo')}
              </p>
            </div>

            {/* YouTube Channel Link */}
            {liveSettings?.channelUrl && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <p className="text-gray-300 mb-4">
                  {t('live.subscribe_notification', 'Suscríbete a nuestro canal de YouTube para recibir notificaciones cuando iniciemos un directo')}
                </p>
                <a
                  href={liveSettings.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                  {t('live.visit_channel', 'Visitar Canal de YouTube')}
                </a>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={() => navigateWithLocale('/directos')}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-bold rounded-xl"
              >
                {t('live.view_archive', 'Ver Archivo de Directos')}
              </Button>
              <Button
                onClick={() => navigateWithLocale('/')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg font-bold rounded-xl"
              >
                {t('live.back_home', 'Volver al Inicio')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Live stream is active
  return (
    <main className="flex-1 w-full pt-16 bg-[#0a0a0a] min-h-screen">
      {/* Live Badge */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 py-3">
        <div className="container mx-auto px-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></span>
            <span className="text-white font-bold uppercase text-sm tracking-wider">
              {t('live.live_now', 'EN DIRECTO')}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-white/80 text-sm">
            <Users className="w-4 h-4" />
            <span>{t('live.watching_now', 'Viendo ahora')}</span>
          </div>
        </div>
      </div>

      {/* Video and Chat Container */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1800px] mx-auto">
          {/* Video Player - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
              <div className="relative" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Live Stream"
                />
              </div>
            </div>

            {/* Video Info */}
            <div className="mt-6 space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {t('live.stream_title', 'Directo de SACRART')}
              </h1>
              <p className="text-gray-400">
                {t('live.stream_description', 'Únete a nuestro directo y aprende técnicas de arte sacro en tiempo real. Participa en el chat y haz tus preguntas.')}
              </p>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => navigateWithLocale('/directos')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {t('live.view_past_streams', 'Ver directos anteriores')}
                </Button>
                {liveSettings?.channelUrl && (
                  <a
                    href={liveSettings.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Youtube className="w-4 h-4 mr-2" />
                      {t('live.subscribe', 'Suscribirse')}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Live Chat - Takes 1/3 on large screens */}
          <div className="lg:col-span-1">
            <div className="bg-[#18181b] rounded-xl overflow-hidden shadow-2xl h-full min-h-[600px]">
              <div className="bg-[#27272a] px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-white font-bold">
                    {t('live.live_chat', 'Chat en directo')}
                  </h2>
                </div>
              </div>
              <div className="relative h-[calc(100%-52px)]">
                <iframe
                  src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title="YouTube Live Chat"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive CTA */}
      <div className="container mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 rounded-2xl p-8 text-center max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-3">
            {t('live.missed_previous', '¿Te perdiste algún directo anterior?')}
          </h3>
          <p className="text-gray-300 mb-6">
            {t('live.archive_description', 'Revive todos nuestros directos pasados en el archivo')}
          </p>
          <Button
            onClick={() => navigateWithLocale('/directos')}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-bold"
          >
            {t('live.explore_archive', 'Explorar Archivo')}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Live;
