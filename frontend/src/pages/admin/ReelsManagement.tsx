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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Video as VideoIcon,
  Folder,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { reelApi, reelCategoryApi, Reel, ReelCategory } from '@/services/videoApi';
import LanguageTabs from '@/components/admin/LanguageTabs';

interface MultilingualData {
  en: string;
  es: string;
  pt: string;
}

const ReelsManagement = () => {
  const { t, i18n } = useTranslation();
  const { locale: urlLocale } = useLocale();
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(urlLocale as 'en' | 'es' | 'pt' || 'en');
  const [activeTab, setActiveTab] = useState<'reels' | 'categories'>('reels');
  
  const [reels, setReels] = useState<Reel[]>([]);
  const [filteredReels, setFilteredReels] = useState<Reel[]>([]);
  const [categories, setCategories] = useState<ReelCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ReelCategory[]>([]);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ReelCategory | null>(null);
  const [isReelDialogOpen, setIsReelDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Multilingual state for reels
  const [reelMultilingual, setReelMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
    short_description: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    short_description: { en: '', es: '', pt: '' },
  });

  // Multilingual state for categories
  const [categoryMultilingual, setCategoryMultilingual] = useState<{
    name: MultilingualData;
    description: MultilingualData;
  }>({
    name: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
  });

  useEffect(() => {
    fetchReels();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      if (activeTab === 'reels') {
        const filtered = reels.filter(reel =>
          reel.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reel.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reel.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredReels(filtered);
      } else {
        const filtered = categories.filter(cat =>
          cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCategories(filtered);
      }
    } else {
      setFilteredReels(reels);
      setFilteredCategories(categories);
    }
  }, [searchTerm, reels, categories, activeTab]);

  const fetchReels = async () => {
    try {
      const response = await reelApi.getAll({ per_page: 1000 });
      if (response.success) {
        const reelsData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        
        // Load translations for each reel
        const reelsWithTranslations = reelsData.map((reel: any) => {
          if (!reel.translations && (reel.title_en || reel.title_es || reel.title_pt)) {
            reel.translations = {
              title: {
                en: reel.title_en || reel.title || '',
                es: reel.title_es || '',
                pt: reel.title_pt || '',
              },
              description: {
                en: reel.description_en || reel.description || '',
                es: reel.description_es || '',
                pt: reel.description_pt || '',
              },
              short_description: {
                en: reel.short_description_en || reel.short_description || '',
                es: reel.short_description_es || '',
                pt: reel.short_description_pt || '',
              },
            };
          }
          return reel;
        });
        
        setReels(reelsWithTranslations);
        setFilteredReels(reelsWithTranslations);
      }
    } catch (error: any) {
      console.error('Error fetching reels:', error);
      toast.error(error.message || 'Failed to load reels');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await reelCategoryApi.getAll({ per_page: 1000 });
      if (response.success) {
        const categoriesData = Array.isArray(response.data?.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];
        
        // Load translations for each category
        const categoriesWithTranslations = categoriesData.map((cat: any) => {
          if (!cat.translations && (cat.name_en || cat.name_es || cat.name_pt)) {
            cat.translations = {
              name: {
                en: cat.name_en || cat.name || '',
                es: cat.name_es || '',
                pt: cat.name_pt || '',
              },
              description: {
                en: cat.description_en || cat.description || '',
                es: cat.description_es || '',
                pt: cat.description_pt || '',
              },
            };
          }
          return cat;
        });
        
        setCategories(categoriesWithTranslations);
        setFilteredCategories(categoriesWithTranslations);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error(error.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReelDialog = async (reel?: Reel) => {
    if (reel) {
      // Fetch full reel with translations
      try {
        const response = await reelApi.get(reel.id);
        if (response.success) {
          const fullReel = response.data;
          setSelectedReel(fullReel);
          
          // Set multilingual data from translations or individual fields
          if (fullReel.translations) {
            setReelMultilingual(fullReel.translations);
          } else {
            setReelMultilingual({
              title: {
                en: (fullReel as any).title_en || fullReel.title || '',
                es: (fullReel as any).title_es || '',
                pt: (fullReel as any).title_pt || '',
              },
              description: {
                en: (fullReel as any).description_en || fullReel.description || '',
                es: (fullReel as any).description_es || '',
                pt: (fullReel as any).description_pt || '',
              },
              short_description: {
                en: (fullReel as any).short_description_en || fullReel.short_description || '',
                es: (fullReel as any).short_description_es || '',
                pt: (fullReel as any).short_description_pt || '',
              },
            });
          }
        } else {
          setSelectedReel({ ...reel });
          setReelMultilingual({
            title: { en: reel.title || '', es: '', pt: '' },
            description: { en: reel.description || '', es: '', pt: '' },
            short_description: { en: reel.short_description || '', es: '', pt: '' },
          });
        }
      } catch (error) {
        setSelectedReel({ ...reel });
        setReelMultilingual({
          title: { en: reel.title || '', es: '', pt: '' },
          description: { en: reel.description || '', es: '', pt: '' },
          short_description: { en: reel.short_description || '', es: '', pt: '' },
        });
      }
    } else {
      setSelectedReel({
        id: 0,
        title: '',
        slug: '',
        description: '',
        short_description: '',
        visibility: 'freemium',
        status: 'draft',
        is_free: true,
        category_id: null,
        tags: [],
        sort_order: 0,
        views: 0,
        unique_views: 0,
        rating: '0',
        rating_count: 0,
        duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Reel);
      setReelMultilingual({
        title: { en: '', es: '', pt: '' },
        description: { en: '', es: '', pt: '' },
        short_description: { en: '', es: '', pt: '' },
      });
    }
    setIsReelDialogOpen(true);
  };

  const handleOpenCategoryDialog = (category?: ReelCategory) => {
    if (category) {
      setSelectedCategory({ ...category });
      if (category.translations && category.translations.name && category.translations.description) {
        // Ensure all language keys exist
        setCategoryMultilingual({
          name: {
            en: category.translations.name.en || (category as any).name_en || category.name || '',
            es: category.translations.name.es || (category as any).name_es || '',
            pt: category.translations.name.pt || (category as any).name_pt || '',
          },
          description: {
            en: category.translations.description.en || (category as any).description_en || category.description || '',
            es: category.translations.description.es || (category as any).description_es || '',
            pt: category.translations.description.pt || (category as any).description_pt || '',
          },
        });
      } else {
        setCategoryMultilingual({
          name: {
            en: (category as any).name_en || category.name || '',
            es: (category as any).name_es || '',
            pt: (category as any).name_pt || '',
          },
          description: {
            en: (category as any).description_en || category.description || '',
            es: (category as any).description_es || '',
            pt: (category as any).description_pt || '',
          },
        });
      }
    } else {
      setSelectedCategory({
        id: 0,
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '',
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ReelCategory);
      setCategoryMultilingual({
        name: { en: '', es: '', pt: '' },
        description: { en: '', es: '', pt: '' },
      });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveReel = async () => {
    if (!selectedReel) return;

    if (!reelMultilingual.title.en?.trim()) {
      toast.error('Title (English) is required');
      return;
    }

    if (!selectedReel.bunny_embed_url?.trim() && !selectedReel.video_url?.trim()) {
      toast.error('Bunny Embed URL or Video URL is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        title: reelMultilingual.title.en,
        description: reelMultilingual.description.en || null,
        short_description: reelMultilingual.short_description.en || null,
        bunny_embed_url: selectedReel.bunny_embed_url || null,
        bunny_video_id: selectedReel.bunny_video_id || null,
        bunny_video_url: selectedReel.bunny_video_url || null,
        bunny_thumbnail_url: selectedReel.bunny_thumbnail_url || null,
        video_url: selectedReel.video_url || null,
        thumbnail: selectedReel.thumbnail || null,
        intro_image: selectedReel.intro_image || null,
        visibility: selectedReel.visibility,
        status: selectedReel.status,
        is_free: selectedReel.is_free ?? true,
        price: selectedReel.price || null,
        category_id: selectedReel.category_id || null,
        category_tag: selectedReel.category_tag || null,
        tags: selectedReel.tags || [],
        sort_order: selectedReel.sort_order || 0,
        meta_title: selectedReel.meta_title || null,
        meta_description: selectedReel.meta_description || null,
        meta_keywords: selectedReel.meta_keywords || null,
        translations: reelMultilingual,
      };

      let response;
      if (selectedReel.id) {
        response = await reelApi.update(selectedReel.id, payload);
      } else {
        response = await reelApi.create(payload);
      }

      if (response.success) {
        toast.success(selectedReel.id ? 'Reel updated successfully' : 'Reel created successfully');
        await fetchReels();
        setIsReelDialogOpen(false);
        setSelectedReel(null);
        setReelMultilingual({
          title: { en: '', es: '', pt: '' },
          description: { en: '', es: '', pt: '' },
          short_description: { en: '', es: '', pt: '' },
        });
      } else {
        toast.error(response.message || 'Failed to save reel');
      }
    } catch (error: any) {
      console.error('Error saving reel:', error);
      toast.error(error.message || 'Failed to save reel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;

    if (!categoryMultilingual.name.en?.trim()) {
      toast.error('Category name (English) is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: categoryMultilingual.name.en,
        description: categoryMultilingual.description.en || null,
        icon: selectedCategory.icon || null,
        color: selectedCategory.color || null,
        sort_order: selectedCategory.sort_order || 0,
        is_active: selectedCategory.is_active ?? true,
        translations: categoryMultilingual,
      };

      let response;
      if (selectedCategory.id) {
        response = await reelCategoryApi.update(selectedCategory.id, payload);
      } else {
        response = await reelCategoryApi.create(payload);
      }

      if (response.success) {
        toast.success(selectedCategory.id ? 'Category updated successfully' : 'Category created successfully');
        await fetchCategories();
        setIsCategoryDialogOpen(false);
        setSelectedCategory(null);
        setCategoryMultilingual({
          name: { en: '', es: '', pt: '' },
          description: { en: '', es: '', pt: '' },
        });
      } else {
        toast.error(response.message || 'Failed to save category');
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReel = async (reelId: number) => {
    if (!confirm('Are you sure you want to delete this reel?')) {
      return;
    }

    try {
      const response = await reelApi.delete(reelId);
      if (response.success) {
        toast.success('Reel deleted successfully');
        await fetchReels();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete reel');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await reelCategoryApi.delete(categoryId);
      if (response.success) {
        toast.success('Category deleted successfully');
        await fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleToggleStatus = async (reel: Reel) => {
    const newStatus = reel.status === 'published' ? 'draft' : 'published';
    try {
      const response = await reelApi.update(reel.id, { status: newStatus });
      if (response.success) {
        toast.success(`Reel ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        await fetchReels();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reel status');
    }
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
          <h1 className="text-3xl font-bold">Reels Management</h1>
          <p className="text-muted-foreground">Manage your reels and categories</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'reels' && (
            <Button onClick={() => handleOpenReelDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Reel
            </Button>
          )}
          {activeTab === 'categories' && (
            <Button onClick={() => handleOpenCategoryDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'reels' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reels')}
          className="flex items-center"
          size="sm"
        >
          <VideoIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Reels</span>
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('categories')}
          className="flex items-center"
          size="sm"
        >
          <Folder className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Categories</span>
        </Button>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={activeTab === 'reels' ? 'Search reels...' : 'Search categories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Reels Tab */}
      {activeTab === 'reels' && (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No reels found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReels.map((reel) => (
                    <TableRow key={reel.id}>
                      <TableCell className="font-medium">{reel.title}</TableCell>
                      <TableCell>
                        {reel.category ? (
                          <Badge variant="outline">{reel.category.name}</Badge>
                        ) : reel.category_tag ? (
                          <Badge variant="outline">{reel.category_tag}</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reel.status === 'published' ? 'default' : 'secondary'}>
                          {reel.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reel.visibility}</Badge>
                      </TableCell>
                      <TableCell>{reel.views || 0}</TableCell>
                      <TableCell>
                        {reel.duration ? `${Math.floor(reel.duration / 60)}:${String(reel.duration % 60).padStart(2, '0')}` : '-'}
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
                            <DropdownMenuItem onClick={() => handleOpenReelDialog(reel)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(reel)}>
                              {reel.status === 'published' ? (
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
                              onClick={() => handleDeleteReel(reel.id)}
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
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.icon || '-'}</TableCell>
                      <TableCell>
                        {category.color && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.color}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleOpenCategoryDialog(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteCategory(category.id)}
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
        </div>
      )}

      {/* Edit/Create Reel Dialog */}
      <Dialog open={isReelDialogOpen} onOpenChange={(open) => {
        setIsReelDialogOpen(open);
        if (!open) {
          setSelectedReel(null);
          setReelMultilingual({
            title: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
            short_description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReel?.id ? 'Edit Reel' : 'Create New Reel'}</DialogTitle>
            <DialogDescription>
              {selectedReel?.id ? 'Update reel information' : 'Fill in the details to create a new reel'}
            </DialogDescription>
          </DialogHeader>
          {selectedReel && (
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
                    value={reelMultilingual.title[contentLocale]}
                    onChange={(e) => setReelMultilingual({
                      ...reelMultilingual,
                      title: { ...reelMultilingual.title, [contentLocale]: e.target.value }
                    })}
                    placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={selectedReel.category_id ? selectedReel.category_id.toString() : 'none'}
                    onValueChange={(value) => setSelectedReel({ ...selectedReel, category_id: value && value !== 'none' ? parseInt(value) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={reelMultilingual.description[contentLocale]}
                  onChange={(e) => setReelMultilingual({
                    ...reelMultilingual,
                    description: { ...reelMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={reelMultilingual.short_description[contentLocale]}
                  onChange={(e) => setReelMultilingual({
                    ...reelMultilingual,
                    short_description: { ...reelMultilingual.short_description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter short description in ${contentLocale.toUpperCase()}`}
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Bunny.net Video Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bunnyEmbedUrl">
                      Bunny Embed URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bunnyEmbedUrl"
                      value={selectedReel.bunny_embed_url || ''}
                      onChange={(e) => setSelectedReel({ ...selectedReel, bunny_embed_url: e.target.value })}
                      placeholder="https://iframe.mediadelivery.net/embed/{library}/{video}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the Bunny.net embed URL. Duration will be auto-extracted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunnyVideoId">Bunny Video ID (optional)</Label>
                    <Input
                      id="bunnyVideoId"
                      value={selectedReel.bunny_video_id || ''}
                      onChange={(e) => setSelectedReel({ ...selectedReel, bunny_video_id: e.target.value })}
                      placeholder="Video GUID from Bunny"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunnyThumbnailUrl">Thumbnail URL</Label>
                    <Input
                      id="bunnyThumbnailUrl"
                      value={selectedReel.bunny_thumbnail_url || ''}
                      onChange={(e) => setSelectedReel({ ...selectedReel, bunny_thumbnail_url: e.target.value })}
                      placeholder="https://vz-xxx.b-cdn.net/thumbnail.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedReel.status}
                      onValueChange={(value: any) => setSelectedReel({ ...selectedReel, status: value })}
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
                      value={selectedReel.visibility}
                      onValueChange={(value: any) => setSelectedReel({ ...selectedReel, visibility: value })}
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
                      value={selectedReel.sort_order || 0}
                      onChange={(e) => setSelectedReel({ ...selectedReel, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReelDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveReel} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedReel?.id ? 'Save Changes' : 'Create Reel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) {
          setSelectedCategory(null);
          setCategoryMultilingual({
            name: { en: '', es: '', pt: '' },
            description: { en: '', es: '', pt: '' },
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCategory?.id ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescription>
              {selectedCategory?.id ? 'Update category information' : 'Fill in the details to create a new category'}
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="grid gap-4 py-4">
              {/* Language Tabs */}
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
                className="mb-4"
              />

              <div className="space-y-2">
                <Label htmlFor="categoryName">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="categoryName"
                  value={categoryMultilingual.name[contentLocale] || ''}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    name: { ...categoryMultilingual.name, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter category name in ${contentLocale.toUpperCase()}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryMultilingual.description[contentLocale] || ''}
                  onChange={(e) => setCategoryMultilingual({
                    ...categoryMultilingual,
                    description: { ...categoryMultilingual.description, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={selectedCategory.icon || ''}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, icon: e.target.value })}
                    placeholder="e.g., ⚡, 🎨"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={selectedCategory.color || ''}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, color: e.target.value })}
                    placeholder="#A05245"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={selectedCategory.sort_order || 0}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={selectedCategory.is_active ?? true}
                      onChange={(e) => setSelectedCategory({ ...selectedCategory, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (selectedCategory?.id ? 'Save Changes' : 'Create Category')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReelsManagement;
