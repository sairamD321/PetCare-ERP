import type { BlueprintRepository, RecordRepository } from '@/application/ports';
import { apiVersion, pageInfo, pageParams, pagingOfUrl, type DataTableBlueprint, type SearchBlueprint } from '@/domain/blueprint/dataTable';
import { responseItems } from '@/domain/blueprint/formBlueprint';
import { AppError } from '@/domain/shared/errors';
import { fillPath, query, type HttpClient } from '../http/HttpClient';

export class HttpBlueprintRepository implements BlueprintRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  get<T>(url: string, version = 'v1'): Promise<T> {
    return this.http.cached<T>(fillPath(url, version));
  }

  // One page of a list api (e.g. dropdown options). `index` 0 is the first page, whatever the server's
  // numbering; `size` replaces the page size in the url (e.g. "…/brands?size=20&page=0").
  async page(url: string, version: string, index: number, size: number): Promise<{ items: unknown[]; hasNext: boolean }> {
    const [path, existing = ''] = fillPath(url, version).split('?');
    const paging = { ...pagingOfUrl(url), size };
    const params = new URLSearchParams(existing);
    for (const [key, value] of Object.entries(pageParams(paging, index))) params.set(key, value);
    const response = await this.http.cached<unknown>(`${path}?${params.toString()}`);
    const items = responseItems(response);
    return { items, hasNext: items.length > 0 && pageInfo(response, items.length, paging, index).hasNext };
  }

  list(table: DataTableBlueprint, params: Record<string, string>, search: SearchBlueprint | null): Promise<unknown> {
    const dataApi = search?.dataApi ?? search?.searchApi ?? table.dataApi;
    if (!dataApi) throw new AppError('The data-table blueprint does not define a data API.', 0);
    const [path, existing = ''] = fillPath(dataApi, apiVersion(table)).split('?');
    // Params replace the ones already in the url (e.g. page=0 in "…/products?size=20&page=0").
    const merged = new URLSearchParams(existing);
    for (const [key, value] of new URLSearchParams(query(params))) merged.set(key, value);
    const q = merged.toString();
    return this.http.get(q ? `${path}?${q}` : path);
  }
}

export class HttpRecordRepository implements RecordRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  // POSTs to the blueprint's createApi exactly as given (only {version} is filled in).
  create(url: string, version: string, body: FormData): Promise<unknown> {
    return this.http.post(fillPath(url, version), body);
  }

  get(url: string, version: string, recordId: string): Promise<unknown> {
    return this.http.get(fillPath(url, version, recordId));
  }

  update(url: string, version: string, recordId: string, changes: Record<string, unknown>): Promise<unknown> {
    return this.http.put(fillPath(url, version, recordId), changes);
  }

  remove(url: string, version: string, recordId: string): Promise<void> {
    return this.http.delete(fillPath(url, version, recordId));
  }
}
