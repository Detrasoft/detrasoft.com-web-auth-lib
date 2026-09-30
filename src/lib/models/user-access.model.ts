import { AccessProfile } from './access-profile.model';
import { AuditInfo } from './api-response.model';

/** Espelha `com.detrasoft.framework.security.model.UserType`. */
export type UserType = 'Admin' | 'Default' | 'SiteApp';

export const USER_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: UserType }> = [
  { label: 'Administrador', value: 'Admin' },
  { label: 'Padrão', value: 'Default' },
];

export type SocialProvider = 'GOOGLE' | 'APPLE' | 'OTP';

export function userTypeLabel(type?: UserType | null): string {
  return USER_TYPE_OPTIONS.find(option => option.value === type)?.label ?? 'Padrão';
}

/**
 * Usuário do workspace — espelha `UserDTO` do authorization-server.
 *
 * `profiles` só vem preenchido em `GET /users/{id}` (a listagem usa a view
 * `findAll`, que omite o campo).
 *
 * `detrasoftId` (tenant) é derivado do JWT no `UserCRUDService.beforeInsert`;
 * a lib nunca o envia.
 */
export interface UserConfigItem {
  id?: string;
  name: string;
  value: string;
}

export interface UserAccess {
  id?: string;
  userName?: string;
  firstName: string;
  lastName: string;
  email: string;
  type?: UserType;
  phone?: string;
  business?: string;
  urlImg?: string;
  urlHome?: string;
  language?: string;
  inactive?: boolean;
  provider?: SocialProvider | null;
  audit?: AuditInfo;
  profiles?: AccessProfile[];
  configs?: UserConfigItem[];
}

/**
 * Campos que o backend **ignora** em atualizações.
 *
 * `UserCRUDService.beforeInitUpdate` recarrega o registro original e sobrescreve
 * `email`, `phone`, `type`, `business` e `detrasoftId` antes de salvar. Ou seja:
 * são imutáveis após a criação. O app legado permitia editá-los e a alteração
 * era descartada em silêncio — aqui os campos aparecem desabilitados.
 */
export const IMMUTABLE_AFTER_CREATE = ['business'] as const;

/** Payload de criação. Sem `password`: ver `UserCreatePayload`. */
export interface UserCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  type: UserType;
  /**
   * Opcional de propósito. Quando omitido, o `afterInsert` do backend dispara
   * o e-mail de "definir senha" para o endereço informado (usando o header
   * `Origin` para montar o link) — é assim que o convite acontece.
   */
  password?: string;
  profiles?: Array<{ id?: string; name: string }>;
}

/** Payload de atualização do usuário pelo administrador. */
export interface UserUpdatePayload {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  type?: UserType;
  inactive?: boolean;
  profiles?: Array<{ id?: string; name: string }>;
}

/** Payload de atualização do perfil pessoal (Meus dados). */
export interface UserProfileUpdatePayload {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  urlImg?: string;
  configs?: UserConfigItem[];
}

/** Payload para alteração de senha de acesso. */
export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword?: string;
}

/**
 * Filtros de busca compatíveis com `GenericSearchController` (`GET /search/user`).
 *
 * `any` pesquisa dinamicamente em todas as colunas string públicas (`userName`,
 * `firstName`, `lastName`, `email`).
 */
export interface UserAccessFilter {
  name?: string;
  email?: string;
  any?: string;
}

/**
 * Mapeia o termo de busca para o filtro. Com `GenericSearchController`,
 * o parâmetro `any` atende nomes e e-mails simultaneamente.
 */
export function toUserAccessFilter(term: string): UserAccessFilter {
  const trimmed = term.trim();
  if (!trimmed) return {};
  return { any: trimmed, name: trimmed, email: trimmed };
}

export function emptyUserAccess(): UserAccess {
  return { firstName: '', lastName: '', email: '', type: 'Default', inactive: false, profiles: [] };
}

export function userFullName(user?: UserAccess | null): string {
  if (!user) return '';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.userName || user.email || '';
}

/** Iniciais para o avatar (no máximo duas letras). */
export function userInitials(user?: UserAccess | null): string {
  if (!user) return '?';
  const first = user.firstName?.trim()?.[0] ?? '';
  const last = user.lastName?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || (user.email?.trim()?.[0]?.toUpperCase() ?? '?');
}

export function isUserActive(user?: UserAccess | null): boolean {
  return !user?.inactive;
}

export interface ChangeEmailPayload {
  newEmail: string;
  password?: string;
}

/** Verifica se o usuário pode alterar seu e-mail (não é provedor social diferente de OTP). */
export function canUserChangeEmail(provider?: SocialProvider | null): boolean {
  return !provider || provider === 'OTP';
}
