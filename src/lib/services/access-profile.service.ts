import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { WEB_AUTH_CONFIG } from '../web-auth.config';
import { GenericSearchResponse, PageResponse, ResponseNotification } from '../models/api-response.model';
import { AccessProfile, AccessProfilePayload, AccessRole } from '../models/access-profile.model';
import { unwrapNotification } from '../utils/notification.util';

/** Tamanho de página usado para carregar o catálogo completo de permissões. */
const ROLE_CATALOG_PAGE_SIZE = 500;

/**
 * Acesso aos recursos `/profiles`, `/search/profile` e `/roles` do authorization-server.
 *
 * O tenant (`detrasoftId`) é resolvido no servidor a partir do JWT
 * (`ProfileCRUDService.beforeInsert` e `GenericContext` via `searches/profile.json`),
 * então a lib permanece agnóstica a tenant.
 */
@Injectable({ providedIn: 'root' })
export class AccessProfileService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WEB_AUTH_CONFIG);

  private get cleanBaseUrl(): string {
    return (this.config.baseUrl || '').replace(/\/+$/, '');
  }

  private get cleanApiPath(): string {
    return (this.config.apiPath || '/authorization-server').replace(/^\/+|\/+$/g, '');
  }

  private buildApiUrl(subpath: string): string {
    const cleanSub = subpath.replace(/^\/+/, '');
    return this.cleanApiPath
      ? `${this.cleanBaseUrl}/${this.cleanApiPath}/${cleanSub}`
      : `${this.cleanBaseUrl}/${cleanSub}`;
  }

  private get profilesUrl(): string {
    return this.buildApiUrl('profiles');
  }

  private get searchUrl(): string {
    return this.buildApiUrl('search/profile');
  }

  private get rolesUrl(): string {
    return this.buildApiUrl('roles');
  }

  /**
   * Lista paginada de perfis usando o `GenericSearchController` (`GET /search/profile`)
   * configurado em `searches/profile.json`.
   *
   * @param page Página **1-indexada** (padrão do `<ds-list>`), convertida para
   *             a base 0 do `Pageable`.
   * @param size Quantidade de registros por página.
   * @param search Termo opcional para busca textual (`any`).
   */
  list(
    page = 1,
    size = this.config.pageSize,
    search?: string,
  ): Observable<PageResponse<AccessProfile>> {
    let params = new HttpParams()
      .set('page', String(Math.max(0, page - 1)))
      .set('size', String(size))
      .set('sort', 'name,asc');

    if (search?.trim()) {
      params = params.set('any', search.trim());
    }

    return this.http
      .get<GenericSearchResponse<AccessProfile> | PageResponse<AccessProfile>>(this.searchUrl, { params })
      .pipe(
        map(response => {
          if (response && 'data' in response && response.data?.content) {
            return {
              content: response.data.content.map(item => ({
                ...item,
                roles: item.roles ?? [],
              })),
              totalElements: response.totalRecords ?? response.data.totalElements ?? 0,
              totalPages: response.data.totalPages ?? 1,
              size: response.data.size ?? size,
              number: response.data.number ?? 0,
            };
          }
          if (response && 'content' in response) {
            return response as PageResponse<AccessProfile>;
          }
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size,
            number: 0,
          };
        }),
      );
  }

  /**
   * Alias semântico para busca com filtros compatível com `GenericSearchController`.
   */
  search(
    filter: { name?: string; any?: string } = {},
    page = 1,
    size = this.config.pageSize,
  ): Observable<PageResponse<AccessProfile>> {
    return this.list(page, size, filter.any || filter.name);
  }

  /** Perfil completo, com `roles` já resolvidas. Responde o DTO puro. */
  getById(id: string): Observable<AccessProfile> {
    return this.http.get<AccessProfile>(`${this.profilesUrl}/${id}`);
  }

  /**
   * Catálogo de permissões disponíveis (`GET /roles`).
   *
   * Vem como `Page<RoleDTO>` — lista plana de `code` + `name`. Sem seed em
   * migration: o catálogo é o que estiver cadastrado no ambiente.
   */
  listRoles(): Observable<AccessRole[]> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', String(ROLE_CATALOG_PAGE_SIZE))
      .set('sort', 'code,asc');

    return this.http
      .get<PageResponse<AccessRole>>(this.rolesUrl, { params })
      .pipe(map(response => response?.content ?? []));
  }

  /**
   * Cria o perfil com as permissões no mesmo request — `roles` é uma lista
   * plana de `AccessRole` e o backend monta os registros de junção.
   */
  create(payload: AccessProfilePayload): Observable<AccessProfile> {
    return this.http
      .post<ResponseNotification<AccessProfile>>(this.profilesUrl, payload)
      .pipe(map(response => unwrapNotification(response, 'Não foi possível criar o perfil.')));
  }

  update(payload: AccessProfilePayload): Observable<AccessProfile> {
    return this.http
      .put<ResponseNotification<AccessProfile>>(`${this.profilesUrl}/${payload.id}`, payload)
      .pipe(map(response => unwrapNotification(response, 'Não foi possível salvar o perfil.')));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ResponseNotification<void>>(`${this.profilesUrl}/${id}`)
      .pipe(
        map(response => {
          unwrapNotification(response, 'Não foi possível excluir o perfil.');
        }),
      );
  }
}
