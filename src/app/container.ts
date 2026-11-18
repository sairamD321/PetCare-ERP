import type { Services } from '@/application/services';
import { AuthService } from '@/application/services/AuthService';
import { assetUrl } from '@/infrastructure/http/assetUrl';
import { HttpClient } from '@/infrastructure/http/HttpClient';
import { decodeJwt } from '@/infrastructure/http/jwt';
import { HttpAuthGateway } from '@/infrastructure/repositories/HttpAuthGateway';
import { HttpBlueprintRepository, HttpRecordRepository } from '@/infrastructure/repositories/HttpBlueprintRepository';
import {
  HttpAccountRepository,
  HttpOrderRepository,
  HttpPetRepository,
  HttpProductRepository,
  HttpSettingsRepository,
} from '@/infrastructure/repositories/HttpCatalogRepositories';
import { HttpMenuRepository } from '@/infrastructure/repositories/HttpMenuRepository';
import { LocalCartStorage } from '@/infrastructure/storage/LocalCartStorage';
import { LocalSessionStore } from '@/infrastructure/storage/LocalSessionStore';

// Composition root: the only place that knows which implementation backs each port.
export function createServices(): Services {
  const sessions = new LocalSessionStore();
  const http = new HttpClient(sessions);
  // New login or logout: never reuse the previous session's menu or blueprints.
  sessions.onChange(() => http.clearCache());

  return {
    auth: new AuthService(new HttpAuthGateway(http), sessions, decodeJwt),
    menus: new HttpMenuRepository(http),
    blueprints: new HttpBlueprintRepository(http),
    records: new HttpRecordRepository(http),
    products: new HttpProductRepository(http),
    pets: new HttpPetRepository(http),
    orders: new HttpOrderRepository(http),
    accounts: new HttpAccountRepository(http),
    settings: new HttpSettingsRepository(http),
    cartStorage: new LocalCartStorage(),
    assetUrl,
  };
}
