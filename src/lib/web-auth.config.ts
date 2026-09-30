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
  loginTitle: string;
  loginSubtitle: string;
  loginSubmitBtn: string;
  loginRememberMe: string;
  loginForgotPassword: string;
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

  /** Identificador do produto/software (ex: 'note', 'form', 'task'). Padrão: 'detrasoft'. */
  software?: string;

  /** Nome do produto exibido no login. Padrão: 'Detrasoft'. */
  appName?: string;

  /** Subtítulo do login. Padrão: 'Acesse sua conta para continuar'. */
  appSubtitle?: string;

  /** Ícone FontAwesome do produto. Padrão: 'fa-solid fa-shield-halved'. */
  appIcon?: string;

  /** Path de login customizado. Se omitido, usa `/auth/${software}/login`. */
  loginPath?: string;

  /** Rota de redirecionamento após login bem-sucedido. Padrão: '/'. */
  redirectUrlAfterLogin?: string;

  /** URL da imagem do logo do produto (ex: '/tabfy_app_icon_light.jpg'). */
  logoUrl?: string;

  /** URL alternativa da logo para tema escuro (ex: '/tabfy_app_icon.jpg'). */
  logoDarkUrl?: string;

  /** Texto alternativo para a logo. Padrão: nome do app. */
  logoAlt?: string;

  /** Tema visual da tela de login ('auto', 'light', 'dark', 'glass'). Padrão: 'auto'. */
  theme?: 'auto' | 'light' | 'dark' | 'glass';

  /** Fundo customizado (ex: 'transparent', 'url(/background.jpg)'). */
  background?: string;

  /** Habilita ou desabilita luzes de fundo aurora. Padrão: true. */
  showAurora?: boolean;

  /** Gradiente da marca (ex: 'linear-gradient(135deg, #FF655B 0%, #D946EF 50%, #7C3AED 100%)'). */
  brandGradient?: string;

  /** Cor de destaque principal (ex: '#D946EF'). */
  brandColor?: string;

  /** Raio das bordas do card (ex: '28px'). */
  cardRadius?: string;

  /** Largura máxima do card. Padrão: '440px'. */
  cardMaxWidth?: string;

  /** Transforma o botão Entrar em pílula completa. Padrão: false. */
  buttonPill?: boolean;

  /** Exibe chave seletora Light / Dark mode na tela de login. Padrão: false. */
  showThemeToggle?: boolean;

  /** Classe CSS customizada opcional. */
  customClass?: string;

  /** Sobrescrita parcial dos textos. */
  labels?: Partial<WebAuthLabels>;
}

export type WebAuthTheme = 'auto' | 'light' | 'dark' | 'glass';

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
  loginTitle: 'Entrar na sua conta',
  loginSubtitle: 'Informe suas credenciais para continuar.',
  loginSubmitBtn: 'Entrar',
  loginRememberMe: 'Lembrar de mim neste dispositivo',
  loginForgotPassword: 'Esqueceu a senha?',
};

export const WEB_AUTH_CONFIG = new InjectionToken<ResolvedWebAuthConfig>('WEB_AUTH_CONFIG');

/** Aplica os padrões sobre a configuração informada pelo app hospedeiro. */
export function resolveWebAuthConfig(config: WebAuthConfig): ResolvedWebAuthConfig {
  const software = config.software ?? 'detrasoft';
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
    software,
    appName: config.appName ?? 'Detrasoft',
    appSubtitle: config.appSubtitle ?? 'Acesse sua conta para continuar',
    appIcon: config.appIcon ?? 'fa-solid fa-shield-halved',
    loginPath: config.loginPath ?? `/auth/${software}/login`,
    redirectUrlAfterLogin: config.redirectUrlAfterLogin ?? '/',
    logoUrl: config.logoUrl ?? '',
    logoDarkUrl: config.logoDarkUrl ?? '',
    logoAlt: config.logoAlt ?? config.appName ?? 'Logo',
    theme: config.theme ?? 'auto',
    background: config.background ?? '',
    showAurora: config.showAurora ?? (config.background === 'transparent' ? false : true),
    brandGradient: config.brandGradient ?? '',
    brandColor: config.brandColor ?? '',
    cardRadius: config.cardRadius ?? '',
    cardMaxWidth: config.cardMaxWidth ?? '440px',
    buttonPill: config.buttonPill ?? false,
    showThemeToggle: config.showThemeToggle ?? false,
    customClass: config.customClass ?? '',
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
