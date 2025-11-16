import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable httpOnly cookies
});

// CSRF token cache
let csrfToken: string | null = null;
let csrfExpiresAt: number = 0;

// Get CSRF token (with caching)
export async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid
  if (csrfToken && Date.now() < csrfExpiresAt) {
    return csrfToken;
  }

  try {
    const response = await axios.get(`${API_URL}/api/v1/csrf/token`, {
      withCredentials: true,
    });
    csrfToken = response.data.csrf_token;
    // Cache for 5 minutes (same as backend)
    csrfExpiresAt = Date.now() + 5 * 60 * 1000;
    return csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
}

// Clear CSRF token cache
export function clearCsrfCache() {
  csrfToken = null;
  csrfExpiresAt = 0;
}

// Add request interceptor to include CSRF token for state-changing requests
api.interceptors.request.use(
  async (config) => {
    // Add CSRF token for POST, PUT, DELETE, PATCH requests
    if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      try {
        const token = await getCsrfToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        console.error('Failed to add CSRF token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for automatic token refresh and CSRF retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 (Unauthorized), try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Refresh endpoint will automatically use refresh_token from httpOnly cookie
        await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        return Promise.reject(refreshError);
      }
    }

    // If 403 (Forbidden) and CSRF-related, get new token and retry
    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      try {
        // Clear cached CSRF token and get a new one
        clearCsrfCache();
        const token = await getCsrfToken();
        originalRequest.headers['X-CSRF-Token'] = token;
        // Retry original request
        return api(originalRequest);
      } catch (csrfError) {
        return Promise.reject(csrfError);
      }
    }

    return Promise.reject(error);
  }
);

export interface Language {
  id: string;
  name: string;
  version: string;
  extensions: string[];
  capabilities: string[];
  spec: {
    docker_image: string;
    compile_cmd?: string;
    run_cmd: string;
    default_timeout: number;
    default_memory_limit: number;
  };
}

export interface ExecuteRequest {
  language: string;
  files: Record<string, string>;
  args?: string;
  stdin?: string;
  timeout_seconds?: number;
}

export interface ExecuteResponse {
  request_id: string;
  success: boolean;
  events: Array<{
    kind: string;
    message: string;
    timestamp: string;
  }>;
  metrics?: {
    compile_time_ms: number;
    run_time_ms: number;
    memory_bytes: number;
    cpu_percent: number;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface Template {
  id: string;
  name: string;
  content: string;
}

export interface Share {
  id: string;
  language: string;
  files: Record<string, string>;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  user_id: string;
  view_count: number;
}

export interface CreateShareRequest {
  language: string;
  files: Record<string, string>;
  title?: string;
  description?: string;
  expires_in_days?: number;
  user_id?: string;
}

export interface EditorSettings {
  font_size: number;
  font_family: string;
  tab_size: number;
  auto_save: boolean;
  minimap: boolean;
  execution_mode?: 'http' | 'websocket'; // Default: 'http'
}

export interface ThemeSettings {
  theme: string;
  color_scheme: string;
}

export interface UserSettings {
  user_id: string;
  editor: EditorSettings;
  theme: ThemeSettings;
}

export interface SaveSettingsRequest {
  user_id?: string; // Optional: backend will use authenticated user ID
  editor?: EditorSettings;
  theme?: ThemeSettings;
}

export const languagesAPI = {
  list: async (): Promise<Language[]> => {
    const response = await api.get<{ languages: Language[] }>('/languages');
    return response.data.languages;
  },

  get: async (id: string): Promise<Language> => {
    const response = await api.get<Language>(`/languages/${id}`);
    return response.data;
  },

  getTemplate: async (languageId: string, templateId: string): Promise<Template> => {
    const response = await api.get<Template>(`/languages/${languageId}/templates/${templateId}`);
    return response.data;
  },
};

export const executionAPI = {
  execute: async (request: ExecuteRequest): Promise<ExecuteResponse> => {
    const response = await api.post<ExecuteResponse>('/execute', request);
    return response.data;
  },
};

export const shareAPI = {
  create: async (request: CreateShareRequest): Promise<Share> => {
    const response = await api.post<Share>('/share', request);
    return response.data;
  },

  get: async (id: string): Promise<Share> => {
    const response = await api.get<Share>(`/share/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<{ deleted: boolean; message: string }> => {
    const response = await api.delete<{ deleted: boolean; message: string }>(`/share/${id}`);
    return response.data;
  },
};

export const settingsAPI = {
  save: async (request: SaveSettingsRequest): Promise<UserSettings> => {
    const response = await api.post<UserSettings>('/settings', request);
    return response.data;
  },

  get: async (): Promise<UserSettings> => {
    const response = await api.get<UserSettings>('/settings');
    return response.data;
  },
};

// Auth types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  // Tokens are now in httpOnly cookies, not in response body
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export const authAPI = {
  register: async (request: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', request);
    return response.data;
  },

  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', request);
    return response.data;
  },

  refresh: async (): Promise<void> => {
    // Refresh token is automatically sent via httpOnly cookie
    await api.post('/auth/refresh', {});
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout', {});
    clearCsrfCache(); // Clear CSRF cache on logout
  },

  getMe: async (): Promise<{ id: string; email: string; name: string; roles: string[] }> => {
    const response = await api.get<{ id: string; email: string; name: string; roles: string[] }>('/auth/me');
    return response.data;
  },
};

export default api;
