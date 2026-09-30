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

  /** Habilita ou desabilita a opção "Lembrar de mim". */
  @Input() showRememberMe = true;

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
    return this.resolvedBackground() !== 'transparent';
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
    if (themePref === 'light') {
      this.currentTheme.set('light');
    } else if (themePref === 'dark') {
      this.currentTheme.set('dark');
    } else if (themePref === 'glass') {
      const hasDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('tabfy-theme') : null;
      this.currentTheme.set(stored === 'dark' || hasDark ? 'dark' : 'light');
    } else {
      const hasDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const hasLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('tabfy-theme') : null;
      if (stored) {
        this.currentTheme.set(stored === 'dark' ? 'dark' : 'light');
      } else if (hasDark) {
        this.currentTheme.set('dark');
      } else if (hasLight) {
        this.currentTheme.set('light');
      } else if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        this.currentTheme.set('dark');
      } else {
        this.currentTheme.set('light');
      }
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
      localStorage.setItem('tabfy-theme', next);
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
