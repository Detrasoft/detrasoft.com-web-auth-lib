import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  InputComponent,
  ToastService,
} from '@detrasoft.com/detra-ng';

import { WEB_AUTH_CONFIG } from '../../web-auth.config';
import { UserAccessService } from '../../services/user-access.service';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';

@Component({
  selector: 'dwa-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    WebAuthPageHeaderComponent,
    InputComponent,
    ButtonComponent,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly config = inject(WEB_AUTH_CONFIG);
  private readonly service = inject(UserAccessService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly showHeader = input(true, {
    transform: (v: unknown) =>
      v === undefined || v === null || v === '' ? true : v !== false && v !== 'false',
  });

  readonly title = computed(() => this.config.labels.changePasswordTitle);
  readonly eyebrow = computed(() => this.config.labels.changePasswordEyebrow);
  readonly description = computed(() => this.config.labels.changePasswordDescription);
  readonly userDataBasePath = computed(() => this.config.userDataBasePath || '..');

  readonly changingPassword = signal(false);
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  readonly passwordMismatch = computed(() => {
    const p1 = this.newPassword().trim();
    const p2 = this.confirmPassword().trim();
    return p1.length > 0 && p2.length > 0 && p1 !== p2;
  });

  isPasswordFormValid(): boolean {
    const cur = this.currentPassword().trim();
    const np = this.newPassword().trim();
    const cp = this.confirmPassword().trim();
    return cur.length > 0 && np.length >= 6 && np === cp;
  }

  submitChangePassword(): void {
    if (!this.isPasswordFormValid()) {
      if (this.newPassword().length < 6) {
        this.toast.warning('A nova senha deve possuir no mínimo 6 caracteres.');
      } else if (this.passwordMismatch()) {
        this.toast.warning('A confirmação da nova senha não confere.');
      } else {
        this.toast.warning('Preencha todos os campos de senha.');
      }
      return;
    }

    this.changingPassword.set(true);

    this.service
      .changePassword(
        this.currentPassword().trim(),
        this.newPassword().trim(),
        this.confirmPassword().trim(),
      )
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.toast.success('Senha de acesso alterada com sucesso!');
          this.goBack();
        },
        error: (err: unknown) => {
          this.changingPassword.set(false);
          this.toast.error(
            toReadableError(
              err,
              'Não foi possível alterar a senha. Verifique a senha atual digitada.',
            ),
          );
        },
      });
  }

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      const target = this.userDataBasePath();
      void this.router.navigateByUrl(target && target !== '..' ? target : '/profile');
    }
  }
}
