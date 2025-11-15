/**
 * gRPC-Web client wrapper for LanguageService
 * Provides a clean TypeScript API for language management via gRPC
 */

import { LanguageServiceClient } from '../generated/language/v1/LanguageServiceClientPb';
import * as languagePb from '../generated/language/v1/language_pb';
import { getGrpcMetadata, GRPC_GATEWAY_URL } from './config';

/**
 * TypeScript interfaces matching protobuf messages
 */
export interface Language {
  id: string;
  name: string;
  version: string;
  extensions: string[];
  capabilities: string[];
  spec?: LanguageSpec;
}

export interface LanguageSpec {
  dockerImage: string;
  compileCmd: string;
  runCmd: string;
  defaultTimeout: number;
  defaultMemoryLimit: number;
  envVars: EnvVar[];
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface Template {
  languageId: string;
  name: string;
  description: string;
  files: Record<string, string>;
}

export interface ListLanguagesRequest {
  // No parameters for now
}

export interface ListLanguagesResponse {
  languages: Language[];
}

export interface GetLanguageRequest {
  id: string;
}

export interface GetTemplateRequest {
  languageId: string;
  templateType?: string;
}

/**
 * gRPC-Web client for LanguageService
 */
export class GrpcLanguageClient {
  private client: LanguageServiceClient;

  constructor(hostname: string = GRPC_GATEWAY_URL) {
    this.client = new LanguageServiceClient(hostname, null, null);
  }

  /**
   * List all supported languages
   */
  async listLanguages(request: ListLanguagesRequest = {}): Promise<ListLanguagesResponse> {
    const req = new languagePb.ListLanguagesRequest();

    return new Promise((resolve, reject) => {
      this.client.listLanguages(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC ListLanguages failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC ListLanguages'));
          return;
        }

        const languages: Language[] = response.getLanguagesList().map((lang) => this.parseLanguage(lang));

        resolve({ languages });
      });
    });
  }

  /**
   * Get details about a specific language
   */
  async getLanguage(request: GetLanguageRequest): Promise<Language> {
    const req = new languagePb.GetLanguageRequest();
    req.setId(request.id);

    return new Promise((resolve, reject) => {
      this.client.getLanguage(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC GetLanguage failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC GetLanguage'));
          return;
        }

        resolve(this.parseLanguage(response));
      });
    });
  }

  /**
   * Get code template for a language
   */
  async getLanguageTemplate(request: GetTemplateRequest): Promise<Template> {
    const req = new languagePb.GetTemplateRequest();
    req.setLanguageId(request.languageId);
    if (request.templateType) {
      req.setTemplateType(request.templateType);
    }

    return new Promise((resolve, reject) => {
      this.client.getLanguageTemplate(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC GetLanguageTemplate failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC GetLanguageTemplate'));
          return;
        }

        const files: Record<string, string> = {};
        response.getFilesMap().forEach((value, key) => {
          files[key] = value;
        });

        resolve({
          languageId: response.getLanguageId(),
          name: response.getName(),
          description: response.getDescription(),
          files,
        });
      });
    });
  }

  /**
   * Parse Language from protobuf
   */
  private parseLanguage(lang: languagePb.Language): Language {
    const spec = lang.getSpec();

    return {
      id: lang.getId(),
      name: lang.getName(),
      version: lang.getVersion(),
      extensions: lang.getExtensionsList(),
      capabilities: lang.getCapabilitiesList(),
      spec: spec
        ? {
            dockerImage: spec.getDockerImage(),
            compileCmd: spec.getCompileCmd(),
            runCmd: spec.getRunCmd(),
            defaultTimeout: spec.getDefaultTimeout(),
            defaultMemoryLimit: spec.getDefaultMemoryLimit(),
            envVars: spec.getEnvVarsList().map((ev) => ({
              key: ev.getKey(),
              value: ev.getValue(),
            })),
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const grpcLanguageClient = new GrpcLanguageClient();
