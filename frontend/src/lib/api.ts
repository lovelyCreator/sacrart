const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface User {
  id: number;
  name: string;
  email: string;
  subscription_type: 'freemium' | 'basic' | 'premium' | 'admin';
  role: 'user' | 'admin';
  is_admin: boolean;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  is_subscription_active?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  subscription_type: 'freemium' | 'basic' | 'premium' | 'admin';
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add locale header for backend translation
    const locale = localStorage.getItem('i18nextLng') || 'en';
    headers['Accept-Language'] = locale;

    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response, clearTokenOn401: boolean = false): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      // Handle 401 Unauthorized - only clear token if explicitly requested (e.g., for getUser endpoint)
      if (response.status === 401) {
        if (clearTokenOn401) {
          localStorage.removeItem('auth_token');
        }
        if (isJson) {
          const error: ApiError = await response.json();
          throw new Error(error.message || 'Unauthenticated. Please login again.');
        }
        throw new Error('Unauthenticated. Please login again.');
      }
      
      if (isJson) {
        const error: ApiError = await response.json();
        throw new Error(error.message || 'An error occurred');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (isJson) {
      return response.json();
    }

    return {} as T;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    console.log('=== API: Register Request ===');
    console.log('URL:', `${this.baseUrl}/register`);
    console.log('Data:', { ...data, password: '***' });
    
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('Register response status:', response.status);
    const result = await this.handleResponse<AuthResponse>(response);
    console.log('Register result:', { ...result, token: '***' });
    return result;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    console.log('Attempting login to:', `${this.baseUrl}/login`);
    console.log('Login data:', { email: data.email });
    
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('Login response status:', response.status);
    return this.handleResponse<AuthResponse>(response);
  }

  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    await this.handleResponse<void>(response);
    localStorage.removeItem('auth_token');
  }

  async getUser(): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/user`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    // Clear token on 401 for getUser since it means the token is invalid
    return this.handleResponse<{ user: User }>(response, true);
  }

  async updateSubscription(subscriptionType: 'freemium' | 'basic' | 'premium' | 'admin'): Promise<{ user: User; message: string }> {
    const response = await fetch(`${this.baseUrl}/subscription`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ subscription_type: subscriptionType }),
    });

    return this.handleResponse<{ user: User; message: string }>(response);
  }

  async createStripeCheckoutSession(planId: number, successUrl: string, cancelUrl: string): Promise<{ success: boolean; url: string; id: string; message?: string }> {
    console.log('🔐 Creating Stripe checkout session via API...', {
      url: `${this.baseUrl}/payments/checkout`,
      planId,
      successUrl,
      hasToken: !!localStorage.getItem('auth_token')
    });

    const response = await fetch(`${this.baseUrl}/payments/checkout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        plan_id: planId, 
        success_url: successUrl, 
        cancel_url: cancelUrl 
      }),
    });

    console.log('📡 Stripe checkout API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Stripe checkout API error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.message || `Failed to create checkout session: ${response.status}`);
    }

    return this.handleResponse<{ success: boolean; url: string; id: string; message?: string }>(response);
  }
}

// Export a singleton instance
export const api = new ApiClient(API_BASE_URL);