import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { WEB_AUTH_CONFIG } from '../web-auth.config';
import { GenericSearchResponse, PageResponse, ResponseNotification } from '../models/api-response.model';
import {
  UserAccess,
  UserAccessFilter,
  UserCreatePayload,
  UserUpdatePayload,
  UserProfileUpdatePayload,
  ChangePasswordPayload,
  ChangeEmailPayload,
} from '../models/user-access.model';
import { unwrapNotification } from '../utils/notification.util';

/**
 * Acesso ao recurso `/users` e `/search/user` do authorization-server.
 *
 * Não lê `environment` nem serviços do app hospedeiro: a URL vem do
 * `WEB_AUTH_CONFIG` e o `Authorization` é anexado pelo interceptor de HTTP do
 * hospedeiro, já que a lib injeta o `HttpClient` compartilhado.
 */
@Injectable({ providedIn: 'root' })
export class UserAccessService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WEB_AUTH_CONFIG);

  private get resourceUrl(): string {
    return `${this.config.baseUrl}${this.config.apiPath}/users`;
  }

  private get searchUrl(): string {
    return `${this.config.baseUrl}${this.config.apiPath}/search/user`;
  }

  /**
   * Busca paginada usando o `GenericSearchController` (`GET /search/user`)
   * configurado em `searches/user.json`.
   *
   * @param page Página **1-indexada**, como emitida pelo `<ds-list>`.
   *             Convertida para a base 0 do `Pageable` do Spring.
   */
  search(
    filter: UserAccessFilter = {},
    page = 1,
    size = this.config.pageSize,
  ): Observable<PageResponse<UserAccess>> {
    let params = new HttpParams()
      .set('page', String(Math.max(0, page - 1)))
      .set('size', String(size))
      .set('sort', 'userName,asc');

    // Usa 'any' para busca textual dinâmica em nome, e-mail e colunas públicas.
    const term = filter.any?.trim() || filter.name?.trim() || filter.email?.trim();
    if (term) {
      params = params.set('any', term);
    }

    return this.http
      .get<GenericSearchResponse<UserAccess> | PageResponse<UserAccess>>(this.searchUrl, { params })
      .pipe(
        map(response => {
          if (response && 'data' in response && response.data?.content) {
            return {
              content: response.data.content,
              totalElements: response.totalRecords ?? response.data.totalElements ?? 0,
              totalPages: response.data.totalPages ?? 1,
              size: response.data.size ?? size,
              number: response.data.number ?? 0,
            };
          }
          if (response && 'content' in response) {
            return response as PageResponse<UserAccess>;
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
   * Usuário completo — este é o único endpoint que devolve `profiles`
   * preenchido (a listagem usa a view `findAll`, que omite o campo).
   * Responde o DTO puro, sem envelope.
   */
  getById(id: string): Observable<UserAccess> {
    return this.http.get<UserAccess>(`${this.resourceUrl}/${id}`);
  }

  /**
   * Cria o usuário. Omitir `password` faz o backend enviar o e-mail de
   * "definir senha" — é o fluxo de convite.
   *
   * Erro de negócio (ex.: limite de 2 usuários do plano Starter) chega com
   * HTTP 201 dentro de `messages`, então `unwrapNotification` é obrigatório.
   */
  create(payload: UserCreatePayload): Observable<UserAccess> {
    return this.http
      .post<ResponseNotification<UserAccess>>(this.resourceUrl, payload)
      .pipe(map(response => unwrapNotification(response, 'Não foi possível criar o usuário.')));
  }

  /**
   * Atualiza o usuário.
   *
   * `email`, `phone`, `type` e `business` são ignorados pelo backend
   * (`beforeInitUpdate` os restaura do registro original), por isso o payload
   * não os inclui.
   */
  update(payload: UserUpdatePayload): Observable<UserAccess> {
    return this.http
      .put<ResponseNotification<UserAccess>>(`${this.resourceUrl}/${payload.id}`, payload)
      .pipe(map(response => unwrapNotification(response, 'Não foi possível salvar o usuário.')));
  }

  /** Ativa/inativa o usuário via PATCH parcial. */
  setInactive(id: string, inactive: boolean): Observable<UserAccess> {
    return this.http
      .patch<ResponseNotification<UserAccess>>(`${this.resourceUrl}/${id}`, { id, inactive })
      .pipe(
        map(response =>
          unwrapNotification(
            response,
            inactive ? 'Não foi possível inativar o usuário.' : 'Não foi possível ativar o usuário.',
          ),
        ),
      );
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ResponseNotification<void>>(`${this.resourceUrl}/${id}`)
      .pipe(
        map(response => {
          unwrapNotification(response, 'Não foi possível excluir o usuário.');
        }),
      );
  }

  /**
   * Atualização de dados pessoais / perfil (Meus Dados).
   * Atualiza nome, sobrenome, telefone, avatar e configs de exibição (ex.: SCALE_APP).
   */
  updateProfile(payload: UserProfileUpdatePayload): Observable<UserAccess> {
    return this.http
      .put<ResponseNotification<UserAccess>>(`${this.resourceUrl}/${payload.id}`, payload)
      .pipe(map(response => unwrapNotification(response, 'Não foi possível salvar os dados do usuário.')));
  }

  /**
   * Upload de foto de perfil (avatar público) no storage-server.
   */
  uploadAvatar(file: File, userId: string): Observable<string> {
    const storageBase = this.config.storageBaseUrl ?? this.config.baseUrl;
    const storagePath = this.config.storagePath ?? '/storage-server';
    const url = `${storageBase}${storagePath}/file/public/avatar-users/${userId}/confirmed?uniqueFile=true`;

    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<{ data?: { url?: string }; url?: string }>(url, formData)
      .pipe(map(res => res?.data?.url ?? res?.url ?? ''));
  }

  /**
   * Alteração de senha de acesso do usuário logado.
   */
  changePassword(
    oldPassword: string,
    newPassword: string,
    confirmNewPassword?: string,
  ): Observable<void> {
    const url = `${this.config.baseUrl}${this.config.apiPath}/auth/change_password`;
    const body: ChangePasswordPayload = {
      oldPassword,
      newPassword,
      confirmNewPassword: confirmNewPassword ?? newPassword,
    };
    return this.http.post<void>(url, body);
  }

  /**
   * Valida se um e-mail já está sendo utilizado por outro usuário no sistema.
   * Retorna true se já existe, false se está disponível.
   * Se excludeId for informado, desconsidera o usuário com esse ID (útil em edição).
   */
  checkEmailExists(email: string, excludeId?: string | null): Observable<boolean> {
    const url = `${this.config.baseUrl}${this.config.apiPath}/public/existing-user-validation`;
    const params: Record<string, string> = { email: email.trim() };
    if (excludeId) {
      params['excludeId'] = excludeId;
    }
    return this.http.get<boolean>(url, { params });
  }

  /**
   * Alteração do e-mail de acesso do usuário logado.
   */
  changeEmail(newEmail: string, password?: string): Observable<void> {
    const url = `${this.config.baseUrl}${this.config.apiPath}/auth/change_email`;
    const body: ChangeEmailPayload = {
      newEmail: newEmail.trim(),
      ...(password ? { password: password.trim() } : {}),
    };
    return this.http.post<void>(url, body);
  }
}
