import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  InputComponent,
  ToastService,
} from '@detrasoft.com/detra-ng';

import {
  WEB_AUTH_CONFIG,
  WEB_AUTH_USER_SESSION,
} from '../../web-auth.config';
import { UserAccessService } from '../../services/user-access.service';
import { UserAccess, canUserChangeEmail } from '../../models/user-access.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tryGetUserIdFromStorage(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('taskui.auth.access-token.v1');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload?.userId ?? payload?.id ?? payload?.sub ?? null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'dwa-change-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    WebAuthPageHeaderComponent,
    WebAuthStateComponent,
    InputComponent,
    ButtonComponent,
  ],
  templateUrl: './change-email.component.html',
  styleUrl: './change-email.component.scss',
})
export class ChangeEmailComponent implements OnInit, OnDestroy {
  private readonly config = inject(WEB_AUTH_CONFIG);
  private readonly userSession = inject(WEB_AUTH_USER_SESSION, { optional: true });
  private readonly service = inject(UserAccessService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);

  readonly showHeader = input(true, {
    transform: (v: unknown) =>
      v === undefined || v === null || v === '' ? true : v !== false && v !== 'false',
  });

  readonly title = computed(() => this.config.labels.changeEmailTitle);
  readonly eyebrow = computed(() => this.config.labels.changeEmailEyebrow);
  readonly description = computed(() => this.config.labels.changeEmailDescription);
  readonly userDataBasePath = this.config.userDataBasePath;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  // Dados do usuário atual
  readonly currentUser = signal<UserAccess | null>(null);
  readonly currentEmail = computed(() => {
    return (
      this.currentUser()?.email ||
      this.userSession?.getCurrentUser?.()?.email ||
      ''
    );
  });

  readonly provider = computed(() => this.currentUser()?.provider ?? null);

  /**
   * Um usuário poderá alterar seu e-mail desde que não seja social diferente de OTP.
   * Se provider for GOOGLE ou APPLE, a alteração é bloqueada.
   */
  readonly canChange = computed(() => canUserChangeEmail(this.provider()));

  readonly isSocialNonOtp = computed(() => !this.canChange());

  readonly providerName = computed(() => {
    const p = this.provider();
    if (p === 'GOOGLE') return 'Google';
    if (p === 'APPLE') return 'Apple';
    return 'Provedor Social';
  });

  // Campos do formulário
  readonly newEmail = signal('');
  readonly confirmNewEmail = signal('');
  readonly password = signal('');
  showPassword = false;

  // Estados de validação assíncrona do e-mail
  readonly emailChecking = signal(false);
  readonly emailTaken = signal(false);
  readonly emailAvailable = signal(false);

  private checkTimeout: any = null;

  readonly isFormatValid = computed(() => {
    const val = this.newEmail().trim();
    return val.length > 0 && EMAIL_REGEX.test(val);
  });

  readonly isSameAsCurrent = computed(() => {
    const val = this.newEmail().trim().toLowerCase();
    const cur = this.currentEmail().trim().toLowerCase();
    return val.length > 0 && val === cur;
  });

  readonly emailMismatch = computed(() => {
    const e1 = this.newEmail().trim().toLowerCase();
    const e2 = this.confirmNewEmail().trim().toLowerCase();
    return e1.length > 0 && e2.length > 0 && e1 !== e2;
  });

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
  }

  loadCurrentUser(): void {
    const session = this.userSession ?? this.config.userSession;
    const resolvedUserId = session?.getUserId?.() ?? tryGetUserIdFromStorage();

    if (!resolvedUserId) {
      const current = session?.getCurrentUser?.();
      if (current?.email) {
        this.currentUser.set({
          firstName: current.firstName ?? '',
          lastName: current.lastName ?? '',
          email: current.email,
        });
      }
      this.loading.set(false);
      return;
    }

    this.service.getById(resolvedUserId).subscribe({
      next: (u: UserAccess) => {
        this.currentUser.set(u);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const current = session?.getCurrentUser?.();
        if (current?.email) {
          this.currentUser.set({
            firstName: current.firstName ?? '',
            lastName: current.lastName ?? '',
            email: current.email,
          });
        } else {
          this.error.set(toReadableError(err, 'Não foi possível carregar as credenciais da conta.'));
        }
        this.loading.set(false);
      },
    });
  }

  onNewEmailChange(value: string): void {
    this.newEmail.set(value);
    this.emailTaken.set(false);
    this.emailAvailable.set(false);

    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    const trimmed = value.trim().toLowerCase();
    if (!trimmed || !EMAIL_REGEX.test(trimmed) || trimmed === this.currentEmail().trim().toLowerCase()) {
      this.emailChecking.set(false);
      return;
    }

    this.emailChecking.set(true);
    this.checkTimeout = setTimeout(() => {
      this.service.checkEmailExists(trimmed).subscribe({
        next: (exists: boolean) => {
          this.emailChecking.set(false);
          this.emailTaken.set(exists);
          this.emailAvailable.set(!exists);
        },
        error: () => {
          this.emailChecking.set(false);
        },
      });
    }, 400);
  }

  isFormValid(): boolean {
    if (!this.canChange()) return false;
    if (this.emailChecking() || this.emailTaken()) return false;
    if (!this.isFormatValid() || this.isSameAsCurrent()) return false;

    const e1 = this.newEmail().trim().toLowerCase();
    const e2 = this.confirmNewEmail().trim().toLowerCase();
    if (!e2 || e1 !== e2) return false;

    // Se usuário não for OTP, precisa digitar a senha atual para confirmar
    const p = this.provider();
    if (p !== 'OTP') {
      if (!this.password().trim()) return false;
    }

    return true;
  }

  submitChangeEmail(): void {
    if (!this.canChange()) {
      this.toast.error('Usuários autenticados via login social não podem alterar seu e-mail.');
      return;
    }

    if (!this.isFormatValid()) {
      this.toast.warning('Informe um endereço de e-mail válido.');
      return;
    }

    if (this.isSameAsCurrent()) {
      this.toast.warning('O novo e-mail deve ser diferente do e-mail atual.');
      return;
    }

    if (this.emailTaken()) {
      this.toast.error('Este e-mail já está sendo utilizado por outro usuário.');
      return;
    }

    if (this.emailMismatch()) {
      this.toast.warning('A confirmação do e-mail não confere.');
      return;
    }

    const p = this.provider();
    if (p !== 'OTP' && !this.password().trim()) {
      this.toast.warning('Informe sua senha atual para confirmar a alteração.');
      return;
    }

    this.submitting.set(true);

    const targetEmail = this.newEmail().trim().toLowerCase();
    const currentPass = this.password().trim() || undefined;

    this.service.changeEmail(targetEmail, currentPass).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('E-mail de acesso alterado com sucesso!');

        const session = this.userSession ?? this.config.userSession;
        session?.onUserUpdated?.({ email: targetEmail } as any);

        this.goBack();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível alterar o e-mail. Verifique os dados digitados.'));
      },
    });
  }

  goBack(): void {
    this.location.back();
  }
}
