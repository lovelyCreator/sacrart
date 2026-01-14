import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Video as VideoIcon,
  Radio,
  Loader2,
  Tag,
  Subtitles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { liveArchiveVideoApi, LiveArchiveVideo } from '@/services/videoApi';
import { useAuth } from '@/contexts/AuthContext';
import LanguageTabs from '@/components/admin/LanguageTabs';
import TranslateButton from '@/components/admin/TranslateButton';

const LIVE_ARCHIVE_TAGS = ['directo', 'live', 'twitch', 'charla', 'q&a'];

const LiveArchiveManagement = () => {
  const { t, i18n } = useTranslation();
  const { locale: urlLocale } = useLocale();
  const { user } = useAuth();
  const [displayLocale] = useMemo(() => {
    const lang = i18n.language || urlLocale || 'en';
    return [lang.substring(0, 2) as 'en' | 'es' | 'pt'];
  }, [i18n.language, urlLocale]);
  
  const [archiveVideos, setArchiveVideos] = useState<LiveArchiveVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<LiveArchiveVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<LiveArchiveVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Language state for form
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(displayLocale);

  // Multilingual data structure
  interface MultilingualData {
    en: string;
    es: string;
    pt: string;
  }

  // Form state - multilingual
  const [videoMultilingual, setVideoMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
  });

  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [videoSection, setVideoSection] = useState<'current_season' | 'twitch_classics' | 'talks_questions' | null>(null);
  const [videoStatus, setVideoStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [videoVisibility, setVideoVisibility] = useState<'freemium' | 'premium' | 'exclusive'>('freemium');
  const [bunnyEmbedUrl, setBunnyEmbedUrl] = useState('');
  const [bunnyVideoId, setBunnyVideoId] = useState('');
  const [bunnyThumbnailUrl, setBunnyThumbnailUrl] = useState('');
  const [processingTranscription, setProcessingTranscription] = useState<Record<number, boolean>>({});
  const [selectedVideoForTranscription, setSelectedVideoForTranscription] = useState<number | null>(null);
  const [transcriptionDialogOpen, setTranscriptionDialogOpen] = useState(false);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState<'en' | 'es' | 'pt'>('en');


  // Helper function to get image URL
  const getImageUrl = (src: string | null | undefined): string | null => {
    if (!src || !src.trim()) return null;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL;
    return `${baseUrl.replace('/api', '')}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  // Format duration
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = archiveVideos.filter(video => {
        const title = video.title || '';
        const description = video.description || '';
        const tags = (video.tags || []).join(' ');
        return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tags.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredVideos(filtered);
    } else {
      setFilteredVideos(archiveVideos);
    }
  }, [searchTerm, archiveVideos]);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await liveArchiveVideoApi.getAll({ per_page: 1000 });
      if (response.success) {
        const videosData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        
        setArchiveVideos(videosData);
        setFilteredVideos(videosData);
      }
    } catch (error: any) {
      console.error('Failed to fetch live archive videos:', error);
      toast.error(error.message || 'Failed to fetch live archive videos');
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddVideo = () => {
    setSelectedVideo(null);
    setVideoMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
    });
    setVideoTags([]); // Start with no tags
    setVideoSection('current_season'); // Default to current season
    setVideoStatus('published');
    setVideoVisibility('freemium');
    setBunnyEmbedUrl('');
    setBunnyVideoId('');
    setBunnyThumbnailUrl('');
    setContentLocale(displayLocale);
    setIsVideoDialogOpen(true);
  };

  const handleEditVideo = (video: LiveArchiveVideo) => {
    setSelectedVideo(video);
    
    // Extract translations from video
    const translations = video.translations || {};
    setVideoMultilingual({
      title: {
        en: translations.title?.en || video.title || '',
        es: translations.title?.es || '',
        pt: translations.title?.pt || '',
      },
      description: {
        en: translations.description?.en || video.description || '',
        es: translations.description?.es || '',
        pt: translations.description?.pt || '',
      },
    });
    
    setVideoTags(video.tags || []);
    setVideoSection((video as any).section || 'current_season');
    setVideoStatus(video.status);
    setVideoVisibility(video.visibility);
    setBunnyEmbedUrl(video.bunny_embed_url || '');
    setBunnyVideoId(video.bunny_video_id || '');
    setBunnyThumbnailUrl(video.bunny_thumbnail_url || '');
    setContentLocale(displayLocale);
    setIsVideoDialogOpen(true);
  };

  const handleSaveVideo = async () => {
    // Validate required fields
    if (!videoMultilingual.title.en?.trim()) {
      toast.error('Title in English is required');
      return;
    }

    if (!bunnyEmbedUrl.trim()) {
      toast.error('Bunny.net embed URL is required');
      return;
    }

    if (!videoSection) {
      toast.error('Section is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        title: videoMultilingual.title.en, // Default to English
        description: videoMultilingual.description.en || null,
        tags: videoTags,
        section: videoSection,
        status: videoStatus,
        visibility: videoVisibility,
        bunny_embed_url: bunnyEmbedUrl.trim(),
        is_free: true,
        // Include multilingual translations
        translations: {
          title: videoMultilingual.title,
          description: videoMultilingual.description,
        },
      };

      // Add optional Bunny.net fields
      if (bunnyVideoId.trim()) {
        payload.bunny_video_id = bunnyVideoId.trim();
      }
      if (bunnyThumbnailUrl.trim()) {
        payload.bunny_thumbnail_url = bunnyThumbnailUrl.trim();
      }

      let response;
      if (selectedVideo && selectedVideo.id) {
        // Update existing video
        response = await liveArchiveVideoApi.update(selectedVideo.id, payload);
      } else {
        // Create new video
        response = await liveArchiveVideoApi.create(payload);
      }

      if (response.success) {
        const isNewVideo = !selectedVideo || !selectedVideo.id;
        toast.success(isNewVideo ? 'Video created and added to archive' : 'Video updated successfully');
        setIsVideoDialogOpen(false);
        setSelectedVideo(null);
        fetchVideos();
      } else {
        const isNewVideo = !selectedVideo || !selectedVideo.id;
        toast.error(response.message || (isNewVideo ? 'Failed to create video' : 'Failed to update video'));
      }
    } catch (error: any) {
      console.error('Failed to save video:', error);
      toast.error(error.message || 'Failed to save video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (video: LiveArchiveVideo) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) {
      return;
    }

    try {
      const response = await liveArchiveVideoApi.delete(video.id);
      if (response.success) {
        toast.success('Live archive video deleted successfully');
        fetchVideos();
      } else {
        toast.error('Failed to delete video');
      }
    } catch (error: any) {
      console.error('Failed to delete video:', error);
      toast.error(error.message || 'Failed to delete video');
    }
  };

  const handleToggleStatus = async (video: LiveArchiveVideo) => {
    const newStatus = video.status === 'published' ? 'draft' : 'published';
    try {
      const response = await liveArchiveVideoApi.update(video.id, {
        status: newStatus,
      });
      if (response.success) {
        toast.success(`Video ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        fetchVideos();
      }
    } catch (error: any) {
      console.error('Failed to toggle status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleProcessTranscription = async (videoId: number) => {
    setSelectedVideoForTranscription(videoId);
    setSelectedSourceLanguage('en');
    setTranscriptionDialogOpen(true);
  };

  const handleConfirmProcessTranscription = async () => {
    if (!selectedVideoForTranscription) return;

    setTranscriptionDialogOpen(false);
    setProcessingTranscription(prev => ({ ...prev, [selectedVideoForTranscription]: true }));

    try {
      const video = archiveVideos.find(v => v.id === selectedVideoForTranscription);
      if (!video || (!video.bunny_video_id && !video.bunny_embed_url)) {
        toast.error('Video does not have a Bunny.net video ID or embed URL');
        return;
      }

      const result = await liveArchiveVideoApi.processTranscription(
        selectedVideoForTranscription,
        ['en', 'es', 'pt'],
        selectedSourceLanguage
      );
      
      if (result.success) {
        toast.success(result.message || 'Transcription processing completed successfully!');
        fetchVideos();
      } else {
        toast.error(result.message || 'Failed to process transcription');
      }
    } catch (error: any) {
      console.error('Transcription processing error:', error);
      toast.error(error.message || 'An error occurred while processing transcription');
    } finally {
      setProcessingTranscription(prev => ({ ...prev, [selectedVideoForTranscription]: false }));
      setSelectedVideoForTranscription(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Archive Management</h2>
          <p className="text-muted-foreground">
            Manage live archive videos. These are separate videos specifically for the live archive page.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleAddVideo}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.live_archive_add_video')}
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.live_archive_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.live_archive_table_thumbnail')}</TableHead>
                <TableHead>{t('admin.live_archive_table_title')}</TableHead>
                <TableHead>{t('admin.live_archive_table_duration')}</TableHead>
                <TableHead>{t('admin.live_archive_table_status')}</TableHead>
                <TableHead>{t('admin.live_archive_table_section')}</TableHead>
                <TableHead>{t('admin.live_archive_table_views')}</TableHead>
                <TableHead className="text-right">{t('admin.live_archive_table_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('admin.live_archive_no_videos')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVideos.map((video) => {
                  const thumbnail = getImageUrl(
                    video.thumbnail_url || 
                    video.bunny_thumbnail_url
                  );

                  return (
                    <TableRow key={video.id}>
                      <TableCell>
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={video.title}
                            className="w-16 h-10 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                            <VideoIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={video.title || ''}>
                          {video.title || 'Untitled'}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(video.duration)}</TableCell>
                      <TableCell>
                        <Badge variant={video.status === 'published' ? 'default' : 'secondary'}>
                          {video.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(video as any).section ? (
                          <Badge variant="outline" className="text-xs">
                            {(video as any).section === 'current_season' && t('admin.live_archive_section_current_season_display')}
                            {(video as any).section === 'twitch_classics' && t('admin.live_archive_section_twitch_classics_display')}
                            {(video as any).section === 'talks_questions' && t('admin.live_archive_section_talks_display')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('admin.live_archive_section_none_display')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{(video.views || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('admin.live_archive_table_actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditVideo(video)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('admin.common_edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(video)}>
                              {video.status === 'published' ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  {t('admin.content_draft')}
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('admin.content_published')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleProcessTranscription(video.id)}
                              disabled={processingTranscription[video.id]}
                            >
                              {processingTranscription[video.id] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t('admin.processing_transcription', 'Processing...')}
                                </>
                              ) : (
                                <>
                                  <Subtitles className="mr-2 h-4 w-4" />
                                  {t('admin.process_captions_ai', 'Process Captions (AI)')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVideo(video)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('admin.common_delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={(open) => {
        setIsVideoDialogOpen(open);
        if (!open) {
          setSelectedVideo(null);
          setVideoMultilingual({
            title: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
          });
          setVideoTags([]);
          setVideoSection('current_season');
          setBunnyEmbedUrl('');
          setBunnyVideoId('');
          setBunnyThumbnailUrl('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVideo && selectedVideo.id ? t('admin.live_archive_edit_video') : t('admin.live_archive_add_video_title')}
            </DialogTitle>
            <DialogDescription>
              {selectedVideo && selectedVideo.id 
                ? t('admin.live_archive_edit_description')
                : t('admin.live_archive_add_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Language Tabs with Translate Button */}
            <div className="flex items-center justify-between mb-4">
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
              />
              <TranslateButton
                fields={{
                  title: videoMultilingual.title[contentLocale] || '',
                  description: videoMultilingual.description[contentLocale] || '',
                }}
                sourceLanguage={contentLocale}
                onTranslate={(translations) => {
                  setVideoMultilingual(prev => ({
                    title: {
                      en: translations.title?.en !== undefined ? translations.title.en : prev.title.en,
                      es: translations.title?.es !== undefined ? translations.title.es : prev.title.es,
                      pt: translations.title?.pt !== undefined ? translations.title.pt : prev.title.pt,
                    },
                    description: {
                      en: translations.description?.en !== undefined ? translations.description.en : prev.description.en,
                      es: translations.description?.es !== undefined ? translations.description.es : prev.description.es,
                      pt: translations.description?.pt !== undefined ? translations.description.pt : prev.description.pt,
                    },
                  }));
                }}
              />
            </div>

            <div>
              <Label htmlFor="title">
                {t('admin.live_archive_label_title')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={videoMultilingual.title[contentLocale] || ''}
                onChange={(e) => setVideoMultilingual({
                  ...videoMultilingual,
                  title: { ...videoMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={t('admin.live_archive_placeholder_title', { locale: contentLocale.toUpperCase() })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">{t('admin.live_archive_label_description')}</Label>
              <Textarea
                id="description"
                value={videoMultilingual.description[contentLocale] || ''}
                onChange={(e) => setVideoMultilingual({
                  ...videoMultilingual,
                  description: { ...videoMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={t('admin.live_archive_placeholder_description', { locale: contentLocale.toUpperCase() })}
                rows={4}
              />
            </div>
            
            {/* Bunny.net Video Settings */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">{t('admin.live_archive_bunny_settings_title')}</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bunnyEmbedUrl">
                    {t('admin.live_archive_label_bunny_embed_url')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bunnyEmbedUrl"
                    value={bunnyEmbedUrl}
                    onChange={(e) => setBunnyEmbedUrl(e.target.value)}
                    placeholder={t('admin.live_archive_placeholder_bunny_embed')}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.live_archive_bunny_embed_help')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bunnyVideoId">{t('admin.live_archive_label_bunny_video_id')}</Label>
                    <Input
                      id="bunnyVideoId"
                      value={bunnyVideoId}
                      onChange={(e) => setBunnyVideoId(e.target.value)}
                      placeholder={t('admin.live_archive_placeholder_bunny_video_id')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bunnyThumbnailUrl">{t('admin.live_archive_label_thumbnail_url')}</Label>
                    <Input
                      id="bunnyThumbnailUrl"
                      value={bunnyThumbnailUrl}
                      onChange={(e) => setBunnyThumbnailUrl(e.target.value)}
                      placeholder={t('admin.live_archive_placeholder_thumbnail')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{t('admin.live_archive_label_section')}</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('admin.live_archive_section_description')}
                </p>
                <div className="space-y-3">
                  {/* Esta Temporada Section */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      id="section_current_season"
                      name="section"
                      value="current_season"
                      checked={videoSection === 'current_season'}
                      onChange={(e) => setVideoSection(e.target.value as 'current_season')}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <label htmlFor="section_current_season" className="font-medium cursor-pointer">
                        {t('admin.live_archive_section_current_season')}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.live_archive_section_current_season_desc')}
                      </p>
                    </div>
                  </div>

                  {/* Twitch Classics Section */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      id="section_twitch_classics"
                      name="section"
                      value="twitch_classics"
                      checked={videoSection === 'twitch_classics'}
                      onChange={(e) => setVideoSection(e.target.value as 'twitch_classics')}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <label htmlFor="section_twitch_classics" className="font-medium cursor-pointer">
                        {t('admin.live_archive_section_twitch_classics')}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.live_archive_section_twitch_classics_desc')}
                      </p>
                    </div>
                  </div>

                  {/* Charlas y Preguntas Section */}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      id="section_talks"
                      name="section"
                      value="talks_questions"
                      checked={videoSection === 'talks_questions'}
                      onChange={(e) => setVideoSection(e.target.value as 'talks_questions')}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <label htmlFor="section_talks" className="font-medium cursor-pointer">
                        {t('admin.live_archive_section_talks')}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.live_archive_section_talks_desc')}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>
              {t('admin.live_archive_button_cancel')}
            </Button>
            <Button onClick={handleSaveVideo} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedVideo && selectedVideo.id ? t('admin.live_archive_button_saving') : t('admin.live_archive_button_creating')}
                </>
              ) : (
                selectedVideo && selectedVideo.id ? t('admin.live_archive_button_save') : t('admin.live_archive_button_create')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveArchiveManagement;
