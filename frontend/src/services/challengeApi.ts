const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Generic API call function
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

// Upload FormData
async function uploadFormData<T>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Authorization': token ? `Bearer ${token}` : '',
  };

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

// Types
export interface Challenge {
  id: number;
  title: string;
  description?: string | null;
  instructions?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  start_date?: string | null;
  end_date?: string | null;
  tags?: string[] | null;
  user_status?: 'pending' | 'completed';
  is_completed?: boolean;
  completed_at?: string | null;
  generated_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Public API Endpoints
export const challengeApi = {
  // Get all challenges (public)
  getAll: () => {
    return apiCall<{ success: boolean; data: Challenge[] }>('/challenges');
  },

  // Get a single challenge (public)
  getOne: (id: number) => {
    return apiCall<{ success: boolean; data: Challenge }>(`/challenges/${id}`);
  },

  // Get user's challenges (authenticated)
  getMyChallenges: () => {
    return apiCall<{ success: boolean; data: Challenge[] }>('/challenges/my-challenges');
  },

  // Complete a challenge (authenticated)
  completeChallenge: (id: number, data: {
    image_id?: number;
    generated_image_url?: string;
    generated_image_path?: string;
  }) => {
    return apiCall<{ success: boolean; message: string; data: any }>(`/challenges/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ==================== ADMIN ENDPOINTS ====================
  admin: {
    // Get all challenges (admin)
    getAll: (params?: { is_active?: boolean; is_featured?: boolean; search?: string; per_page?: number }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      return apiCall<{ success: boolean; data: any }>(`/admin/challenges${queryString}`);
    },

    // Get a single challenge (admin)
    getOne: (id: number) => {
      return apiCall<{ success: boolean; data: Challenge }>(`/admin/challenges/${id}`);
    },

    // Create challenge
    create: (formData: FormData) => {
      return uploadFormData('/admin/challenges', formData, 'POST');
    },

    // Update challenge
    update: (id: number, formData: FormData) => {
      return uploadFormData(`/admin/challenges/${id}`, formData, 'PUT');
    },

    // Delete challenge
    delete: (id: number) => {
      return apiCall<{ success: boolean; message?: string }>(`/admin/challenges/${id}`, {
        method: 'DELETE',
      });
    },

    // Get challenge statistics
    getStats: (id: number) => {
      return apiCall<{ success: boolean; data: any }>(`/admin/challenges/${id}/stats`);
    },
  },
};

export default challengeApi;
