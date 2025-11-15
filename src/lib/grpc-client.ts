/**
 * gRPC-Web API client with Result pattern and error handling.
 * Provides the same interface as REST API client for seamless protocol switching.
 */

import { Result } from './types/result';
import { ApiError, NetworkError, createErrorFromResponse } from './errors/api-error';
import * as schemas from './schemas';

// Import generated gRPC clients
import { LanguageServiceClient } from './grpc/generated/language/v1/LanguageServiceClientPb';
import { ExecutionServiceClient } from './grpc/generated/execution/v1/ExecutionServiceClientPb';
import { StorageServiceClient } from './grpc/generated/storage/v1/StorageServiceClientPb';
import { AuthServiceClient } from './grpc/generated/auth/v1/AuthServiceClientPb';

// Import generated protobuf messages
import * as languagePb from './grpc/generated/language/v1/language_pb';
import * as executionPb from './grpc/generated/execution/v1/execution_pb';
import * as storagePb from './grpc/generated/storage/v1/storage_pb';
import * as authPb from './grpc/generated/auth/v1/auth_pb';

const GRPC_WEB_ENDPOINT = process.env.NEXT_PUBLIC_GRPC_ENDPOINT || 'http://localhost:8080';

// Create client instances
const languageClient = new LanguageServiceClient(GRPC_WEB_ENDPOINT);
const executionClient = new ExecutionServiceClient(GRPC_WEB_ENDPOINT);
const storageClient = new StorageServiceClient(GRPC_WEB_ENDPOINT);
const authClient = new AuthServiceClient(GRPC_WEB_ENDPOINT);

/**
 * Get authorization metadata with JWT token
 */
function getAuthMetadata(): { [key: string]: string } {
  const metadata: { [key: string]: string } = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      metadata['authorization'] = `Bearer ${token}`;
    }
  }

  return metadata;
}

/**
 * Wraps a gRPC call with error handling and returns a Result
 */
async function wrapGrpcCall<T>(
  call: Promise<T>
): Promise<Result<T, ApiError>> {
  try {
    const response = await call;
    return { ok: true, value: response };
  } catch (error: any) {
    // gRPC-Web errors have a code and message
    const code = error?.code || 2; // UNKNOWN
    const message = error?.message || 'gRPC call failed';

    // Map gRPC status codes to HTTP-like errors
    let statusCode = 500;
    if (code === 16) statusCode = 401; // UNAUTHENTICATED
    else if (code === 7) statusCode = 403; // PERMISSION_DENIED
    else if (code === 5) statusCode = 404; // NOT_FOUND
    else if (code === 3) statusCode = 400; // INVALID_ARGUMENT
    else if (code === 6) statusCode = 409; // ALREADY_EXISTS

    return {
      ok: false,
      error: createErrorFromResponse(statusCode, message, { error: message }),
    };
  }
}

/**
 * Convert protobuf Language to schema Language
 */
function pbLanguageToSchema(pbLang: languagePb.Language.AsObject): schemas.Language {
  const capabilities = pbLang.capabilitiesList.filter(cap =>
    ['compile', 'run', 'format', 'lint', 'debug'].includes(cap)
  ) as Array<'compile' | 'run' | 'format' | 'lint' | 'debug'>;

  return {
    id: pbLang.id,
    name: pbLang.name,
    version: pbLang.version,
    extensions: pbLang.extensionsList,
    capabilities,
    spec: {
      docker_image: pbLang.spec?.dockerImage || '',
      compile_cmd: pbLang.spec?.compileCmd,
      run_cmd: pbLang.spec?.runCmd || '',
      default_timeout: pbLang.spec?.defaultTimeout || 30,
      default_memory_limit: Number(pbLang.spec?.defaultMemoryLimit) || 536870912,
    },
  };
}

/**
 * Languages gRPC API
 */
export const grpcLanguagesAPI = {
  /**
   * Lists all available languages.
   */
  list: async (): Promise<Result<schemas.Language[], ApiError>> => {
    const request = new languagePb.ListLanguagesRequest();
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      languageClient.listLanguages(request, metadata)
    );

    if (result.ok) {
      const languages = result.value.toObject().languagesList.map(pbLanguageToSchema);
      return { ok: true, value: languages };
    }
    return result as Result<schemas.Language[], ApiError>;
  },

  /**
   * Gets a specific language by ID.
   */
  get: async (id: string): Promise<Result<schemas.Language, ApiError>> => {
    const request = new languagePb.GetLanguageRequest();
    request.setId(id);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      languageClient.getLanguage(request, metadata)
    );

    if (result.ok) {
      const language = pbLanguageToSchema(result.value.toObject());
      return { ok: true, value: language };
    }
    return result as Result<schemas.Language, ApiError>;
  },

  /**
   * Gets a template for a specific language.
   */
  getTemplate: async (
    languageId: string,
    templateId: string
  ): Promise<Result<schemas.Template, ApiError>> => {
    const request = new languagePb.GetTemplateRequest();
    request.setLanguageId(languageId);
    request.setTemplateType(templateId);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      languageClient.getLanguageTemplate(request, metadata)
    );

    if (result.ok) {
      const template = result.value.toObject();
      // Note: Template schema has id, name, content but proto has languageId, name, description, filesMap
      // We'll use the first file's content as the template content for now
      const files = template.filesMap.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, string>);
      const firstFile = Object.values(files)[0] || '';

      return {
        ok: true,
        value: {
          id: templateId,
          name: template.name,
          content: firstFile,
        },
      };
    }
    return result as Result<schemas.Template, ApiError>;
  },
};

/**
 * Execution gRPC API
 */
export const grpcExecutionAPI = {
  /**
   * Executes code via gRPC.
   */
  execute: async (
    request: schemas.ExecuteRequest
  ): Promise<Result<schemas.ExecuteResponse, ApiError>> => {
    const req = new executionPb.ExecuteRequest();
    req.setLanguage(request.language);

    const filesMap = req.getFilesMap();
    Object.entries(request.files).forEach(([name, content]) => {
      filesMap.set(name, content);
    });

    if (request.args) req.setArgs(request.args);
    if (request.stdin) req.setStdin(request.stdin);
    if (request.timeout_seconds) req.setTimeoutSeconds(request.timeout_seconds);

    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      executionClient.execute(req, metadata)
    );

    if (result.ok) {
      const response = result.value.toObject();
      return {
        ok: true,
        value: {
          request_id: response.requestId,
          success: response.success,
          events: response.eventsList.map(e => ({
            kind: (e.kind || 'output') as any,
            message: e.message,
            timestamp: e.timestamp?.seconds ? new Date(e.timestamp.seconds * 1000).toISOString() : new Date().toISOString(),
          })),
          metrics: response.metrics ? {
            compile_time_ms: response.metrics.compileTimeMs,
            run_time_ms: response.metrics.runTimeMs,
            memory_bytes: Number(response.metrics.memoryBytes),
          } : undefined,
          error: response.error,
        },
      };
    }
    return result as Result<schemas.ExecuteResponse, ApiError>;
  },
};

/**
 * Share gRPC API
 */
export const grpcShareAPI = {
  /**
   * Creates a new code share.
   */
  create: async (
    request: schemas.CreateShareRequest
  ): Promise<Result<schemas.Share, ApiError>> => {
    const req = new storagePb.CreateShareRequest();
    req.setLanguage(request.language);

    const filesMap = req.getFilesMap();
    Object.entries(request.files).forEach(([name, content]) => {
      filesMap.set(name, content);
    });

    if (request.title) req.setTitle(request.title);
    if (request.description) req.setDescription(request.description);
    if (request.expires_in_days) req.setExpiresInDays(request.expires_in_days);

    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      storageClient.createShare(req, metadata)
    );

    if (result.ok) {
      const share = result.value.toObject();
      return {
        ok: true,
        value: {
          id: share.id,
          language: share.language,
          files: share.filesMap.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
          title: share.title,
          description: share.description,
          created_at: share.createdAt?.seconds ? new Date(share.createdAt.seconds * 1000).toISOString() : '',
          expires_at: share.expiresAt?.seconds ? new Date(share.expiresAt.seconds * 1000).toISOString() : '',
          user_id: share.userId,
          view_count: Number(share.viewCount),
        },
      };
    }
    return result as Result<schemas.Share, ApiError>;
  },

  /**
   * Gets a shared code by ID.
   */
  get: async (id: string): Promise<Result<schemas.Share, ApiError>> => {
    const request = new storagePb.GetShareRequest();
    request.setId(id);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      storageClient.getShare(request, metadata)
    );

    if (result.ok) {
      const share = result.value.toObject();
      return {
        ok: true,
        value: {
          id: share.id,
          language: share.language,
          files: share.filesMap.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
          title: share.title,
          description: share.description,
          created_at: share.createdAt?.seconds ? new Date(share.createdAt.seconds * 1000).toISOString() : '',
          expires_at: share.expiresAt?.seconds ? new Date(share.expiresAt.seconds * 1000).toISOString() : '',
          user_id: share.userId,
          view_count: Number(share.viewCount),
        },
      };
    }
    return result as Result<schemas.Share, ApiError>;
  },

  /**
   * Deletes a shared code.
   */
  delete: async (id: string): Promise<Result<schemas.DeleteShareResponse, ApiError>> => {
    const request = new storagePb.DeleteShareRequest();
    request.setId(id);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      storageClient.deleteShare(request, metadata)
    );

    if (result.ok) {
      const response = result.value.toObject();
      return {
        ok: true,
        value: {
          deleted: response.deleted,
          message: response.message,
        },
      };
    }
    return result as Result<schemas.DeleteShareResponse, ApiError>;
  },
};

/**
 * Settings gRPC API
 */
export const grpcSettingsAPI = {
  /**
   * Saves user settings.
   */
  save: async (
    request: schemas.SaveSettingsRequest
  ): Promise<Result<schemas.UserSettings, ApiError>> => {
    const req = new storagePb.SaveSettingsRequest();
    if (request.user_id) req.setUserId(request.user_id);

    const settings = new storagePb.UserSettings();
    if (request.user_id) settings.setUserId(request.user_id);

    if (request.editor) {
      const editorSettings = new storagePb.EditorSettings();
      if (request.editor.font_size !== undefined) editorSettings.setFontSize(request.editor.font_size);
      if (request.editor.font_family) editorSettings.setFontFamily(request.editor.font_family);
      if (request.editor.tab_size !== undefined) editorSettings.setTabSize(request.editor.tab_size);
      if (request.editor.auto_save !== undefined) editorSettings.setAutoSave(request.editor.auto_save);
      if (request.editor.minimap !== undefined) editorSettings.setMinimap(request.editor.minimap);
      settings.setEditor(editorSettings);
    }

    if (request.theme) {
      const themeSettings = new storagePb.ThemeSettings();
      if (request.theme.theme) themeSettings.setTheme(request.theme.theme);
      if (request.theme.color_scheme) themeSettings.setColorScheme(request.theme.color_scheme);
      settings.setTheme(themeSettings);
    }

    req.setSettings(settings);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      storageClient.saveUserSettings(req, metadata)
    );

    if (result.ok) {
      const userSettings = result.value.toObject();
      return {
        ok: true,
        value: {
          user_id: userSettings.userId,
          editor: {
            font_size: userSettings.editor?.fontSize || 14,
            font_family: userSettings.editor?.fontFamily || 'monospace',
            tab_size: userSettings.editor?.tabSize || 2,
            auto_save: userSettings.editor?.autoSave || false,
            minimap: userSettings.editor?.minimap || false,
          },
          theme: {
            theme: (userSettings.theme?.theme || 'dark') as 'light' | 'dark' | 'auto',
            color_scheme: userSettings.theme?.colorScheme || 'vs-dark',
          },
        },
      };
    }
    return result as Result<schemas.UserSettings, ApiError>;
  },

  /**
   * Gets user settings.
   */
  get: async (userId: string): Promise<Result<schemas.UserSettings, ApiError>> => {
    const request = new storagePb.GetSettingsRequest();
    request.setUserId(userId);
    const metadata = getAuthMetadata();

    const result = await wrapGrpcCall(
      storageClient.getUserSettings(request, metadata)
    );

    if (result.ok) {
      const userSettings = result.value.toObject();
      return {
        ok: true,
        value: {
          user_id: userSettings.userId,
          editor: {
            font_size: userSettings.editor?.fontSize || 14,
            font_family: userSettings.editor?.fontFamily || 'monospace',
            tab_size: userSettings.editor?.tabSize || 2,
            auto_save: userSettings.editor?.autoSave || false,
            minimap: userSettings.editor?.minimap || false,
          },
          theme: {
            theme: (userSettings.theme?.theme || 'dark') as 'light' | 'dark' | 'auto',
            color_scheme: userSettings.theme?.colorScheme || 'vs-dark',
          },
        },
      };
    }
    return result as Result<schemas.UserSettings, ApiError>;
  },
};

/**
 * Auth gRPC API
 */
export const grpcAuthAPI = {
  /**
   * Registers a new user.
   */
  register: async (
    request: schemas.RegisterRequest
  ): Promise<Result<schemas.AuthResponse, ApiError>> => {
    const req = new authPb.RegisterRequest();
    req.setName(request.name);
    req.setEmail(request.email);
    req.setPassword(request.password);

    const result = await wrapGrpcCall(
      authClient.register(req, {})
    );

    if (result.ok) {
      const response = result.value.toObject();
      // Tokens are now set as httpOnly cookies by the backend
      return {
        ok: true,
        value: {
          user: {
            id: response.user?.id || '',
            email: response.user?.email || '',
            name: response.user?.name || '',
            roles: response.user?.rolesList || [],
          },
        },
      };
    }
    return result as Result<schemas.AuthResponse, ApiError>;
  },

  /**
   * Logs in a user.
   */
  login: async (
    request: schemas.LoginRequest
  ): Promise<Result<schemas.AuthResponse, ApiError>> => {
    const req = new authPb.LoginRequest();
    const emailPass = new authPb.EmailPassword();
    emailPass.setEmail(request.email);
    emailPass.setPassword(request.password);
    req.setEmailPassword(emailPass);

    const result = await wrapGrpcCall(
      authClient.login(req, {})
    );

    if (result.ok) {
      const response = result.value.toObject();
      // Tokens are now set as httpOnly cookies by the backend
      return {
        ok: true,
        value: {
          user: {
            id: response.user?.id || '',
            email: response.user?.email || '',
            name: response.user?.name || '',
            roles: response.user?.rolesList || [],
          },
        },
      };
    }
    return result as Result<schemas.AuthResponse, ApiError>;
  },

  /**
   * Refreshes access token.
   */
  refresh: async (
    request: schemas.RefreshTokenRequest
  ): Promise<Result<schemas.RefreshTokenResponse, ApiError>> => {
    const req = new authPb.RefreshTokenRequest();
    req.setRefreshToken(request.refresh_token);

    const result = await wrapGrpcCall(
      authClient.refreshToken(req, {})
    );

    if (result.ok) {
      // Tokens are now set as httpOnly cookies by the backend
      return {
        ok: true,
        value: {
          success: true,
        },
      };
    }
    return result as Result<schemas.RefreshTokenResponse, ApiError>;
  },

  /**
   * Gets current user information.
   * NOTE: GetMe RPC not available in auth.proto - use VerifyToken instead
   */
  getMe: async (): Promise<Result<schemas.User, ApiError>> => {
    // TODO: Implement using VerifyToken RPC
    return {
      ok: false,
      error: new ApiError('GetMe not implemented via gRPC', 'NOT_IMPLEMENTED'),
    };
  },
};
