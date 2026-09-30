import { InjectionToken, Provider } from '@angular/core';

/**
 * Textos exibidos pela biblioteca. Todos têm padrão em pt-BR e podem ser
 * sobrescritos pelo app hospedeiro — é o mecanismo de i18n da lib, que
 * deliberadamente não depende de nenhuma biblioteca de tradução.
 */
export interface WebAuthLabels {
  usersTitle: string;
  usersEyebrow: string;
  usersDescription: string;
  profilesTitle: string;
  profilesEyebrow: string;
  profilesDescription: string;
  userDataTitle: string;
  userDataEyebrow: string;
  userDataDescription: string;
  changePasswordTitle: string;
  changePasswordEyebrow: string;
  changePasswordDescription: string;
  changeEmailTitle: string;
  changeEmailEyebrow: string;
  changeEmailDescription: string;
}

/**
 * Sessão do usuário autenticado no app hospedeiro.
 * Permite que a lib descubra o usuário logado e avise quando os dados dele mudarem.
 */
export interface WebAuthUserSession {
  getUserId(): string | null;
  getCurrentUser?(): {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    urlImage?: string;
    subscription?: string;
  } | null;
  onUserUpdated?(updated: {
    firstName?: string;
    lastName?: string;
    urlImage?: string;
  }): void;
}

export const WEB_AUTH_USER_SESSION = new InjectionToken<WebAuthUserSession>('WEB_AUTH_USER_SESSION');

export interface WebAuthConfig {
  /**
   * URL base do authorization-server, sem o path da API.
   * No DutFy: `environment.apiUrlAuth`.
   */
  baseUrl: string;

  /** Path da API dentro do gateway. Padrão: `/authorization-server`. */
  apiPath?: string;

  /**
   * URL base do storage-server para upload de fotos. Padrão: mesmo que `baseUrl`.
   */
  storageBaseUrl?: string;

  /** Path do storage-server. Padrão: `/storage-server`. */
  storagePath?: string;

  /** Rota onde `USERS_ROUTES` foi montada. Padrão: `/settings/users`. */
  usersBasePath?: string;

  /** Rota onde `ACCESS_PROFILES_ROUTES` foi montada. Padrão: `/settings/profiles`. */
  profilesBasePath?: string;

  /** Rota onde `USER_DATA_ROUTES` foi montada. Padrão: `/user-data`. */
  userDataBasePath?: string;

  /** Rota da tela de troca de senha. Padrão: `/user-data/change-password`. */
  changePasswordBasePath?: string;

  /** Rota da tela de troca de e-mail. Padrão: `/user-data/change-email`. */
  changeEmailBasePath?: string;

  /** Rota do botão "voltar" das telas raiz. Padrão: `/settings`. */
  backPath?: string;

  /** Quantidade de registros por página nas listagens. Padrão: 10. */
  pageSize?: number;

  /** Habilita card de escala e zoom visual na tela de Meus Dados. Padrão: true. */
  enableZoom?: boolean;

  /** Sessão do usuário atual informada explicitamente na config. */
  userSession?: WebAuthUserSession;

  /** Caminho do arquivo JSON com o catálogo de software e permissões. Padrão: `assets/data/software.json`. */
  softwareDataUrl?: string;

  /** Sobrescrita parcial dos textos. */
  labels?: Partial<WebAuthLabels>;
}

/** Configuração com todos os padrões já aplicados. */
export type ResolvedWebAuthConfig = Required<Omit<WebAuthConfig, 'labels' | 'userSession'>> & {
  labels: WebAuthLabels;
  userSession?: WebAuthUserSession;
};

export const WEB_AUTH_DEFAULT_LABELS: WebAuthLabels = {
  usersTitle: 'Usuários e acesso',
  usersEyebrow: 'Regras do workspace',
  usersDescription:
    'Consulte os participantes do workspace, convide novas pessoas e mantenha os acessos sempre atualizados.',
  profilesTitle: 'Perfis de acesso',
  profilesEyebrow: 'Regras do workspace',
  profilesDescription:
    'Agrupe permissões em perfis e vincule-os aos usuários para controlar o que cada pessoa pode fazer.',
  userDataTitle: 'Meus dados e perfil',
  userDataEyebrow: 'Espaço pessoal',
  userDataDescription:
    'Gerencie suas informações cadastrais, avatar em alta resolução, preferências de escala e credenciais de acesso.',
  changePasswordTitle: 'Alterar Senha de Acesso',
  changePasswordEyebrow: 'Segurança',
  changePasswordDescription:
    'Digite sua senha atual e escolha uma nova senha para a sua conta.',
  changeEmailTitle: 'Alterar E-mail de Acesso',
  changeEmailEyebrow: 'Segurança',
  changeEmailDescription:
    'Informe seu novo endereço de e-mail utilizado para acesso e notificações.',
};

export const WEB_AUTH_CONFIG = new InjectionToken<ResolvedWebAuthConfig>('WEB_AUTH_CONFIG');

/** Aplica os padrões sobre a configuração informada pelo app hospedeiro. */
export function resolveWebAuthConfig(config: WebAuthConfig): ResolvedWebAuthConfig {
  return {
    baseUrl: config.baseUrl,
    apiPath: config.apiPath ?? '/authorization-server',
    storageBaseUrl: config.storageBaseUrl ?? config.baseUrl,
    storagePath: config.storagePath ?? '/storage-server',
    usersBasePath: config.usersBasePath ?? '/settings/users',
    profilesBasePath: config.profilesBasePath ?? '/settings/profiles',
    userDataBasePath: config.userDataBasePath ?? '/user-data',
    changePasswordBasePath: config.changePasswordBasePath ?? '/user-data/change-password',
    changeEmailBasePath: config.changeEmailBasePath ?? '/user-data/change-email',
    backPath: config.backPath ?? '/settings',
    pageSize: config.pageSize ?? 10,
    enableZoom: config.enableZoom ?? true,
    softwareDataUrl: config.softwareDataUrl ?? 'assets/data/software.json',
    userSession: config.userSession,
    labels: { ...WEB_AUTH_DEFAULT_LABELS, ...config.labels },
  };
}

/**
 * Registra a `@detrasoft.com/web-auth` no app hospedeiro.
 *
 * ```ts
 * providers: [
 *   provideWebAuth({ baseUrl: environment.apiUrlAuth }),
 * ]
 * ```
 */
export function provideWebAuth(config: WebAuthConfig): Provider {
  return {
    provide: WEB_AUTH_CONFIG,
    useValue: resolveWebAuthConfig(config),
  };
}
