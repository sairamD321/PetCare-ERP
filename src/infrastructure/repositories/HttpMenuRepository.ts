import type { MenuRepository } from '@/application/ports';
import { menuTarget, type MenuGroup } from '@/domain/menu/menu';
import { AppError } from '@/domain/shared/errors';
import type { HttpClient } from '../http/HttpClient';

interface MenuLinksResponse {
  records?: {
    mainMenuCode: string;
    mainMenuName: string;
    icon?: string | null;
    subMenuList?: {
      subMenuCode: string;
      subMenuName: string;
      moduleCode?: string;
      moduleName?: string | null;
      accessLevel?: string;
      order?: number;
      url?: string | null;
      dataTableBluePrintUrl?: string | null;
      searchBluePrintUrl?: string | null;
    }[];
  }[];
  errorMessages?: string[];
}

// GET /users/api/menulinks: navigation for the signed-in user's profile (resolved from the token).
// Main menus keep the backend's order; submenus are sorted by `order`. Empty folders are dropped.
export class HttpMenuRepository implements MenuRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async menus(): Promise<MenuGroup[]> {
    const data = await this.http.cached<MenuLinksResponse>('/users/api/menulinks');
    const records = Array.isArray(data?.records) ? data.records : [];
    if (!records.length && data?.errorMessages?.length) throw new AppError(data.errorMessages.join('; '), 200);
    return records
      .map((m) => ({
        code: m.mainMenuCode,
        name: m.mainMenuName,
        icon: m.icon ?? null,
        items: (m.subMenuList ?? [])
          .map((s) => ({
            code: s.subMenuCode,
            name: s.subMenuName,
            moduleCode: s.moduleCode,
            moduleName: s.moduleName ?? null,
            accessLevel: s.accessLevel,
            order: s.order ?? 0,
            dataTableBluePrintUrl: s.dataTableBluePrintUrl ?? null,
            searchBluePrintUrl: s.searchBluePrintUrl ?? null,
            ...menuTarget(s.url, m.mainMenuCode, s.subMenuCode),
          }))
          .sort((a, b) => a.order - b.order),
      }))
      .filter((m) => m.items.length);
  }
}
