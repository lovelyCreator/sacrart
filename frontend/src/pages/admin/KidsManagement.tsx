import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload,
  Download,
  Video,
  FileText,
  ShoppingBag,
  Star,
  Eye,
  EyeOff,
  GripVertical,
  Settings,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import kidsApi, { KidsVideo, KidsResource, KidsProduct } from '@/services/kidsApi';
import { videoApi } from '@/services/videoApi';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageTabs } from '@/components/admin/LanguageTabs';
import { Textarea } from '@/components/ui/textarea';

const KidsManagement = () => {
  const { t } = useTranslation();

  // State for each section
  const [heroVideoId, setHeroVideoId] = useState<number | null>(null);
  const [kidsVideos, setKidsVideos] = useState<KidsVideo[]>([]);
  const [resources, setResources] = useState<KidsResource[]>([]);
  const [products, setProducts] = useState<KidsProduct[]>([]);
  const [availableVideos, setAvailableVideos] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [heroVideoDialogOpen, setHeroVideoDialogOpen] = useState(false);
  const [addVideoDialogOpen, setAddVideoDialogOpen] = useState(false);
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editResourceDialogOpen, setEditResourceDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);

  // Form states
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [editingResource, setEditingResource] = useState<KidsResource | null>(null);
  const [editingProduct, setEditingProduct] = useState<KidsProduct | null>(null);
  const [contentLocale, setContentLocale] = useState<'en' | 'es' | 'pt'>('en');

  // Resource form
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'pdf' as 'pdf' | 'image' | 'zip',
    file: null as File | null,
    thumbnail: null as File | null,
    display_order: 0,
    is_active: true,
    tags: [] as string[],
  });

  // Resource multilingual state
  const [resourceMultilingual, setResourceMultilingual] = useState({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
  });

  // Product form
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    long_description: '',
    price: 0,
    original_price: 0,
    currency: 'EUR',
    image: null as File | null,
    badge_text: '',
    badge_color: 'bg-primary',
    stock_quantity: 0,
    in_stock: true,
    display_order: 0,
    is_featured: false,
    is_active: true,
    sku: '',
    external_link: '',
  });

  // Product multilingual state
  const [productMultilingual, setProductMultilingual] = useState({
    title: { en: '', es: '', pt: '' },
    description: { en: '', es: '', pt: '' },
    long_description: { en: '', es: '', pt: '' },
    badge_text: { en: '', es: '', pt: '' },
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHeroVideo(),
        loadKidsVideos(),
        loadResources(),
        loadProducts(),
        loadAvailableVideos(),
      ]);
      toast.success('Kids content loaded successfully');
    } catch (error: any) {
      console.error('Error loading kids content:', error);
      toast.error('Failed to load kids content');
    } finally {
      setLoading(false);
    }
  };

  const loadHeroVideo = async () => {
    try {
      console.log('🔍 Loading hero video setting from admin API...');
      const response = await kidsApi.admin.getSettings();
      console.log('📦 Admin settings response:', response);
      
      // apiCall returns the JSON directly, so response is { success: true, data: [...] }
      if (response.success && response.data) {
        // Find the hero_video_id setting
        const heroSetting = response.data.find((s: any) => s.setting_key === 'hero_video_id');
        console.log('🎯 Found hero setting:', heroSetting);
        
        if (heroSetting && heroSetting.setting_value) {
          const videoId = parseInt(heroSetting.setting_value);
          console.log('✅ Setting hero video ID to:', videoId);
          setHeroVideoId(videoId);
        } else {
          console.log('⚠️ No hero setting found, clearing hero video ID');
          setHeroVideoId(null);
        }
      } else {
        console.log('❌ Invalid response structure:', response);
        setHeroVideoId(null);
      }
    } catch (error) {
      console.error('❌ Error loading hero video setting:', error);
      setHeroVideoId(null);
    }
  };

  const loadKidsVideos = async () => {
    try {
      const response = await kidsApi.admin.getVideos();
      if (response.success && response.data) {
        setKidsVideos(response.data);
      }
    } catch (error) {
      console.error('Error loading kids videos:', error);
    }
  };

  const loadResources = async () => {
    try {
      const response = await kidsApi.admin.getResources();
      if (response.success && response.data) {
        setResources(response.data);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await kidsApi.admin.getProducts();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAvailableVideos = async () => {
    try {
      const response = await videoApi.getPublic({ status: 'published', per_page: 100 });
      const videosData = Array.isArray(response.data) ? response.data : 
                        response.data?.data ? response.data.data : [];
      setAvailableVideos(videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  // Hero Video Management
  const handleSetHeroVideo = async () => {
    if (!selectedVideoId) {
      toast.error('Please select a video');
      return;
    }

    setSubmitting(true);
    try {
      console.log('💾 Saving hero video ID:', selectedVideoId);
      const response = await kidsApi.admin.setHeroVideo(selectedVideoId);
      console.log('📦 Save response:', response.data);
      
      setHeroVideoId(selectedVideoId);
      setHeroVideoDialogOpen(false);
      toast.success('Hero video updated successfully');
      console.log('✅ Hero video saved and state updated to:', selectedVideoId);
    } catch (error: any) {
      console.error('❌ Error setting hero video:', error);
      toast.error('Failed to set hero video');
    } finally {
      setSubmitting(false);
    }
  };

  // Video Management
  const handleAddVideo = async () => {
    if (!selectedVideoId) {
      toast.error('Please select a video');
      return;
    }

    setSubmitting(true);
    try {
      await kidsApi.admin.addVideo({
        video_id: selectedVideoId,
        display_order: kidsVideos.length,
        is_active: true,
      });
      await loadKidsVideos();
      setAddVideoDialogOpen(false);
      setSelectedVideoId(null);
      toast.success('Video added to Kids section');
    } catch (error: any) {
      console.error('Error adding video:', error);
      toast.error(error.message || 'Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveVideo = async (kidsVideoId: number) => {
    if (!confirm('Are you sure you want to remove this video from Kids section?')) return;

    try {
      await kidsApi.admin.removeVideo(kidsVideoId);
      await loadKidsVideos();
      toast.success('Video removed from Kids section');
    } catch (error: any) {
      console.error('Error removing video:', error);
      toast.error('Failed to remove video');
    }
  };

  const handleToggleVideoActive = async (kidsVideo: KidsVideo) => {
    try {
      await kidsApi.admin.updateVideo(kidsVideo.id, {
        is_active: !kidsVideo.is_active,
      });
      await loadKidsVideos();
      toast.success(`Video ${kidsVideo.is_active ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      console.error('Error toggling video:', error);
      toast.error('Failed to update video');
    }
  };

  // Resource Management
  const handleCreateResource = async () => {
    if (!resourceMultilingual.title.en || !resourceForm.file) {
      toast.error('Please provide title (English) and file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', resourceMultilingual.title.en); // English is the source
      formData.append('description', resourceMultilingual.description.en || '');
      formData.append('resource_type', resourceForm.resource_type);
      formData.append('file', resourceForm.file);
      if (resourceForm.thumbnail) {
        formData.append('thumbnail', resourceForm.thumbnail);
      }
      formData.append('display_order', resourceForm.display_order.toString());
      formData.append('is_active', resourceForm.is_active ? '1' : '0');
      if (resourceForm.tags.length > 0) {
        formData.append('tags', JSON.stringify(resourceForm.tags));
      }
      
      // Add translations
      formData.append('translations', JSON.stringify({
        title: resourceMultilingual.title,
        description: resourceMultilingual.description,
      }));

      await kidsApi.admin.createResource(formData);
      await loadResources();
      setAddResourceDialogOpen(false);
      resetResourceForm();
      toast.success('Resource created successfully');
    } catch (error: any) {
      console.error('Error creating resource:', error);
      toast.error(error.message || 'Failed to create resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateResource = async () => {
    if (!editingResource || !resourceMultilingual.title.en) {
      toast.error('Please provide title (English)');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', resourceMultilingual.title.en); // English is the source
      formData.append('description', resourceMultilingual.description.en || '');
      formData.append('resource_type', resourceForm.resource_type);
      if (resourceForm.file) {
        formData.append('file', resourceForm.file);
      }
      if (resourceForm.thumbnail) {
        formData.append('thumbnail', resourceForm.thumbnail);
      }
      formData.append('display_order', resourceForm.display_order.toString());
      formData.append('is_active', resourceForm.is_active ? '1' : '0');
      if (resourceForm.tags.length > 0) {
        formData.append('tags', JSON.stringify(resourceForm.tags));
      }

      // Add translations
      formData.append('translations', JSON.stringify({
        title: resourceMultilingual.title,
        description: resourceMultilingual.description,
      }));

      await kidsApi.admin.updateResource(editingResource.id, formData);
      await loadResources();
      setEditResourceDialogOpen(false);
      setEditingResource(null);
      resetResourceForm();
      toast.success('Resource updated successfully');
    } catch (error: any) {
      console.error('Error updating resource:', error);
      toast.error(error.message || 'Failed to update resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditResource = async (resource: KidsResource) => {
    setEditingResource(resource);
    setResourceForm({
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type,
      file: null,
      thumbnail: null,
      display_order: resource.display_order,
      is_active: resource.is_active,
      tags: resource.tags || [],
    });
    
    // Load translations if available
    try {
      const response = await kidsApi.admin.getResource(resource.id);
      if (response.success && response.data) {
        const allTranslations = response.data.all_translations || {};
        setResourceMultilingual({
          title: allTranslations.title || { en: resource.title, es: '', pt: '' },
          description: allTranslations.description || { en: resource.description || '', es: '', pt: '' },
        });
      } else {
        // Fallback to English only
        setResourceMultilingual({
          title: { en: resource.title, es: '', pt: '' },
          description: { en: resource.description || '', es: '', pt: '' },
        });
      }
    } catch (error) {
      // Fallback to English only
      setResourceMultilingual({
        title: { en: resource.title, es: '', pt: '' },
        description: { en: resource.description || '', es: '', pt: '' },
      });
    }
    
    setEditResourceDialogOpen(true);
  };

  const handleToggleResourceActive = async (resource: KidsResource) => {
    try {
      const formData = new FormData();
      formData.append('is_active', (!resource.is_active) ? '1' : '0');
      await kidsApi.admin.updateResource(resource.id, formData);
      await loadResources();
      toast.success(`Resource ${resource.is_active ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      console.error('Error toggling resource:', error);
      toast.error('Failed to update resource');
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      await kidsApi.admin.deleteResource(resourceId);
      await loadResources();
      toast.success('Resource deleted successfully');
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  // Product Management
  const handleCreateProduct = async () => {
    if (!productMultilingual.title.en || productForm.price <= 0) {
      toast.error('Please provide title (English) and valid price');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', productMultilingual.title.en); // English is the source
      formData.append('description', productMultilingual.description.en || '');
      formData.append('long_description', productMultilingual.long_description.en || '');
      formData.append('price', productForm.price.toString());
      if (productForm.original_price > 0) {
        formData.append('original_price', productForm.original_price.toString());
      }
      formData.append('currency', productForm.currency);
      if (productForm.image) {
        formData.append('image', productForm.image);
      }
      formData.append('badge_text', productMultilingual.badge_text.en || '');
      formData.append('badge_color', productForm.badge_color);
      formData.append('stock_quantity', productForm.stock_quantity.toString());
      formData.append('in_stock', productForm.in_stock ? '1' : '0');
      formData.append('display_order', productForm.display_order.toString());
      formData.append('is_featured', productForm.is_featured ? '1' : '0');
      formData.append('is_active', productForm.is_active ? '1' : '0');
      if (productForm.sku) {
        formData.append('sku', productForm.sku);
      }
      if (productForm.external_link) {
        formData.append('external_link', productForm.external_link);
      }

      // Add translations
      formData.append('translations', JSON.stringify({
        title: productMultilingual.title,
        description: productMultilingual.description,
        long_description: productMultilingual.long_description,
        badge_text: productMultilingual.badge_text,
      }));

      await kidsApi.admin.createProduct(formData);
      await loadProducts();
      setAddProductDialogOpen(false);
      resetProductForm();
      toast.success('Product created successfully');
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productMultilingual.title.en || productForm.price <= 0) {
      toast.error('Please provide title (English) and valid price');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', productMultilingual.title.en); // English is the source
      formData.append('description', productMultilingual.description.en || '');
      formData.append('long_description', productMultilingual.long_description.en || '');
      formData.append('price', productForm.price.toString());
      if (productForm.original_price > 0) {
        formData.append('original_price', productForm.original_price.toString());
      }
      formData.append('currency', productForm.currency);
      if (productForm.image) {
        formData.append('image', productForm.image);
      }
      formData.append('badge_text', productMultilingual.badge_text.en || '');
      formData.append('badge_color', productForm.badge_color);
      formData.append('stock_quantity', productForm.stock_quantity.toString());
      formData.append('in_stock', productForm.in_stock ? '1' : '0');
      formData.append('display_order', productForm.display_order.toString());
      formData.append('is_featured', productForm.is_featured ? '1' : '0');
      formData.append('is_active', productForm.is_active ? '1' : '0');
      if (productForm.sku) {
        formData.append('sku', productForm.sku);
      }
      if (productForm.external_link) {
        formData.append('external_link', productForm.external_link);
      }

      // Add translations
      formData.append('translations', JSON.stringify({
        title: productMultilingual.title,
        description: productMultilingual.description,
        long_description: productMultilingual.long_description,
        badge_text: productMultilingual.badge_text,
      }));

      await kidsApi.admin.updateProduct(editingProduct.id, formData);
      await loadProducts();
      setEditProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      toast.success('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (product: KidsProduct) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description || '',
      long_description: product.long_description || '',
      price: typeof product.price === 'number' ? product.price : parseFloat(product.price || '0'),
      original_price: typeof product.original_price === 'number' ? (product.original_price || 0) : parseFloat(product.original_price || '0'),
      currency: product.currency,
      image: null,
      badge_text: product.badge_text || '',
      badge_color: product.badge_color || 'bg-primary',
      stock_quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : parseInt(product.stock_quantity || '0'),
      in_stock: product.in_stock,
      display_order: typeof product.display_order === 'number' ? product.display_order : parseInt(product.display_order || '0'),
      is_featured: product.is_featured,
      is_active: product.is_active,
      sku: product.sku || '',
      external_link: product.external_link || '',
    });
    
    // Load translations if available
    try {
      const response = await kidsApi.admin.getProduct(product.id);
      if (response.success && response.data) {
        const allTranslations = response.data.all_translations || {};
        setProductMultilingual({
          title: allTranslations.title || { en: product.title, es: '', pt: '' },
          description: allTranslations.description || { en: product.description || '', es: '', pt: '' },
          long_description: allTranslations.long_description || { en: product.long_description || '', es: '', pt: '' },
          badge_text: allTranslations.badge_text || { en: product.badge_text || '', es: '', pt: '' },
        });
      } else {
        // Fallback to English only
        setProductMultilingual({
          title: { en: product.title, es: '', pt: '' },
          description: { en: product.description || '', es: '', pt: '' },
          long_description: { en: product.long_description || '', es: '', pt: '' },
          badge_text: { en: product.badge_text || '', es: '', pt: '' },
        });
      }
    } catch (error) {
      // Fallback to English only
      setProductMultilingual({
        title: { en: product.title, es: '', pt: '' },
        description: { en: product.description || '', es: '', pt: '' },
        long_description: { en: product.long_description || '', es: '', pt: '' },
        badge_text: { en: product.badge_text || '', es: '', pt: '' },
      });
    }
    
    setEditProductDialogOpen(true);
  };

  const handleToggleProductActive = async (product: KidsProduct) => {
    try {
      const formData = new FormData();
      formData.append('is_active', (!product.is_active) ? '1' : '0');
      await kidsApi.admin.updateProduct(product.id, formData);
      await loadProducts();
      toast.success(`Product ${product.is_active ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      console.error('Error toggling product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await kidsApi.admin.deleteProduct(productId);
      await loadProducts();
      toast.success('Product deleted successfully');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const resetResourceForm = () => {
    setResourceForm({
      title: '',
      description: '',
      resource_type: 'pdf',
      file: null,
      thumbnail: null,
      display_order: 0,
      is_active: true,
      tags: [],
    });
    setResourceMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
    });
  };

  const resetProductForm = () => {
    setProductForm({
      title: '',
      description: '',
      long_description: '',
      price: 0,
      original_price: 0,
      currency: 'EUR',
      image: null,
      badge_text: '',
      badge_color: 'bg-primary',
      stock_quantity: 0,
      in_stock: true,
      display_order: 0,
      is_featured: false,
      is_active: true,
      sku: '',
      external_link: '',
    });
    setProductMultilingual({
      title: { en: '', es: '', pt: '' },
      description: { en: '', es: '', pt: '' },
      long_description: { en: '', es: '', pt: '' },
      badge_text: { en: '', es: '', pt: '' },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎨 Sacrart Kids Management</h1>
        <p className="text-gray-600">Manage videos, downloadable resources, and products for kids</p>
      </div>

      {/* Hero Video Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Hero Video (Start Adventure Button)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              This video plays when users click "Start Adventure" on the Kids page
            </p>
          </div>
          <Button onClick={() => {
            // Initialize selectedVideoId with current heroVideoId when opening dialog
            setSelectedVideoId(heroVideoId);
            setHeroVideoDialogOpen(true);
          }}>
            <Settings className="h-4 w-4 mr-2" />
            Change Hero Video
          </Button>
        </div>
        {heroVideoId && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Hero video is set (Video ID: {heroVideoId})
            </p>
          </div>
        )}
        {!heroVideoId && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠ No hero video set. The first Kids video will be used.
            </p>
          </div>
        )}
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({kidsVideos.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resources ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Products ({products.length})
          </TabsTrigger>
        </TabsList>

        {/* VIDEOS TAB */}
        <TabsContent value="videos">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pequeños Curiosos - Videos</h3>
              <Button onClick={() => setAddVideoDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>

            {kidsVideos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No videos added yet. Click "Add Video" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Video Title</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kidsVideos.map((kidsVideo) => (
                    <TableRow key={kidsVideo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          {kidsVideo.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{kidsVideo.video?.title || 'Unknown Video'}</div>
                      </TableCell>
                      <TableCell>
                        {kidsVideo.is_featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={kidsVideo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {kidsVideo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleVideoActive(kidsVideo)}
                          >
                            {kidsVideo.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveVideo(kidsVideo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* RESOURCES TAB */}
        <TabsContent value="resources">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">El Rincón del Dibujante - Resources</h3>
              <Button onClick={() => setAddResourceDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </div>

            {resources.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No resources added yet. Click "Add Resource" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          {resource.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{resource.title}</div>
                        {resource.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">{resource.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resource.resource_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Download className="h-3 w-3" />
                          {resource.download_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={resource.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {resource.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleResourceActive(resource)}
                            title={resource.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {resource.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditResource(resource)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteResource(resource.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* PRODUCTS TAB */}
        <TabsContent value="products">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">El Pequeño Imaginero - Products</h3>
              <Button onClick={() => setAddProductDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No products added yet. Click "Add Product" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          {product.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.title} className="h-12 w-12 object-cover rounded" />
                          )}
                          <div>
                            <div className="font-medium">{product.title}</div>
                            {product.badge_text && (
                              <Badge className="mt-1">{product.badge_text}</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary">
                          {typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)} {product.currency}
                        </div>
                        {product.original_price && parseFloat(product.original_price || 0) > parseFloat(product.price || 0) && (
                          <div className="text-sm text-gray-500 line-through">
                            {typeof product.original_price === 'number' ? product.original_price.toFixed(2) : parseFloat(product.original_price || 0).toFixed(2)} {product.currency}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.in_stock ? 'default' : 'secondary'}>
                          {product.in_stock ? `${product.stock_quantity} in stock` : 'Out of stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleProductActive(product)}
                            title={product.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProduct(product)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      
      {/* Hero Video Dialog */}
      <Dialog open={heroVideoDialogOpen} onOpenChange={(open) => {
        setHeroVideoDialogOpen(open);
        // When dialog opens, initialize selectedVideoId with current heroVideoId
        if (open) {
          setSelectedVideoId(heroVideoId);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Hero Video</DialogTitle>
            <DialogDescription>
              Choose which video plays when users click "Start Adventure"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Video</Label>
              <Select value={selectedVideoId?.toString() || ''} onValueChange={(value) => setSelectedVideoId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a video..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVideos.map((video) => (
                    <SelectItem key={video.id} value={video.id.toString()}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeroVideoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetHeroVideo} disabled={submitting}>
              {submitting ? 'Saving...' : 'Set Hero Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Video Dialog */}
      <Dialog open={addVideoDialogOpen} onOpenChange={setAddVideoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Video to Kids Section</DialogTitle>
            <DialogDescription>
              Select a video to add to "Pequeños Curiosos"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Video</Label>
              <Select value={selectedVideoId?.toString() || ''} onValueChange={(value) => setSelectedVideoId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a video..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVideos
                    .filter(v => !kidsVideos.some(kv => kv.video_id === v.id))
                    .map((video) => (
                      <SelectItem key={video.id} value={video.id.toString()}>
                        {video.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVideoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVideo} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={addResourceDialogOpen} onOpenChange={setAddResourceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
            <DialogDescription>
              Upload a downloadable resource for "El Rincón del Dibujante"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            <div>
              <Label>Title * (English required)</Label>
              <Input
                value={resourceMultilingual.title[contentLocale]}
                onChange={(e) => setResourceMultilingual({
                  ...resourceMultilingual,
                  title: { ...resourceMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={resourceMultilingual.description[contentLocale]}
                onChange={(e) => setResourceMultilingual({
                  ...resourceMultilingual,
                  description: { ...resourceMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                rows={3}
              />
            </div>
            <div>
              <Label>Resource Type</Label>
              <Select value={resourceForm.resource_type} onValueChange={(value: any) => setResourceForm({ ...resourceForm, resource_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File * (Max 50MB)</Label>
              <Input
                type="file"
                onChange={(e) => setResourceForm({ ...resourceForm, file: e.target.files?.[0] || null })}
                accept={resourceForm.resource_type === 'pdf' ? '.pdf' : resourceForm.resource_type === 'image' ? 'image/*' : '.zip'}
              />
            </div>
            <div>
              <Label>Thumbnail (Optional, Max 5MB)</Label>
              <Input
                type="file"
                onChange={(e) => setResourceForm({ ...resourceForm, thumbnail: e.target.files?.[0] || null })}
                accept="image/*"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={resourceForm.display_order}
                onChange={(e) => setResourceForm({ ...resourceForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddResourceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateResource} disabled={submitting}>
              {submitting ? 'Uploading...' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={editResourceDialogOpen} onOpenChange={setEditResourceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update resource details (leave file fields empty to keep existing files)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            <div>
              <Label>Title * (English required)</Label>
              <Input
                value={resourceMultilingual.title[contentLocale]}
                onChange={(e) => setResourceMultilingual({
                  ...resourceMultilingual,
                  title: { ...resourceMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={resourceMultilingual.description[contentLocale]}
                onChange={(e) => setResourceMultilingual({
                  ...resourceMultilingual,
                  description: { ...resourceMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                rows={3}
              />
            </div>
            <div>
              <Label>Resource Type</Label>
              <Select value={resourceForm.resource_type} onValueChange={(value: any) => setResourceForm({ ...resourceForm, resource_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Replace File (Optional, Max 50MB)</Label>
              <Input
                type="file"
                onChange={(e) => setResourceForm({ ...resourceForm, file: e.target.files?.[0] || null })}
                accept={resourceForm.resource_type === 'pdf' ? '.pdf' : resourceForm.resource_type === 'image' ? 'image/*' : '.zip'}
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing file</p>
            </div>
            <div>
              <Label>Replace Thumbnail (Optional, Max 5MB)</Label>
              <Input
                type="file"
                onChange={(e) => setResourceForm({ ...resourceForm, thumbnail: e.target.files?.[0] || null })}
                accept="image/*"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing thumbnail</p>
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={resourceForm.display_order}
                onChange={(e) => setResourceForm({ ...resourceForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditResourceDialogOpen(false); setEditingResource(null); resetResourceForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateResource} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Create a new product for "El Pequeño Imaginero"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            <div>
              <Label>Title * (English required)</Label>
              <Input
                value={productMultilingual.title[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  title: { ...productMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
              />
            </div>
            <div>
              <Label>Short Description</Label>
              <Textarea
                value={productMultilingual.description[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  description: { ...productMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                rows={3}
              />
            </div>
            <div>
              <Label>Long Description</Label>
              <Textarea
                value={productMultilingual.long_description[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  long_description: { ...productMultilingual.long_description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter long description in ${contentLocale.toUpperCase()}`}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price * (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Original Price (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.original_price}
                  onChange={(e) => setProductForm({ ...productForm, original_price: parseFloat(e.target.value) || 0 })}
                  placeholder="For discounts"
                />
              </div>
            </div>
            <div>
              <Label>Product Image (Max 5MB)</Label>
              <Input
                type="file"
                onChange={(e) => setProductForm({ ...productForm, image: e.target.files?.[0] || null })}
                accept="image/*"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Badge Text</Label>
                <Input
                  value={productMultilingual.badge_text[contentLocale]}
                  onChange={(e) => setProductMultilingual({
                    ...productMultilingual,
                    badge_text: { ...productMultilingual.badge_text, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter badge text in ${contentLocale.toUpperCase()}`}
                />
              </div>
              <div>
                <Label>Badge Color</Label>
                <Select value={productForm.badge_color} onValueChange={(value) => setProductForm({ ...productForm, badge_color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-primary">Primary</SelectItem>
                    <SelectItem value="bg-[#A05245]">Sacrart Brown</SelectItem>
                    <SelectItem value="bg-blue-500">Blue</SelectItem>
                    <SelectItem value="bg-green-500">Green</SelectItem>
                    <SelectItem value="bg-red-500">Red</SelectItem>
                    <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                    <SelectItem value="bg-purple-500">Purple</SelectItem>
                    <SelectItem value="bg-gray-600">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>SKU (Optional)</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Product SKU"
                />
              </div>
            </div>
            <div>
              <Label>External Shop Link (Optional)</Label>
              <Input
                value={productForm.external_link}
                onChange={(e) => setProductForm({ ...productForm, external_link: e.target.value })}
                placeholder="https://your-shop.com/product"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={productForm.display_order}
                onChange={(e) => setProductForm({ ...productForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProduct} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editProductDialogOpen} onOpenChange={setEditProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details (leave image field empty to keep existing image)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Language Tabs */}
            <LanguageTabs 
              activeLanguage={contentLocale} 
              onLanguageChange={(lang) => setContentLocale(lang)}
              className="mb-4"
            />
            
            <div>
              <Label>Title * (English required)</Label>
              <Input
                value={productMultilingual.title[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  title: { ...productMultilingual.title, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter title in ${contentLocale.toUpperCase()}`}
              />
            </div>
            <div>
              <Label>Short Description</Label>
              <Textarea
                value={productMultilingual.description[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  description: { ...productMultilingual.description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter description in ${contentLocale.toUpperCase()}`}
                rows={3}
              />
            </div>
            <div>
              <Label>Long Description</Label>
              <Textarea
                value={productMultilingual.long_description[contentLocale]}
                onChange={(e) => setProductMultilingual({
                  ...productMultilingual,
                  long_description: { ...productMultilingual.long_description, [contentLocale]: e.target.value }
                })}
                placeholder={`Enter long description in ${contentLocale.toUpperCase()}`}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price * (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Original Price (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.original_price}
                  onChange={(e) => setProductForm({ ...productForm, original_price: parseFloat(e.target.value) || 0 })}
                  placeholder="For discounts"
                />
              </div>
            </div>
            <div>
              <Label>Replace Product Image (Optional, Max 5MB)</Label>
              <Input
                type="file"
                onChange={(e) => setProductForm({ ...productForm, image: e.target.files?.[0] || null })}
                accept="image/*"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing image</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Badge Text</Label>
                <Input
                  value={productMultilingual.badge_text[contentLocale]}
                  onChange={(e) => setProductMultilingual({
                    ...productMultilingual,
                    badge_text: { ...productMultilingual.badge_text, [contentLocale]: e.target.value }
                  })}
                  placeholder={`Enter badge text in ${contentLocale.toUpperCase()}`}
                />
              </div>
              <div>
                <Label>Badge Color</Label>
                <Select value={productForm.badge_color} onValueChange={(value) => setProductForm({ ...productForm, badge_color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-primary">Primary</SelectItem>
                    <SelectItem value="bg-[#A05245]">Sacrart Brown</SelectItem>
                    <SelectItem value="bg-blue-500">Blue</SelectItem>
                    <SelectItem value="bg-green-500">Green</SelectItem>
                    <SelectItem value="bg-red-500">Red</SelectItem>
                    <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                    <SelectItem value="bg-purple-500">Purple</SelectItem>
                    <SelectItem value="bg-gray-600">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>SKU (Optional)</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Product SKU"
                />
              </div>
            </div>
            <div>
              <Label>External Shop Link (Optional)</Label>
              <Input
                value={productForm.external_link}
                onChange={(e) => setProductForm({ ...productForm, external_link: e.target.value })}
                placeholder="https://your-shop.com/product"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={productForm.display_order}
                onChange={(e) => setProductForm({ ...productForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditProductDialogOpen(false); setEditingProduct(null); resetProductForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateProduct} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KidsManagement;
