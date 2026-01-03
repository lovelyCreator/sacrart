import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Video as VideoIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { rewindApi, videoApi, Rewind, Video } from '@/services/videoApi';
import FileUpload from '@/components/admin/FileUpload';
import LanguageTabs from '@/components/admin/LanguageTabs';

interface MultilingualData {
  en: string;
  es: string;
  pt: string;
}

const RewindsManagement = () => {
  const { t, i18n } = useTranslation();
  const { locale: urlLocale } = useLocale();
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(urlLocale as 'en' | 'es' | 'pt' || 'en');
  const [rewinds, setRewinds] = useState<Rewind[]>([]);
  const [filteredRewinds, setFilteredRewinds] = useState<Rewind[]>([]);
  const [selectedRewind, setSelectedRewind] = useState<Rewind | null>(null);
  const [availableVideos, setAvailableVideos] = useState<Video[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Multilingual state for rewinds
  const [rewindMultilingual, setRewindMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
    short_description: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    short_description: { en: '', es: '', pt: '' },
  });

  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = import.meta.env.VITE_SERVER_BASE_URL || '';
    return baseUrl ? `${baseUrl}/${imagePath}` : imagePath;
  };

  useEffect(() => {
    fetchRewinds();
    fetchAvailableVideos();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = rewinds.filter(rewind =>
        rewind.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rewind.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRewinds(filtered);
    } else {
      setFilteredRewinds(rewinds);
    }
  }, [searchTerm, rewinds]);

  const fetchRewinds = async () => {
    try {
      setIsLoading(true);
      const response = await rewindApi.getAll({ per_page: 1000 });
      
      if (response.success) {
        const rewindsData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        setRewinds(rewindsData);
        setFilteredRewinds(rewindsData);
      }
    } catch (error: any) {
      console.error('Error fetching rewinds:', error);
      toast.error(error.message || 'Failed to load rewinds');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      const response = await videoApi.getAll({ per_page: 1000, status: 'published' });
      if (response.success) {
        const videosData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        setAvailableVideos(videosData);
      }
    } catch (error: any) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleOpenDialog = async (rewind?: Rewind) => {
    if (rewind) {
      // Fetch full rewind with videos
      try {
        const response = await rewindApi.get(rewind.id);
        if (response.success) {
          const fullRewind = response.data;
          setSelectedRewind(fullRewind);
          setSelectedVideoIds(fullRewind.videos?.map(v => v.id) || []);
          
          // Load translations
          if (fullRewind.translations && fullRewind.translations.title && fullRewind.translations.description) {
            setRewindMultilingual({
              title: {
                en: fullRewind.translations.title.en || (fullRewind as any).title_en || fullRewind.title || '',
                es: fullRewind.translations.title.es || (fullRewind as any).title_es || '',
                pt: fullRewind.translations.title.pt || (fullRewind as any).title_pt || '',
              },
              description: {
                en: fullRewind.translations.description.en || (fullRewind as any).description_en || fullRewind.description || '',
                es: fullRewind.translations.description.es || (fullRewind as any).description_es || '',
                pt: fullRewind.translations.description.pt || (fullRewind as any).description_pt || '',
              },
              short_description: {
                en: fullRewind.translations.short_description.en || (fullRewind as any).short_description_en || fullRewind.short_description || '',
                es: fullRewind.translations.short_description.es || (fullRewind as any).short_description_es || '',
                pt: fullRewind.translations.short_description.pt || (fullRewind as any).short_description_pt || '',
              },
            });
          } else {
            setRewindMultilingual({
              title: {
                en: (fullRewind as any).title_en || fullRewind.title || '',
                es: (fullRewind as any).title_es || '',
                pt: (fullRewind as any).title_pt || '',
              },
              description: {
                en: (fullRewind as any).description_en || fullRewind.description || '',
                es: (fullRewind as any).description_es || '',
                pt: (fullRewind as any).description_pt || '',
              },
              short_description: {
                en: (fullRewind as any).short_description_en || fullRewind.short_description || '',
                es: (fullRewind as any).short_description_es || '',
                pt: (fullRewind as any).short_description_pt || '',
              },
            });
          }
        } else {
          setSelectedRewind({ ...rewind });
          setSelectedVideoIds([]);
          setRewindMultilingual({
            title: { en: rewind.title || '', es: '', pt: '' },
            description: { en: rewind.description || '', es: '', pt: '' },
            short_description: { en: rewind.short_description || '', es: '', pt: '' },
          });
        }
      } catch (error) {
        setSelectedRewind({ ...rewind });
        setSelectedVideoIds([]);
        setRewindMultilingual({
          title: { en: rewind.title || '', es: '', pt: '' },
          description: { en: rewind.description || '', es: '', pt: '' },
          short_description: { en: rewind.short_description || '', es: '', pt: '' },
        });
      }
    } else {
      setSelectedRewind({
        id: 0,
        title: '',
        year: new Date().getFullYear(),
        slug: '',
        description: '',
        short_description: '',
        visibility: 'freemium',
        status: 'draft',
        is_free: true,
        video_count: 0,
        total_duration: 0,
        total_views: 0,
        rating: '0',
        rating_count: 0,
        is_featured: false,
        sort_order: 0,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Rewind);
      setRewindMultilingual({
        title: { en: '', es: '', pt: '' },
        description: { en: '', es: '', pt: '' },
        short_description: { en: '', es: '', pt: '' },
      });
      setSelectedVideoIds([]);
    }
    setIsDialogOpen(true);
  };

  const handleSaveRewind = async () => {
    if (!selectedRewind) return;

    if (!rewindMultilingual.title.en?.trim()) {
      toast.error('Title (English) is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        title: rewindMultilingual.title.en,
        year: selectedRewind.year || null,
        description: rewindMultilingual.description.en || null,
        short_description: rewindMultilingual.short_description.en || null,
        thumbnail: selectedRewind.thumbnail || null,
        cover_image: selectedRewind.cover_image || null,
        trailer_url: selectedRewind.trailer_url || null,
        visibility: selectedRewind.visibility,
        status: selectedRewind.status,
        is_free: selectedRewind.is_free ?? true,
        price: selectedRewind.price || null,
        tags: selectedRewind.tags || [],
        sort_order: selectedRewind.sort_order || 0,
        is_featured: selectedRewind.is_featured || false,
        meta_title: selectedRewind.meta_title || null,
        meta_description: selectedRewind.meta_description || null,
        meta_keywords: selectedRewind.meta_keywords || null,
        video_ids: selectedVideoIds,
        translations: rewindMultilingual,
      };

      let response;
      if (selectedRewind.id) {
        response = await rewindApi.update(selectedRewind.id, payload);
      } else {
        response = await rewindApi.create(payload);
      }

      if (response.success) {
        const savedRewind = response.data;
        
        // Ensure translations are loaded for the saved rewind
        if (savedRewind && !savedRewind.translations) {
          if (savedRewind.title_en || savedRewind.title_es || savedRewind.title_pt) {
            savedRewind.translations = {
              title: {
                en: savedRewind.title_en || savedRewind.title || '',
                es: savedRewind.title_es || '',
                pt: savedRewind.title_pt || '',
              },
              description: {
                en: savedRewind.description_en || savedRewind.description || '',
                es: savedRewind.description_es || '',
                pt: savedRewind.description_pt || '',
              },
              short_description: {
                en: savedRewind.short_description_en || savedRewind.short_description || '',
                es: savedRewind.short_description_es || '',
                pt: savedRewind.short_description_pt || '',
              },
            };
          }
        }
        
        if (selectedRewind.id) {
          // Update existing rewind in state
          const updatedRewind = { ...savedRewind };
          setRewinds(prev => prev.map(r => r.id === selectedRewind.id ? updatedRewind : r));
          setFilteredRewinds(prev => prev.map(r => r.id === selectedRewind.id ? updatedRewind : r));
          toast.success('Rewind updated successfully');
        } else {
          // Add new rewind to state
          const newRewind = { ...savedRewind };
          setRewinds(prev => [newRewind, ...prev]);
          setFilteredRewinds(prev => [newRewind, ...prev]);
          toast.success('Rewind created successfully');
        }
        
        setIsDialogOpen(false);
        setSelectedRewind(null);
        setSelectedVideoIds([]);
        setRewindMultilingual({
          title: { en: '', es: '', pt: '' },
          description: { en: '', es: '', pt: '' },
          short_description: { en: '', es: '', pt: '' },
        });
      } else {
        toast.error(response.message || 'Failed to save rewind');
      }
    } catch (error: any) {
      console.error('Error saving rewind:', error);
      toast.error(error.message || 'Failed to save rewind');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRewind = async (rewindId: number) => {
    if (!confirm('Are you sure you want to delete this rewind?')) {
      return;
    }

    try {
      const response = await rewindApi.delete(rewindId);
      if (response.success) {
        toast.success('Rewind deleted successfully');
        await fetchRewinds();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete rewind');
    }
  };

  const handleToggleStatus = async (rewind: Rewind) => {
    const newStatus = rewind.status === 'published' ? 'draft' : 'published';
    try {
      const response = await rewindApi.update(rewind.id, { status: newStatus });
      if (response.success) {
        toast.success(`Rewind ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        await fetchRewinds();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rewind status');
    }
  };

  const handleToggleVideo = (videoId: number) => {
    setSelectedVideoIds(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rewinds Management</h1>
          <p className="text-muted-foreground">Manage your rewind collections</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Rewind
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search rewinds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Videos</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredRewinds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No rewinds found
                </TableCell>
              </TableRow>
            ) : (
              filteredRewinds.map((rewind) => (
                <TableRow key={rewind.id}>
                  <TableCell className="font-medium">{rewind.title}</TableCell>
                  <TableCell>{rewind.year || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={rewind.status === 'published' ? 'default' : 'secondary'}>
                      {rewind.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rewind.visibility}</Badge>
                  </TableCell>
                  <TableCell>{rewind.video_count || 0}</TableCell>
                  <TableCell>{rewind.total_views || 0}</TableCell>
                  <TableCell>
                    {rewind.is_featured ? (
                      <Badge variant="default">Featured</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenDialog(rewind)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(rewind)}>
                          {rewind.status === 'published' ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRewind(rewind.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedRewind(null);
          setSelectedVideoIds([]);
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRewind?.id ? 'Edit Rewind' : 'Create New Rewind'}</DialogTitle>
            <DialogDescription>
              {selectedRewind?.id ? 'Update rewind information' : 'Fill in the details to create a new rewind collection'}
            </DialogDescription>
          </DialogHeader>
          {selectedRewind && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs */}
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
                className="mb-4"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={rewindMultilingual.title[contentLocale] || ''}
                    onChange={(e) => setRewindMultilingual({
                      ...rewindMultilingual,
                      title: { ...rewindMultilingual.title, [contentLocale]: e.target.value }
                    })}
                    placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={selectedRewind.year || ''}
                    onChange={(e) => setSelectedRewind({ ...selectedRewind, year: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={rewindMultilingual.description[contentLocale] || ''}
                  onChange={(e) => setRewindMultilingual({
                    ...rewindMultilingual,
                    description: { ...rewindMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={rewindMultilingual.short_description[contentLocale] || ''}
                  onChange={(e) => setRewindMultilingual({
                    ...rewindMultilingual,
                    short_description: { ...rewindMultilingual.short_description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter short description in ${contentLocale.toUpperCase()}`}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coverImage">Cover Image URL</Label>
                  <Input
                    id="coverImage"
                    value={selectedRewind.cover_image || ''}
                    onChange={(e) => setSelectedRewind({ ...selectedRewind, cover_image: e.target.value })}
                    placeholder="https://vz-xxx.b-cdn.net/cover.jpg"
                  />
                  {selectedRewind.cover_image && (
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img 
                        src={selectedRewind.cover_image} 
                        alt="Cover preview" 
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL</Label>
                  <Input
                    id="thumbnail"
                    value={selectedRewind.thumbnail || ''}
                    onChange={(e) => setSelectedRewind({ ...selectedRewind, thumbnail: e.target.value })}
                    placeholder="https://vz-xxx.b-cdn.net/thumbnail.jpg"
                  />
                  {selectedRewind.thumbnail && (
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <img 
                        src={selectedRewind.thumbnail} 
                        alt="Thumbnail preview" 
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Select Videos</h3>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
                  {availableVideos.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No videos available</p>
                  ) : (
                    availableVideos.map((video) => (
                      <div key={video.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`video-${video.id}`}
                          checked={selectedVideoIds.includes(video.id)}
                          onCheckedChange={() => handleToggleVideo(video.id)}
                        />
                        <Label
                          htmlFor={`video-${video.id}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {video.title}
                          {video.duration && (
                            <span className="text-muted-foreground text-xs ml-2">
                              ({Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedVideoIds.length} video(s)
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedRewind.status}
                      onValueChange={(value: any) => setSelectedRewind({ ...selectedRewind, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={selectedRewind.visibility}
                      onValueChange={(value: any) => setSelectedRewind({ ...selectedRewind, visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freemium">Freemium</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={selectedRewind.sort_order || 0}
                      onChange={(e) => setSelectedRewind({ ...selectedRewind, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFeatured"
                        checked={selectedRewind.is_featured || false}
                        onCheckedChange={(checked) => setSelectedRewind({ ...selectedRewind, is_featured: !!checked })}
                      />
                      <Label htmlFor="isFeatured" className="cursor-pointer">
                        Featured
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveRewind} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedRewind?.id ? 'Save Changes' : 'Create Rewind')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewindsManagement;

