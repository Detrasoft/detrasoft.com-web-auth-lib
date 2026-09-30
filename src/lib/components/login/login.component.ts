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

  ngOnInit(): void {
    const savedEmail = this.auth.getSavedEmail();
    if (savedEmail) {
      this.email.set(savedEmail);
      this.remember.set(true);
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
