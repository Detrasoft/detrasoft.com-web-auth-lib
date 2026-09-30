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

  /** Cor primária da luz aurora (ex: '#3B82F6'). */
  auroraPrimaryColor?: string;

  /** Cor secundária/sotaque da luz aurora (ex: '#8B5CF6'). */
  auroraAccentColor?: string;

  /** Gradiente da marca (ex: 'linear-gradient(135deg, #FF655B 0%, #D946EF 50%, #7C3AED 100%)'). */
  brandGradient?: string;

  /** Cor de destaque principal (ex: '#D946EF'). */
  brandColor?: string;

  /** Raio das bordas do card (ex: '28px', '20px'). */
  cardRadius?: string;

  /** Largura máxima do card. Padrão: '440px'. */
  cardMaxWidth?: string;

  /** Cor de fundo customizada do card (ex: 'rgba(19, 25, 38, 0.9)'). */
  cardBackground?: string;

  /** Borda customizada do card (ex: '1px solid rgba(255, 255, 255, 0.1)'). */
  cardBorder?: string;

  /** Desfoque de fundo do card (ex: '24px', '0px'). */
  cardBackdropBlur?: string;

  /** Sombra customizada do card. */
  cardBoxShadow?: string;

  /** Raio das bordas dos campos de input (ex: '12px', '9999px'). */
  inputRadius?: string;

  /** Transforma o botão Entrar em pílula completa. Padrão: false. */
  buttonPill?: boolean;

  /** Texto customizado do botão Entrar. */
  buttonText?: string;

  /** Exibe chave seletora Light / Dark mode na tela de login. Padrão: false. */
  showThemeToggle?: boolean;

  /** Exibe o checkbox "Lembrar de mim". Padrão: true. */
  showRememberMe?: boolean;

  /** Exibe o link "Esqueceu a senha?". Padrão: true se forgotPasswordUrl existir. */
  showForgotPassword?: boolean;

  /** URL para recuperação de senha. */
  forgotPasswordUrl?: string;

  /** URL para registro/cadastro de nova conta. */
  registerUrl?: string;

  /** Texto do link de cadastro. Padrão: 'Criar conta'. */
  registerText?: string;

  /** Texto de introdução do cadastro. Padrão: 'Não tem uma conta?'. */
  registerPrompt?: string;

  /** Exibe o rodapé no final da página de login. Padrão: true. */
  showFooter?: boolean;

  /** Texto de segurança do rodapé. Padrão: 'Plataforma Segura'. */
  footerText?: string;

  /** Nome da empresa no rodapé. Padrão: 'DetraSoft'. */
  footerCompany?: string;

  /** Rota da tela de login usada pelos guards. Padrão: '/login'. */
  loginRoute?: string;

  /** Rota principal pós-login para redirecionamento no guestGuard. Padrão: redirectUrlAfterLogin || '/'. */
  homeRoute?: string;

  /** Domínios autorizados a receber o Bearer token. Padrão: [/localhost/, /127\.0\.0\.1/, ...]. */
  tokenAllowedDomains?: (string | RegExp)[];

  /** Rotas que NÃO devem receber token Authorization. */
  tokenDisallowedRoutes?: (string | RegExp)[];

  /** Path do endpoint de refresh token. Padrão: '/auth/refresh_token'. */
  refreshTokenPath?: string;

  /** Path do endpoint de logout. Padrão: '/auth/logout'. */
  logoutPath?: string;

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
    usersBasePath: config.usersBasePath ?? '/users',
    profilesBasePath: config.profilesBasePath ?? '/access-profiles',
    userDataBasePath: config.userDataBasePath ?? '/profile',
    changePasswordBasePath: config.changePasswordBasePath ?? 'change-password',
    changeEmailBasePath: config.changeEmailBasePath ?? 'change-email',
    backPath: config.backPath ?? '',
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
    cardBackground: config.cardBackground ?? '',
    cardBorder: config.cardBorder ?? '',
    cardBackdropBlur: config.cardBackdropBlur ?? '',
    cardBoxShadow: config.cardBoxShadow ?? '',
    auroraPrimaryColor: config.auroraPrimaryColor ?? '',
    auroraAccentColor: config.auroraAccentColor ?? '',
    inputRadius: config.inputRadius ?? '',
    buttonPill: config.buttonPill ?? false,
    buttonText: config.buttonText ?? '',
    showThemeToggle: config.showThemeToggle ?? false,
    showRememberMe: config.showRememberMe ?? true,
    showForgotPassword: config.showForgotPassword ?? false,
    forgotPasswordUrl: config.forgotPasswordUrl ?? '',
    registerUrl: config.registerUrl ?? '',
    registerText: config.registerText ?? 'Criar conta',
    registerPrompt: config.registerPrompt ?? 'Não tem uma conta?',
    showFooter: config.showFooter ?? true,
    footerText: config.footerText ?? 'Plataforma Segura',
    footerCompany: config.footerCompany ?? 'DetraSoft',
    loginRoute: config.loginRoute ?? '/login',
    homeRoute: config.homeRoute ?? config.redirectUrlAfterLogin ?? '/',
    tokenAllowedDomains: config.tokenAllowedDomains ?? DEFAULT_TOKEN_ALLOWED_DOMAINS,
    tokenDisallowedRoutes: config.tokenDisallowedRoutes ?? DEFAULT_TOKEN_DISALLOWED_ROUTES,
    refreshTokenPath: config.refreshTokenPath ?? '/auth/refresh_token',
    logoutPath: config.logoutPath ?? '/auth/logout',
    customClass: config.customClass ?? '',
    userSession: config.userSession,
    labels: { ...WEB_AUTH_DEFAULT_LABELS, ...config.labels },
  };
}

export const DEFAULT_TOKEN_ALLOWED_DOMAINS: (string | RegExp)[] = [
  /localhost/,
  /127\.0\.0\.1/,
  /192\.168\./,
  /10\./,
  /\.detrasoft\.com/,
  /\.dutfy\.app/,
  /detrasoft/,
  /dutfy/,
];

export const DEFAULT_TOKEN_DISALLOWED_ROUTES: (string | RegExp)[] = [
  /\/auth\/.*\/login/,
  /\/auth\/refresh_token/,
  /\/auth\/new_password/,
  /\/auth\/send_email_new_password/,
  /\/public\/register\//,
];

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
