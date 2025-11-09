import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  user_id: string;
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

  get: async (userId: string): Promise<UserSettings> => {
    const response = await api.get<UserSettings>(`/settings/${userId}`);
    return response.data;
  },
};

export default api;
