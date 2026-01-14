const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to get locale from localStorage or default to 'en'
const getLocale = (): string => {
  return localStorage.getItem('i18nextLng') || 'en';
};

// Helper function to get auth headers
const getAuthHeaders = (localeOverride?: string): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const locale = localeOverride || getLocale();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Locale': locale,
    'Accept-Language': locale,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Types
export interface KidsVideo {
  id: number;
  video_id: number;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  video?: any; // Video object from backend
  created_at: string;
  updated_at: string;
}

export interface KidsResource {
  id: number;
  title: string;
  description?: string;
  resource_type: 'pdf' | 'image' | 'zip';
  file_path: string;
  file_url?: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  file_size?: number;
  download_count: number;
  display_order: number;
  is_active: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface KidsProduct {
  id: number;
  title: string;
  description?: string;
  long_description?: string;
  price: number;
  original_price?: number;
  currency: string;
  image_path?: string;
  image_url?: string;
  gallery_images?: string[];
  badge_text?: string;
  badge_color?: string;
  stock_quantity: number;
  in_stock: boolean;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  sku?: string;
  tags?: string[];
  external_link?: string;
  has_discount?: boolean;
  discount_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface KidsContent {
  hero_video?: any;
  videos: any[];
  resources: KidsResource[];
  products: KidsProduct[];
}

// Helper for FormData uploads
async function uploadFormData<T>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'X-Locale': getLocale(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// API Endpoints
export const kidsApi = {
  // Get all kids content (public)
  getContent: () => {
    return apiCall<{ success: boolean; data: KidsContent }>('/kids/content');
  },

  // Get kids videos only
  getVideos: () => {
    return apiCall<{ success: boolean; data: any[] }>('/kids/videos');
  },

  // Get kids resources
  getResources: (params?: { type?: string }) => {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiCall<{ success: boolean; data: KidsResource[] }>(`/kids/resources${queryString}`);
  },

  // Download a resource
  downloadResource: (resourceId: number) => {
    return apiCall<{ success: boolean; data: { url: string; filename: string } }>(
      `/kids/resources/${resourceId}/download`
    );
  },

  // Get kids products
  getProducts: (params?: { featured?: boolean; in_stock?: boolean }) => {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiCall<{ success: boolean; data: KidsProduct[] }>(`/kids/products${queryString}`);
  },

  // Get a single product
  getProduct: (productId: number) => {
    return apiCall<{ success: boolean; data: KidsProduct }>(`/kids/products/${productId}`);
  },

  // Get hero video
  getHeroVideo: () => {
    return apiCall<{ success: boolean; data: any }>('/kids/hero-video');
  },

  // ==================== ADMIN ENDPOINTS ====================

  // Settings
  admin: {
    // Get all settings
    getSettings: () => {
      return apiCall<{ success: boolean; data: Array<{ setting_key: string; setting_value: string }> }>('/admin/kids/settings');
    },

    // Update settings
    updateSettings: (settings: Record<string, any>) => {
      return apiCall('/admin/kids/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
    },

    // Set hero video
    setHeroVideo: (videoId: number | null) => {
      return apiCall('/admin/kids/settings/hero-video', {
        method: 'POST',
        body: JSON.stringify({ video_id: videoId }),
      });
    },

    // VIDEOS
    getVideos: () => {
      return apiCall<{ success: boolean; data: KidsVideo[] }>('/admin/kids/videos');
    },

    addVideo: (data: {
      video_id: number;
      display_order?: number;
      is_featured?: boolean;
      is_active?: boolean;
    }) => {
      return apiCall('/admin/kids/videos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateVideo: (kidsVideoId: number, data: {
      display_order?: number;
      is_featured?: boolean;
      is_active?: boolean;
    }) => {
      return apiCall(`/admin/kids/videos/${kidsVideoId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    removeVideo: (kidsVideoId: number) => {
      return apiCall(`/admin/kids/videos/${kidsVideoId}`, {
        method: 'DELETE',
      });
    },

    reorderVideos: (videos: Array<{ id: number; display_order: number }>) => {
      return apiCall('/admin/kids/videos/reorder', {
        method: 'POST',
        body: JSON.stringify({ videos }),
      });
    },

    // RESOURCES
    getResources: () => {
      return apiCall<{ success: boolean; data: KidsResource[] }>('/admin/kids/resources');
    },

    createResource: (formData: FormData) => {
      return uploadFormData('/admin/kids/resources', formData, 'POST');
    },

    getResource: (resourceId: number) => {
      return apiCall<{ success: boolean; data: KidsResource }>(`/admin/kids/resources/${resourceId}`);
    },

    updateResource: (resourceId: number, formData: FormData) => {
      // Use POST instead of PUT for FormData compatibility
      return uploadFormData(`/admin/kids/resources/${resourceId}`, formData, 'POST');
    },

    deleteResource: (resourceId: number) => {
      return apiCall(`/admin/kids/resources/${resourceId}`, {
        method: 'DELETE',
      });
    },

    reorderResources: (resources: Array<{ id: number; display_order: number }>) => {
      return apiCall('/admin/kids/resources/reorder', {
        method: 'POST',
        body: JSON.stringify({ resources }),
      });
    },

    // PRODUCTS
    getProducts: () => {
      return apiCall<{ success: boolean; data: KidsProduct[] }>('/admin/kids/products');
    },

    createProduct: (formData: FormData) => {
      return uploadFormData('/admin/kids/products', formData, 'POST');
    },

    getProduct: (productId: number) => {
      return apiCall<{ success: boolean; data: KidsProduct }>(`/admin/kids/products/${productId}`);
    },

    updateProduct: (productId: number, formData: FormData) => {
      // Use POST instead of PUT for FormData compatibility
      return uploadFormData(`/admin/kids/products/${productId}`, formData, 'POST');
    },

    deleteProduct: (productId: number) => {
      return apiCall(`/admin/kids/products/${productId}`, {
        method: 'DELETE',
      });
    },

    reorderProducts: (products: Array<{ id: number; display_order: number }>) => {
      return apiCall('/admin/kids/products/reorder', {
        method: 'POST',
        body: JSON.stringify({ products }),
      });
    },
  },
};

export default kidsApi;
