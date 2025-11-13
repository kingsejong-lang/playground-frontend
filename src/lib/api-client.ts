/**
 * Type-safe API client with Zod validation and Result pattern.
 * Follows the code quality standards defined in system_prompt_additions.md
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ZodSchema } from 'zod';
import { Result } from './types/result';
import {
  ApiError,
  NetworkError,
  ValidationError,
  createErrorFromResponse,
} from './errors/api-error';
import * as schemas from './schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Creates and configures the axios instance
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
  });

  // Request interceptor to include JWT token
  instance.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
}

const api = createAxiosInstance();

/**
 * Makes a safe API call with validation and error handling.
 *
 * @template TReq - Request type
 * @template TRes - Response type
 * @param method - HTTP method
 * @param url - API endpoint URL
 * @param requestSchema - Zod schema for request validation (optional)
 * @param responseSchema - Zod schema for response validation
 * @param data - Request data (optional)
 * @returns Result containing the validated response or an error
 */
async function safeApiCall<TReq, TRes>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  requestSchema: ZodSchema<TReq> | null,
  responseSchema: ZodSchema<TRes>,
  data?: TReq
): Promise<Result<TRes, ApiError>> {
  try {
    // Validate request if schema provided
    if (requestSchema && data) {
      const validationResult = requestSchema.safeParse(data);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return {
          ok: false,
          error: new ValidationError('Request validation failed', errors),
        };
      }
    }

    // Make API call
    const response = await (method === 'GET'
      ? api.get(url)
      : method === 'POST'
      ? api.post(url, data)
      : method === 'PUT'
      ? api.put(url, data)
      : api.delete(url));

    // Validate response
    const parseResult = responseSchema.safeParse(response.data);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return {
        ok: false,
        error: new ValidationError('Response validation failed', errors),
      };
    }

    return {
      ok: true,
      value: parseResult.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error (no response)
      if (!axiosError.response) {
        return {
          ok: false,
          error: new NetworkError(
            axiosError.message || 'Network error occurred',
            { originalError: axiosError }
          ),
        };
      }

      // HTTP error response
      const { status, statusText, data: responseData } = axiosError.response;
      return {
        ok: false,
        error: createErrorFromResponse(status, statusText, responseData),
      };
    }

    // Unknown error
    return {
      ok: false,
      error: new ApiError(
        'An unexpected error occurred',
        'UNKNOWN_ERROR',
        undefined,
        { originalError: error }
      ),
    };
  }
}

/**
 * Languages API
 */
export const languagesAPI = {
  /**
   * Lists all available languages.
   *
   * @returns Result containing array of languages or an error
   */
  list: async (): Promise<Result<schemas.Language[], ApiError>> => {
    const result = await safeApiCall(
      'GET',
      '/languages',
      null,
      schemas.LanguagesResponseSchema
    );

    if (result.ok) {
      return { ok: true, value: result.value.languages };
    }
    return result;
  },

  /**
   * Gets a specific language by ID.
   *
   * @param id - Language ID
   * @returns Result containing the language or an error
   */
  get: async (id: string): Promise<Result<schemas.Language, ApiError>> => {
    return safeApiCall('GET', `/languages/${id}`, null, schemas.LanguageSchema);
  },

  /**
   * Gets a template for a specific language.
   *
   * @param languageId - Language ID
   * @param templateId - Template ID
   * @returns Result containing the template or an error
   */
  getTemplate: async (
    languageId: string,
    templateId: string
  ): Promise<Result<schemas.Template, ApiError>> => {
    return safeApiCall(
      'GET',
      `/languages/${languageId}/templates/${templateId}`,
      null,
      schemas.TemplateSchema
    );
  },
};

/**
 * Execution API
 */
export const executionAPI = {
  /**
   * Executes code.
   *
   * @param request - Execution request
   * @returns Result containing execution response or an error
   */
  execute: async (
    request: schemas.ExecuteRequest
  ): Promise<Result<schemas.ExecuteResponse, ApiError>> => {
    return safeApiCall(
      'POST',
      '/execute',
      schemas.ExecuteRequestSchema,
      schemas.ExecuteResponseSchema,
      request
    );
  },
};

/**
 * Share API
 */
export const shareAPI = {
  /**
   * Creates a new code share.
   *
   * @param request - Create share request
   * @returns Result containing the created share or an error
   */
  create: async (
    request: schemas.CreateShareRequest
  ): Promise<Result<schemas.Share, ApiError>> => {
    return safeApiCall(
      'POST',
      '/share',
      schemas.CreateShareRequestSchema,
      schemas.ShareSchema,
      request
    );
  },

  /**
   * Gets a shared code by ID.
   *
   * @param id - Share ID
   * @returns Result containing the share or an error
   */
  get: async (id: string): Promise<Result<schemas.Share, ApiError>> => {
    return safeApiCall('GET', `/share/${id}`, null, schemas.ShareSchema);
  },

  /**
   * Deletes a shared code.
   *
   * @param id - Share ID
   * @returns Result containing deletion confirmation or an error
   */
  delete: async (id: string): Promise<Result<schemas.DeleteShareResponse, ApiError>> => {
    return safeApiCall(
      'DELETE',
      `/share/${id}`,
      null,
      schemas.DeleteShareResponseSchema
    );
  },
};

/**
 * Settings API
 */
export const settingsAPI = {
  /**
   * Saves user settings.
   *
   * @param request - Save settings request
   * @returns Result containing updated settings or an error
   */
  save: async (
    request: schemas.SaveSettingsRequest
  ): Promise<Result<schemas.UserSettings, ApiError>> => {
    return safeApiCall(
      'POST',
      '/settings',
      schemas.SaveSettingsRequestSchema,
      schemas.UserSettingsSchema,
      request
    );
  },

  /**
   * Gets user settings.
   *
   * @returns Result containing user settings or an error
   */
  get: async (): Promise<Result<schemas.UserSettings, ApiError>> => {
    return safeApiCall('GET', '/settings', null, schemas.UserSettingsSchema);
  },
};

/**
 * Auth API
 */
export const authAPI = {
  /**
   * Registers a new user.
   *
   * @param request - Registration request
   * @returns Result containing auth response or an error
   */
  register: async (
    request: schemas.RegisterRequest
  ): Promise<Result<schemas.AuthResponse, ApiError>> => {
    return safeApiCall(
      'POST',
      '/auth/register',
      schemas.RegisterRequestSchema,
      schemas.AuthResponseSchema,
      request
    );
  },

  /**
   * Logs in a user.
   *
   * @param request - Login request
   * @returns Result containing auth response or an error
   */
  login: async (
    request: schemas.LoginRequest
  ): Promise<Result<schemas.AuthResponse, ApiError>> => {
    return safeApiCall(
      'POST',
      '/auth/login',
      schemas.LoginRequestSchema,
      schemas.AuthResponseSchema,
      request
    );
  },

  /**
   * Refreshes access token.
   *
   * @param request - Refresh token request
   * @returns Result containing new tokens or an error
   */
  refresh: async (
    request: schemas.RefreshTokenRequest
  ): Promise<Result<schemas.RefreshTokenResponse, ApiError>> => {
    return safeApiCall(
      'POST',
      '/auth/refresh',
      schemas.RefreshTokenRequestSchema,
      schemas.RefreshTokenResponseSchema,
      request
    );
  },

  /**
   * Gets current user information.
   *
   * @returns Result containing user information or an error
   */
  getMe: async (): Promise<Result<schemas.User, ApiError>> => {
    return safeApiCall('GET', '/auth/me', null, schemas.GetMeResponseSchema);
  },
};

/**
 * Re-export types for convenience
 */
export type { Result } from './types/result';
export type { ApiError } from './errors/api-error';
export * from './schemas';
