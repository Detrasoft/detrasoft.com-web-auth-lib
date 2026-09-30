import { AuditInfo } from './api-response.model';

/**
 * Permissão de acesso — espelha `RoleDTO` do authorization-server.
 *
 * `code` é o identificador interno (ex.: `AZ1C`) e `name` já vem descritivo
 * (ex.: "Consultar usuário"). Por isso a lib exibe `name` e usa `code` apenas
 * como legenda secundária — não existe arquivo de i18n de roles.
 */
export interface AccessRole {
  id?: string;
  code: string;
  name: string;
}

/**
 * Perfil de acesso — espelha `ProfileDTO`.
 *
 * `roles` é uma lista plana de `AccessRole` nos dois sentidos: o
 * `ProfileConverter` do backend embrulha cada item num `ProfileRole` (tabela
 * de junção) ao persistir e desembrulha ao ler. O frontend nunca vê o join,
 * então um perfil inteiro é salvo num único POST/PUT.
 *
 * `detrasoftId` (tenant) é `WRITE_ONLY` no DTO e preenchido pelo
 * `ProfileCRUDService.beforeInsert` a partir do JWT — a lib nunca o envia.
 */
export interface AccessProfile {
  id?: string;
  name: string;
  roles: AccessRole[];
  audit?: AuditInfo;
  /** Perfis padrão (detrasoftId=null) são globais e não editáveis pelo tenant. */
  isDefault?: boolean;
}

/** Payload de gravação: só o que o backend aceita. */
export interface AccessProfilePayload {
  id?: string;
  name: string;
  roles: AccessRole[];
}

export function emptyAccessProfile(): AccessProfile {
  return { name: '', roles: [] };
}

/** Monta o payload a partir do formulário, descartando campos derivados. */
export function toAccessProfilePayload(
  profile: Pick<AccessProfile, 'id' | 'name'>,
  roles: AccessRole[],
): AccessProfilePayload {
  return {
    ...(profile.id ? { id: profile.id } : {}),
    name: profile.name.trim(),
    roles: roles.map(role => ({ id: role.id, code: role.code, name: role.name })),
  };
}

/**
 * Prefixo do `code` que identifica o módulo (ex.: `AZ1C` → `AZ1`).
 * Usado para agrupar permissões na árvore de seleção.
 */
export function roleGroupKey(role: AccessRole): string {
  const match = /^([A-Za-z]+\d+)/.exec(role.code ?? '');
  return match?.[1] ?? role.code ?? 'OUTROS';
}
