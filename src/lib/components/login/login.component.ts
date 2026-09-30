import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent, InputComponent, ToastService } from '@detrasoft.com/detra-ng';

import { WEB_AUTH_CONFIG, ResolvedWebAuthConfig } from '../../web-auth.config';
import { AuthService } from '../../services/auth.service';
import { AuthenticationResponse, UserLoginPayload } from '../../models/auth.model';
import { toReadableError } from '../../utils/notification.util';

@Component({
  selector: 'dwa-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, InputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly config: ResolvedWebAuthConfig = inject(WEB_AUTH_CONFIG);

  /** Identificador do produto/software ('note', 'form', 'task', etc.). Sobrescreve o config. */
  @Input() software?: string;

  /** Título principal exibido no card. */
  @Input() appTitle?: string;

  /** Subtítulo descritivo. */
  @Input() appSubtitle?: string;

  /** Ícone FontAwesome exibido no topo (ex: 'fa-solid fa-note-sticky'). */
  @Input() appIcon?: string;

  /** URL da logo (opcional, substitui o ícone padrão se informada). */
  @Input() logoUrl?: string;

  /** URL alternativa da logo para tema escuro. */
  @Input() logoDarkUrl?: string;

  /** Texto alternativo da logo. */
  @Input() logoAlt?: string;

  /** Tema visual ('auto', 'light', 'dark', 'glass'). */
  @Input() theme?: 'auto' | 'light' | 'dark' | 'glass';

  /** Fundo customizado (ex: 'transparent', 'url(/background.jpg)'). */
  @Input() background?: string;

  /** Habilita luzes e aurora cósmica de fundo. */
  @Input() showAurora?: boolean;

  /** Gradiente da marca (ex: 'linear-gradient(...)'). */
  @Input() brandGradient?: string;

  /** Cor de destaque principal (ex: '#D946EF'). */
  @Input() brandColor?: string;

  /** Raio das bordas do card (ex: '28px'). */
  @Input() cardRadius?: string;

  /** Largura máxima do card (ex: '440px'). */
  @Input() cardMaxWidth?: string;

  /** Botão de login com estilo pílula completa. */
  @Input() buttonPill?: boolean;

  /** Exibe seletor de tema Light / Dark mode no topo. */
  @Input() showThemeToggle?: boolean;

  /** Classe CSS customizada opcional. */
  @Input() customClass?: string;

  /** Rota para redirecionar após login bem-sucedido. */
  @Input() redirectUrl?: string;

  /** URL para recuperação de senha. */
  @Input() forgotPasswordUrl?: string;

  /** URL para registro/cadastro (se omitido, não exibe link de cadastro). */
  @Input() registerUrl?: string;

  /** Cor primária da luz aurora (ex: '#3B82F6'). */
  @Input() auroraPrimaryColor?: string;

  /** Cor secundária da luz aurora (ex: '#8B5CF6'). */
  @Input() auroraAccentColor?: string;

  /** Cor de fundo customizada do card (ex: 'rgba(19, 25, 38, 0.9)'). */
  @Input() cardBackground?: string;

  /** Borda customizada do card. */
  @Input() cardBorder?: string;

  /** Desfoque customizado do card (ex: '20px'). */
  @Input() cardBackdropBlur?: string;

  /** Sombra customizada do card. */
  @Input() cardBoxShadow?: string;

  /** Raio das bordas dos inputs. */
  @Input() inputRadius?: string;

  /** Texto customizado do botão Entrar. */
  @Input() buttonText?: string;

  /** Exibe o link "Esqueceu a senha?". */
  @Input() showForgotPassword?: boolean;

  /** Texto do link de cadastro. */
  @Input() registerText?: string;

  /** Texto de introdução do cadastro. */
  @Input() registerPrompt?: string;

  /** Exibe o rodapé no final da página. */
  @Input() showFooter?: boolean;

  /** Texto do rodapé de segurança. */
  @Input() footerText?: string;

  /** Nome da empresa no rodapé. */
  @Input() footerCompany?: string;

  /** Habilita ou desabilita a opção "Lembrar de mim". */
  @Input() showRememberMe?: boolean;

  @Output() loginSuccess = new EventEmitter<AuthenticationResponse>();
  @Output() loginError = new EventEmitter<any>();

  readonly email = signal('');
  readonly password = signal('');
  readonly remember = signal(true);
  readonly loading = signal(false);
  readonly showPass = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentTheme = signal<'light' | 'dark'>('dark');

  get labels() {
    return this.config.labels;
  }

  readonly resolvedSoftware = computed(() => {
    return this.software || this.config.software || 'detrasoft';
  });

  readonly resolvedAppTitle = computed(() => {
    return this.appTitle || this.config.appName || 'Detrasoft';
  });

  readonly resolvedAppSubtitle = computed(() => {
    return this.appSubtitle || this.config.appSubtitle || this.labels.loginSubtitle;
  });

  readonly resolvedAppIcon = computed(() => {
    if (this.appIcon) return this.appIcon;
    const sw = this.resolvedSoftware();
    if (sw === 'note') return 'fa-solid fa-note-sticky';
    if (sw === 'form') return 'fa-solid fa-file-waveform';
    if (sw === 'task') return 'fa-solid fa-list-check';
    return this.config.appIcon || 'fa-solid fa-shield-halved';
  });

  readonly resolvedTheme = computed(() => {
    return this.theme || this.config.theme || 'auto';
  });

  readonly isGlass = computed(() => {
    return this.resolvedTheme() === 'glass';
  });

  readonly isLight = computed(() => {
    return this.currentTheme() === 'light';
  });

  readonly isDark = computed(() => {
    return this.currentTheme() === 'dark';
  });

  readonly resolvedLogoUrl = computed(() => {
    const isDarkMode = this.currentTheme() === 'dark';
    if (isDarkMode && (this.logoDarkUrl || this.config.logoDarkUrl)) {
      return this.logoDarkUrl || this.config.logoDarkUrl;
    }
    return this.logoUrl || this.config.logoUrl || '';
  });

  readonly resolvedLogoAlt = computed(() => {
    return this.logoAlt || this.config.logoAlt || this.resolvedAppTitle();
  });

  readonly resolvedBackground = computed(() => {
    if (this.background !== undefined) return this.background;
    if (this.config.background !== undefined) return this.config.background;
    return '';
  });

  readonly resolvedShowAurora = computed(() => {
    if (this.showAurora !== undefined) return this.showAurora;
    if (this.config.showAurora !== undefined) return this.config.showAurora;
    if (this.isGlass() || this.resolvedBackground() === 'transparent') return false;
    return true;
  });

  readonly resolvedBrandGradient = computed(() => {
    return this.brandGradient || this.config.brandGradient || '';
  });

  readonly resolvedBrandColor = computed(() => {
    return this.brandColor || this.config.brandColor || '';
  });

  readonly resolvedCardRadius = computed(() => {
    return this.cardRadius || this.config.cardRadius || '';
  });

  readonly resolvedCardMaxWidth = computed(() => {
    return this.cardMaxWidth || this.config.cardMaxWidth || '440px';
  });

  readonly resolvedButtonPill = computed(() => {
    if (this.buttonPill !== undefined) return this.buttonPill;
    return this.config.buttonPill;
  });

  readonly resolvedShowThemeToggle = computed(() => {
    if (this.showThemeToggle !== undefined) return this.showThemeToggle;
    return this.config.showThemeToggle;
  });

  readonly resolvedCardBackground = computed(() => {
    return this.cardBackground || this.config.cardBackground || '';
  });

  readonly resolvedCardBorder = computed(() => {
    return this.cardBorder || this.config.cardBorder || '';
  });

  readonly resolvedCardBackdropBlur = computed(() => {
    return this.cardBackdropBlur || this.config.cardBackdropBlur || '';
  });

  readonly resolvedCardBoxShadow = computed(() => {
    return this.cardBoxShadow || this.config.cardBoxShadow || '';
  });

  readonly resolvedAuroraPrimary = computed(() => {
    return this.auroraPrimaryColor || this.config.auroraPrimaryColor || '';
  });

  readonly resolvedAuroraAccent = computed(() => {
    return this.auroraAccentColor || this.config.auroraAccentColor || '';
  });

  readonly resolvedInputRadius = computed(() => {
    return this.inputRadius || this.config.inputRadius || '';
  });

  readonly resolvedButtonText = computed(() => {
    return this.buttonText || this.config.buttonText || this.labels.loginSubmitBtn;
  });

  readonly resolvedForgotPasswordUrl = computed(() => {
    return this.forgotPasswordUrl || this.config.forgotPasswordUrl || '';
  });

  readonly resolvedShowForgotPassword = computed(() => {
    if (this.showForgotPassword !== undefined) return this.showForgotPassword;
    if (this.config.showForgotPassword !== undefined) return this.config.showForgotPassword;
    return !!this.resolvedForgotPasswordUrl();
  });

  readonly resolvedRegisterUrl = computed(() => {
    return this.registerUrl || this.config.registerUrl || '';
  });

  readonly resolvedRegisterText = computed(() => {
    return this.registerText || this.config.registerText || this.config.registerText || 'Criar conta';
  });

  readonly resolvedRegisterPrompt = computed(() => {
    return this.registerPrompt || this.config.registerPrompt || 'Não tem uma conta?';
  });

  readonly resolvedShowRememberMe = computed(() => {
    if (this.showRememberMe !== undefined) return this.showRememberMe;
    if (this.config.showRememberMe !== undefined) return this.config.showRememberMe;
    return true;
  });

  readonly resolvedShowFooter = computed(() => {
    if (this.showFooter !== undefined) return this.showFooter;
    if (this.config.showFooter !== undefined) return this.config.showFooter;
    return true;
  });

  readonly resolvedFooterText = computed(() => {
    return this.footerText || this.config.footerText || 'Plataforma Segura';
  });

  readonly resolvedFooterCompany = computed(() => {
    return this.footerCompany || this.config.footerCompany || 'DetraSoft';
  });

  get themeStorageKey(): string {
    const sw = this.resolvedSoftware();
    return `${sw}-theme`;
  }

  ngOnInit(): void {
    const savedEmail = this.auth.getSavedEmail();
    if (savedEmail) {
      this.email.set(savedEmail);
      this.remember.set(true);
    }
    this.initTheme();
  }

  private initTheme(): void {
    const themePref = this.resolvedTheme();

    // 1. Tema explícito dark
    if (themePref === 'dark') {
      this.currentTheme.set('dark');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
      return;
    }

    // 2. Tema explícito light
    if (themePref === 'light') {
      this.currentTheme.set('light');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return;
    }

    // 3. Tema glass (Tabfy)
    if (themePref === 'glass') {
      const stored =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(this.themeStorageKey) ||
            (this.resolvedSoftware() === 'form' ? localStorage.getItem('tabfy-theme') : null)
          : null;
      if (stored === 'dark') {
        this.currentTheme.set('dark');
      } else {
        this.currentTheme.set('light');
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }
      return;
    }

    // 4. Tema auto
    const stored =
      typeof localStorage !== 'undefined' ? localStorage.getItem(this.themeStorageKey) : null;
    if (stored) {
      this.currentTheme.set(stored === 'dark' ? 'dark' : 'light');
    } else if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      this.currentTheme.set('dark');
    } else if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
      this.currentTheme.set('light');
    } else if (this.resolvedSoftware() === 'note' || this.resolvedSoftware() === 'task') {
      // DutFy suite (note, task) é dark por padrão
      this.currentTheme.set('dark');
    } else {
      this.currentTheme.set('light');
    }
  }

  toggleTheme(): void {
    const next = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(next);
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (next === 'dark') {
        html.classList.remove('light');
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.themeStorageKey, next);
      if (this.resolvedSoftware() === 'form') {
        localStorage.setItem('tabfy-theme', next);
      }
    }
  }

  togglePassword(): void {
    this.showPass.set(!this.showPass());
  }

  onSubmit(): void {
    if (this.loading()) return;

    this.errorMessage.set(null);
    const emailVal = this.email().trim();
    const passVal = this.password();

    if (!emailVal || !passVal) {
      const msg = 'Preencha o e-mail e a senha de acesso.';
      this.errorMessage.set(msg);
      this.toast.warning(msg);
      return;
    }

    this.loading.set(true);
    const payload: UserLoginPayload = {
      email: emailVal,
      password: passVal,
    };

    const targetSoftware = this.resolvedSoftware();

    this.auth.login(payload, targetSoftware, this.remember()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success('Autenticação realizada com sucesso!');
        this.loginSuccess.emit(res);

        // Redireciona para URL de retorno ou configurada
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const destination = returnUrl || this.redirectUrl || this.config.redirectUrlAfterLogin || '/';
        this.router.navigateByUrl(destination);
      },
      error: (err) => {
        this.loading.set(false);
        const readableMsg = toReadableError(
          err,
          'E-mail ou senha incorretos. Verifique suas credenciais.',
        );
        this.errorMessage.set(readableMsg);
        this.toast.error(readableMsg);
        this.loginError.emit(err);
      },
    });
  }
}
