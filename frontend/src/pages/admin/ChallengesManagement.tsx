import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  Trophy,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import challengeApi, { Challenge } from '@/services/challengeApi';
import FileUpload from '@/components/admin/FileUpload';
import LanguageTabs from '@/components/admin/LanguageTabs';
import TranslateButton from '@/components/admin/TranslateButton';

const ChallengesManagement = () => {
  const { t, i18n } = useTranslation();
  const { locale: urlLocale } = useLocale();
  const displayLocale = (i18n.language || urlLocale || 'en').substring(0, 2) as 'en' | 'es' | 'pt';
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState<Record<number, any>>({});

  // Language state for form
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>(displayLocale);

  // Multilingual data structure
  interface MultilingualData {
    en: string;
    es: string;
    pt: string;
  }

  // Form state - multilingual
  const [challengeMultilingual, setChallengeMultilingual] = useState<{
    title: MultilingualData;
    description: MultilingualData;
    instructions: MultilingualData;
  }>({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    instructions: { en: '', es: '', pt: '' },
  });

  const [formData, setFormData] = useState({
    display_order: 0,
    is_active: true,
    is_featured: false,
    start_date: '',
    end_date: '',
    tags: [] as string[],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = challenges.filter(challenge =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredChallenges(filtered);
    } else {
      setFilteredChallenges(challenges);
    }
  }, [searchTerm, challenges]);

  const fetchChallenges = async () => {
    try {
      setIsLoading(true);
      const response = await challengeApi.admin.getAll({ per_page: 100 });
      if (response.success && response.data) {
        const challengesList = response.data.data || response.data;
        setChallenges(Array.isArray(challengesList) ? challengesList : []);
        
        // Fetch stats for each challenge
        const statsPromises = (Array.isArray(challengesList) ? challengesList : []).map((challenge: Challenge) =>
          challengeApi.admin.getStats(challenge.id).catch(() => null)
        );
        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<number, any> = {};
        statsResults.forEach((stat, index) => {
          if (stat && stat.success) {
            statsMap[challengesList[index].id] = stat.data;
          }
        });
        setStats(statsMap);
      }
    } catch (error: any) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (challenge?: Challenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      
      // Extract translations from challenge
      const translations = (challenge as any).translations || {};
      setChallengeMultilingual({
        title: {
          en: translations.title?.en || challenge.title_en || challenge.title || '',
          es: translations.title?.es || challenge.title_es || '',
          pt: translations.title?.pt || challenge.title_pt || '',
        },
        description: {
          en: translations.description?.en || challenge.description_en || challenge.description || '',
          es: translations.description?.es || challenge.description_es || '',
          pt: translations.description?.pt || challenge.description_pt || '',
        },
        instructions: {
          en: translations.instructions?.en || challenge.instructions_en || challenge.instructions || '',
          es: translations.instructions?.es || challenge.instructions_es || '',
          pt: translations.instructions?.pt || challenge.instructions_pt || '',
        },
      });
      
      setFormData({
        display_order: challenge.display_order || 0,
        is_active: challenge.is_active ?? true,
        is_featured: challenge.is_featured ?? false,
        start_date: challenge.start_date ? challenge.start_date.split('T')[0] : '',
        end_date: challenge.end_date ? challenge.end_date.split('T')[0] : '',
        tags: challenge.tags || [],
      });
      setImagePreview(challenge.image_url || null);
      setThumbnailPreview(challenge.thumbnail_url || null);
      setContentLocale(displayLocale);
    } else {
      setEditingChallenge(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setChallengeMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
      instructions: { en: '', es: '', pt: '' },
    });
    setFormData({
      display_order: 0,
      is_active: true,
      is_featured: false,
      start_date: '',
      end_date: '',
      tags: [],
    });
    setImageFile(null);
    setThumbnailFile(null);
    setImagePreview(null);
    setThumbnailPreview(null);
    setContentLocale(displayLocale);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!challengeMultilingual.title.en?.trim()) {
      toast.error('Title in English is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const formDataToSend = new FormData();
      formDataToSend.append('title', challengeMultilingual.title.en); // Default to English
      formDataToSend.append('description', challengeMultilingual.description.en || '');
      formDataToSend.append('instructions', challengeMultilingual.instructions.en || '');
      formDataToSend.append('display_order', formData.display_order.toString());
      formDataToSend.append('is_active', formData.is_active ? '1' : '0');
      formDataToSend.append('is_featured', formData.is_featured ? '1' : '0');
      if (formData.start_date) {
        formDataToSend.append('start_date', formData.start_date);
      }
      if (formData.end_date) {
        formDataToSend.append('end_date', formData.end_date);
      }
      if (formData.tags.length > 0) {
        formDataToSend.append('tags', JSON.stringify(formData.tags));
      }
      
      // Include multilingual translations
      formDataToSend.append('translations', JSON.stringify({
        title: challengeMultilingual.title,
        description: challengeMultilingual.description,
        instructions: challengeMultilingual.instructions,
      }));
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile);
      }

      let response;
      if (editingChallenge) {
        response = await challengeApi.admin.update(editingChallenge.id, formDataToSend);
      } else {
        response = await challengeApi.admin.create(formDataToSend);
      }

      if (response.success) {
        toast.success(editingChallenge ? 'Challenge updated successfully' : 'Challenge created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchChallenges();
      } else {
        throw new Error(response.message || 'Failed to save challenge');
      }
    } catch (error: any) {
      console.error('Error saving challenge:', error);
      toast.error(error.message || 'Failed to save challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this challenge?')) {
      return;
    }

    try {
      const response = await challengeApi.admin.delete(id);
      if (response.success) {
        toast.success('Challenge deleted successfully');
        fetchChallenges();
      } else {
        throw new Error(response.message || 'Failed to delete challenge');
      }
    } catch (error: any) {
      console.error('Error deleting challenge:', error);
      toast.error(error.message || 'Failed to delete challenge');
    }
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleThumbnailChange = (file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setThumbnailPreview(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Challenges Management
          </h1>
          <p className="text-gray-600">Manage creative challenges for users</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Challenge
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search challenges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Challenges Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChallenges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No challenges found
                </TableCell>
              </TableRow>
            ) : (
              filteredChallenges.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell>
                    {challenge.thumbnail_url || challenge.image_url ? (
                      <img
                        src={challenge.thumbnail_url || challenge.image_url || ''}
                        alt={challenge.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{challenge.title}</div>
                    {challenge.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {challenge.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={challenge.is_active ? 'default' : 'secondary'}>
                      {challenge.is_active ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {challenge.is_featured && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{challenge.display_order}</TableCell>
                  <TableCell>
                    {stats[challenge.id] ? (
                      <div className="text-sm">
                        <div>Total: {stats[challenge.id].total_participants || 0}</div>
                        <div className="text-green-600">
                          Completed: {stats[challenge.id].completed_count || 0}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(challenge)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(challenge.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingChallenge(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
            </DialogTitle>
            <DialogDescription>
              {editingChallenge ? 'Update challenge details' : 'Add a new creative challenge'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Language Tabs with Translate Button */}
            <div className="flex items-center justify-between mb-4">
              <LanguageTabs 
                activeLanguage={contentLocale} 
                onLanguageChange={(lang) => setContentLocale(lang)}
              />
              <TranslateButton
                fields={{
                  title: challengeMultilingual.title[contentLocale] || '',
                  description: challengeMultilingual.description[contentLocale] || '',
                  instructions: challengeMultilingual.instructions[contentLocale] || '',
                }}
                sourceLanguage={contentLocale}
                onTranslate={(translations) => {
                  setChallengeMultilingual(prev => ({
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
                    instructions: {
                      en: translations.instructions?.en !== undefined ? translations.instructions.en : prev.instructions.en,
                      es: translations.instructions?.es !== undefined ? translations.instructions.es : prev.instructions.es,
                      pt: translations.instructions?.pt !== undefined ? translations.instructions.pt : prev.instructions.pt,
                    },
                  }));
                }}
              />
            </div>

            <div>
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={challengeMultilingual.title[contentLocale] || ''}
                onChange={(e) => setChallengeMultilingual({
                  ...challengeMultilingual,
                  title: { ...challengeMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={challengeMultilingual.description[contentLocale] || ''}
                onChange={(e) => setChallengeMultilingual({
                  ...challengeMultilingual,
                  description: { ...challengeMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={challengeMultilingual.instructions[contentLocale] || ''}
                onChange={(e) => setChallengeMultilingual({
                  ...challengeMultilingual,
                  instructions: { ...challengeMultilingual.instructions, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter instructions in ${contentLocale.toUpperCase()}`}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>

            <div>
              <Label>Challenge Image</Label>
              <FileUpload
                type="image"
                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                onFileSelect={handleImageChange}
                currentFile={imagePreview}
                label="Upload Challenge Image"
              />
            </div>

            <div>
              <Label>Thumbnail Image</Label>
              <FileUpload
                type="image"
                accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                onFileSelect={handleThumbnailChange}
                currentFile={thumbnailPreview}
                label="Upload Thumbnail Image"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !challengeMultilingual.title.en?.trim()}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingChallenge ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChallengesManagement;
