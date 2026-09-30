/**
 * Envelopes de resposta do framework Detrasoft (framework-api).
 *
 * Declarados localmente de propósito: a `@detrasoft.com/detra-ng` não expõe
 * `ResponseNotification` nem `ResponseList`, e a lib não pode depender do
 * `core/` de nenhum app hospedeiro.
 */

/** Espelha `com.detrasoft.framework.core.notification.MessageType` (serializa em minúsculas). */
export type ApiMessageType = 'error' | 'success' | 'warning' | 'info';

/** Espelha `com.detrasoft.framework.core.notification.Message`. */
export interface ApiMessage {
  code?: string;
  target?: string;
  type?: ApiMessageType;
  description?: string;
}

/**
 * Espelha `ResponseNotification<T>`.
 *
 * Atenção: o backend responde HTTP 2xx mesmo quando há erro de negócio —
 * o erro chega em `messages[].type === 'error'`. Use `hasApiErrors()`.
 */
export interface ResponseNotification<T> {
  timestamp?: string;
  status?: number;
  title?: string;
  detail?: string;
  path?: string;
  messages?: ApiMessage[];
  data?: T;
}

/** Página do Spring Data (`Page<T>`). */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

/** Espelha `com.detrasoft.framework.api.dto.SearchReponseDTO` do GenericSearchController. */
export interface GenericSearchResponse<T> {
  title?: string;
  data?: PageResponse<T>;
  columns?: Array<{
    label?: string;
    field?: string;
    hidden?: boolean;
    principal?: boolean;
    key?: boolean;
    type?: string;
  }>;
  messages?: ApiMessage[];
  totalRecords?: number;
}

/** Espelha `AuditDTO`. */
export interface AuditInfo {
  createdAt?: string;
  updatedAt?: string;
  userCreated?: string;
  userUpdated?: string;
}

/** Erro de validação (consumido pelo `<ds-error-panel>` da detra-ng). */
export interface ApiFieldError {
  fieldName: string;
  message: string;
}

export interface ApiValidationError {
  detail: string;
  title: string;
  status: number;
  errors: ApiFieldError[];
  path?: string;
  timestamp?: string;
}

/** Página vazia — útil como fallback em `catchError`. */
export function emptyPage<T>(size = 10): PageResponse<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };
}
