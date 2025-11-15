/**
 * gRPC-Web client wrapper for StorageService
 * Provides a clean TypeScript API for storage and sharing via gRPC
 */

import { StorageServiceClient } from '../generated/storage/v1/StorageServiceClientPb';
import * as storagePb from '../generated/storage/v1/storage_pb';
import { getGrpcMetadata, GRPC_GATEWAY_URL } from './config';

/**
 * TypeScript interfaces matching protobuf messages
 */
export interface CreateShareRequest {
  language: string;
  files: Record<string, string>;
  title?: string;
  description?: string;
  expiresInDays?: number;
  userId?: string;
}

export interface Share {
  id: string;
  language: string;
  files: Record<string, string>;
  title: string;
  description: string;
  createdAt: string;
  expiresAt: string;
  userId: string;
  viewCount: number;
}

export interface GetShareRequest {
  id: string;
}

export interface DeleteShareRequest {
  id: string;
  userId: string;
}

export interface DeleteShareResponse {
  deleted: boolean;
  message: string;
}

export interface SaveSettingsRequest {
  userId: string;
  settings: UserSettings;
}

export interface UserSettings {
  userId: string;
  editor?: EditorSettings;
  theme?: ThemeSettings;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  autoSave: boolean;
  minimap: boolean;
}

export interface ThemeSettings {
  theme: string;
  colorScheme: string;
}

export interface GetSettingsRequest {
  userId: string;
}

/**
 * gRPC-Web client for StorageService
 */
export class GrpcStorageClient {
  private client: StorageServiceClient;

  constructor(hostname: string = GRPC_GATEWAY_URL) {
    this.client = new StorageServiceClient(hostname, null, null);
  }

  /**
   * Create a shareable code snippet
   */
  async createShare(request: CreateShareRequest): Promise<Share> {
    const req = new storagePb.CreateShareRequest();
    req.setLanguage(request.language);

    const filesMap = req.getFilesMap();
    Object.entries(request.files).forEach(([key, value]) => {
      filesMap.set(key, value);
    });

    if (request.title) req.setTitle(request.title);
    if (request.description) req.setDescription(request.description);
    if (request.expiresInDays) req.setExpiresInDays(request.expiresInDays);
    if (request.userId) req.setUserId(request.userId);

    return new Promise((resolve, reject) => {
      this.client.createShare(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC CreateShare failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC CreateShare'));
          return;
        }

        resolve(this.parseShare(response));
      });
    });
  }

  /**
   * Retrieve a shared code snippet
   */
  async getShare(request: GetShareRequest): Promise<Share> {
    const req = new storagePb.GetShareRequest();
    req.setId(request.id);

    return new Promise((resolve, reject) => {
      this.client.getShare(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC GetShare failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC GetShare'));
          return;
        }

        resolve(this.parseShare(response));
      });
    });
  }

  /**
   * Delete a shared code snippet
   */
  async deleteShare(request: DeleteShareRequest): Promise<DeleteShareResponse> {
    const req = new storagePb.DeleteShareRequest();
    req.setId(request.id);
    req.setUserId(request.userId);

    return new Promise((resolve, reject) => {
      this.client.deleteShare(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC DeleteShare failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC DeleteShare'));
          return;
        }

        resolve({
          deleted: response.getDeleted(),
          message: response.getMessage(),
        });
      });
    });
  }

  /**
   * Save user settings
   */
  async saveUserSettings(request: SaveSettingsRequest): Promise<UserSettings> {
    const req = new storagePb.SaveSettingsRequest();
    req.setUserId(request.userId);

    const settings = new storagePb.UserSettings();
    settings.setUserId(request.settings.userId);

    if (request.settings.editor) {
      const editorSettings = new storagePb.EditorSettings();
      editorSettings.setFontSize(request.settings.editor.fontSize);
      editorSettings.setFontFamily(request.settings.editor.fontFamily);
      editorSettings.setTabSize(request.settings.editor.tabSize);
      editorSettings.setAutoSave(request.settings.editor.autoSave);
      editorSettings.setMinimap(request.settings.editor.minimap);
      settings.setEditor(editorSettings);
    }

    if (request.settings.theme) {
      const themeSettings = new storagePb.ThemeSettings();
      themeSettings.setTheme(request.settings.theme.theme);
      themeSettings.setColorScheme(request.settings.theme.colorScheme);
      settings.setTheme(themeSettings);
    }

    req.setSettings(settings);

    return new Promise((resolve, reject) => {
      this.client.saveUserSettings(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC SaveUserSettings failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC SaveUserSettings'));
          return;
        }

        resolve(this.parseUserSettings(response));
      });
    });
  }

  /**
   * Retrieve user settings
   */
  async getUserSettings(request: GetSettingsRequest): Promise<UserSettings> {
    const req = new storagePb.GetSettingsRequest();
    req.setUserId(request.userId);

    return new Promise((resolve, reject) => {
      this.client.getUserSettings(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC GetUserSettings failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC GetUserSettings'));
          return;
        }

        resolve(this.parseUserSettings(response));
      });
    });
  }

  /**
   * Parse Share from protobuf
   */
  private parseShare(share: storagePb.Share): Share {
    const files: Record<string, string> = {};
    share.getFilesMap().forEach((value, key) => {
      files[key] = value;
    });

    return {
      id: share.getId(),
      language: share.getLanguage(),
      files,
      title: share.getTitle(),
      description: share.getDescription(),
      createdAt: share.getCreatedAt()?.toDate().toISOString() || '',
      expiresAt: share.getExpiresAt()?.toDate().toISOString() || '',
      userId: share.getUserId(),
      viewCount: share.getViewCount(),
    };
  }

  /**
   * Parse UserSettings from protobuf
   */
  private parseUserSettings(settings: storagePb.UserSettings): UserSettings {
    const editor = settings.getEditor();
    const theme = settings.getTheme();

    return {
      userId: settings.getUserId(),
      editor: editor
        ? {
            fontSize: editor.getFontSize(),
            fontFamily: editor.getFontFamily(),
            tabSize: editor.getTabSize(),
            autoSave: editor.getAutoSave(),
            minimap: editor.getMinimap(),
          }
        : undefined,
      theme: theme
        ? {
            theme: theme.getTheme(),
            colorScheme: theme.getColorScheme(),
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const grpcStorageClient = new GrpcStorageClient();
