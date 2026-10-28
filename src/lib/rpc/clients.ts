/**
 * Typed clients for the five public services (playground.api.v1).
 *
 * Usage:
 *   const api = createApiClients(createApiTransport());
 *   const { languages } = await api.language.listLanguages({});
 */
import { createClient, type Client, type Transport } from '@connectrpc/connect';
import {
  AuthService,
  ExecutionService,
  LanguageService,
  SettingsService,
  ShareService,
} from '@kingsejong-lang/playground-proto';

export interface ApiClients {
  auth: Client<typeof AuthService>;
  execution: Client<typeof ExecutionService>;
  language: Client<typeof LanguageService>;
  settings: Client<typeof SettingsService>;
  share: Client<typeof ShareService>;
}

export function createApiClients(transport: Transport): ApiClients {
  return {
    auth: createClient(AuthService, transport),
    execution: createClient(ExecutionService, transport),
    language: createClient(LanguageService, transport),
    settings: createClient(SettingsService, transport),
    share: createClient(ShareService, transport),
  };
}
