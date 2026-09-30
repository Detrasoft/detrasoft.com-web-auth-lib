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
import { Router, RouterLink } from '@angular/router';
import {
  ButtonComponent,
  CropResult,
  ImageCropComponent,
  InputComponent,
  ToastService,
} from '@detrasoft.com/detra-ng';

import {
  WEB_AUTH_CONFIG,
  WEB_AUTH_USER_SESSION,
} from '../../web-auth.config';
import { UserAccessService } from '../../services/user-access.service';
import { AuthService } from '../../services/auth.service';
import { WebAuthZoomService } from '../../services/zoom.service';
import { UserAccess, UserConfigItem, SocialProvider, canUserChangeEmail } from '../../models/user-access.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';

function tryGetUserIdFromToken(token: string | null): string | null {
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
    return payload?.userId ?? payload?.id ?? (payload?.sub && !payload.sub.includes('@') ? payload.sub : null);
  } catch {
    return null;
  }
}

@Component({
  selector: 'dwa-user-data',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    WebAuthPageHeaderComponent,
    WebAuthStateComponent,
    InputComponent,
    ButtonComponent,
    ImageCropComponent,
  ],
  templateUrl: './user-data.component.html',
  styleUrl: './user-data.component.scss',
})
export class UserDataComponent implements OnInit, OnDestroy {
  private readonly config = inject(WEB_AUTH_CONFIG);
  private readonly userSession = inject(WEB_AUTH_USER_SESSION, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly service = inject(UserAccessService);
  readonly zoomService = inject(WebAuthZoomService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly showHeader = input(true, {
    transform: (v: unknown) =>
      v === undefined || v === null || v === '' ? true : v !== false && v !== 'false',
  });

  readonly title = computed(() => this.config.labels.userDataTitle);
  readonly eyebrow = computed(() => this.config.labels.userDataEyebrow);
  readonly description = computed(() => this.config.labels.userDataDescription);
  readonly backPath = this.config.backPath || '';
  readonly changePasswordPath = computed(() => this.config.changePasswordBasePath || 'change-password');
  readonly changeEmailPath = computed(() => this.config.changeEmailBasePath || 'change-email');
  readonly enableZoom = computed(() => this.config.enableZoom);

  // Estados principais
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly savingZoom = signal(false);

  // Campos do formulário de identificação
  readonly userId = signal<string | null>(null);
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly currentAvatarUrl = signal<string | null>(null);
  readonly avatarImgError = signal(false);
  readonly subscriptionBadge = signal<string | null>(null);
  readonly provider = signal<SocialProvider | null>(null);

  readonly canChangeEmail = computed(() => canUserChangeEmail(this.provider()));
  readonly isSocialUser = computed(() => !this.canChangeEmail());
  readonly socialProviderName = computed(() => {
    const p = this.provider();
    if (p === 'GOOGLE') return 'Google';
    if (p === 'APPLE') return 'Apple';
    return 'Provedor Social';
  });

  // Configs e backup reativo para detecção de alterações e descarte
  private readonly initialData = signal<{
    firstName?: string;
    lastName?: string;
    urlImg?: string | null;
  }>({});
  private userConfigs: UserConfigItem[] = [];
  private zoomSaveTimeout: any = null;

  // Image Crop modal
  showImageCrop = false;
  selectedAvatarFile: File | null = null;

  // Computeds
  readonly userFullName = computed(() => {
    const full = `${this.firstName()} ${this.lastName()}`.trim();
    return full || this.email() || 'Usuário';
  });

  readonly userInitials = computed(() => {
    const fn = this.firstName().trim();
    const ln = this.lastName().trim();
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (fn) return fn.slice(0, 2).toUpperCase();
    const em = this.email().trim();
    return em ? em.slice(0, 2).toUpperCase() : 'US';
  });

  /** Retorna true apenas quando nome, sobrenome ou foto tiverem sido modificados */
  readonly hasIdentificationChanges = computed(() => {
    const initial = this.initialData();
    const initialFn = (initial.firstName ?? '').trim();
    const initialLn = (initial.lastName ?? '').trim();
    const initialImg = initial.urlImg ?? null;

    const currentFn = this.firstName().trim();
    const currentLn = this.lastName().trim();
    const currentImg = this.currentAvatarUrl() ?? null;

    return (
      currentFn !== initialFn ||
      currentLn !== initialLn ||
      currentImg !== initialImg
    );
  });

  ngOnInit(): void {
    this.loadUserData();
  }

  ngOnDestroy(): void {
    if (this.zoomSaveTimeout) {
      clearTimeout(this.zoomSaveTimeout);
    }
  }

  goBack(): void {
    this.location.back();
  }

  /* ── Carregamento dos dados do usuário ─────────────────────────────────── */
  private loadUserData(): void {
    const session = this.userSession ?? this.config.userSession;
    const authUser = this.auth.currentUser();
    const token = this.auth.getAccessToken();
    const resolvedUserId =
      session?.getUserId?.() ??
      authUser?.userId ??
      (authUser?.id && !authUser.id.includes('@') ? authUser.id : null) ??
      tryGetUserIdFromToken(token);
    this.userId.set(resolvedUserId);

    if (authUser?.subscription || session?.getCurrentUser?.()?.subscription) {
      this.subscriptionBadge.set(authUser?.subscription ?? session?.getCurrentUser?.()?.subscription ?? null);
    }

    if (!resolvedUserId) {
      if (authUser) {
        this.firstName.set(authUser.firstName ?? '');
        this.lastName.set(authUser.lastName ?? '');
        this.email.set(authUser.email ?? '');
        this.currentAvatarUrl.set(authUser.avatarUrl ?? null);
        this.initialData.set({
          firstName: this.firstName(),
          lastName: this.lastName(),
          urlImg: this.currentAvatarUrl(),
        });
      }
      this.loading.set(false);
      return;
    }

    this.service.getById(resolvedUserId).subscribe({
      next: (u: UserAccess) => {
        this.firstName.set(u.firstName ?? authUser?.firstName ?? '');
        this.lastName.set(u.lastName ?? authUser?.lastName ?? '');
        this.email.set(u.email ?? authUser?.email ?? '');
        this.provider.set(u.provider ?? null);
        const rawUrl = (u.urlImg ?? authUser?.avatarUrl ?? '')?.trim();
        const validUrl = rawUrl && rawUrl !== 'null' && rawUrl !== 'undefined' ? rawUrl : null;
        this.currentAvatarUrl.set(validUrl);
        this.avatarImgError.set(false);

        this.initialData.set({
          firstName: this.firstName(),
          lastName: this.lastName(),
          urlImg: this.currentAvatarUrl(),
        });

        this.userConfigs = u.configs || [];

        // Carrega escala salva caso exista
        if (this.enableZoom()) {
          const savedScale = this.userConfigs.find(c => c.name === 'SCALE_APP')?.value;
          if (savedScale !== undefined && savedScale !== null) {
            const parsed = parseInt(String(savedScale), 10);
            if (!isNaN(parsed) && parsed >= 70 && parsed <= 140) {
              this.zoomService.setZoomPercentage(parsed);
            }
          }
        }

        this.loading.set(false);
      },
      error: (err: unknown) => {
        if (authUser) {
          this.firstName.set(authUser.firstName ?? '');
          this.lastName.set(authUser.lastName ?? '');
          this.email.set(authUser.email ?? '');
          this.currentAvatarUrl.set(authUser.avatarUrl ?? null);
          this.initialData.set({
            firstName: this.firstName(),
            lastName: this.lastName(),
            urlImg: this.currentAvatarUrl(),
          });
        } else {
          this.error.set(toReadableError(err, 'Não foi possível carregar os dados do usuário.'));
        }
        this.loading.set(false);
      },
    });
  }

  /* ── Manipulação de Foto e Recorte com ds-image-crop ───────────────────── */
  onAvatarFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Valida se é imagem
    if (!file.type.startsWith('image/')) {
      this.toast.warning('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
      input.value = '';
      return;
    }

    // Valida tamanho máximo de 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toast.warning('O arquivo selecionado excede o limite máximo permitido de 10MB.');
      input.value = '';
      return;
    }

    this.selectedAvatarFile = file;
    this.showImageCrop = true;
    input.value = '';
  }

  onCropComplete(cropResult: CropResult): void {
    this.showImageCrop = false;
    this.selectedAvatarFile = null;

    if (!cropResult.file) return;

    this.uploadCroppedAvatar(cropResult.file);
  }

  onCropCancel(): void {
    this.showImageCrop = false;
    this.selectedAvatarFile = null;
  }

  private uploadCroppedAvatar(file: File): void {
    const id = this.userId() || 'me';
    this.uploadingAvatar.set(true);

    this.service.uploadAvatar(file, id).subscribe({
      next: (uploadedUrl: string) => {
        this.uploadingAvatar.set(false);
        if (uploadedUrl) {
          this.currentAvatarUrl.set(uploadedUrl);
          this.notifySessionUpdate({ urlImage: uploadedUrl });
          this.toast.success('Foto atualizada com sucesso!');
        }
      },
      error: (err: unknown) => {
        this.uploadingAvatar.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível enviar a foto. Tente novamente.'));
      },
    });
  }

  removeAvatar(): void {
    this.currentAvatarUrl.set(null);
    this.notifySessionUpdate({ urlImage: '' });
    this.toast.info('Foto removida. Lembre-se de salvar as alterações para persistir.');
  }

  /* ── Salvar alterações no card Identificação ────────────────────────────── */
  saveUserData(): void {
    if (!this.firstName().trim() || !this.lastName().trim()) {
      this.toast.warning('Nome e Sobrenome são obrigatórios.');
      return;
    }

    const id = this.userId();
    if (!id) {
      this.toast.error('Usuário não identificado.');
      return;
    }

    this.saving.set(true);

    const scaleConfig = this.userConfigs.find(c => c.name === 'SCALE_APP');
    const configs: UserConfigItem[] = [
      {
        ...(scaleConfig?.id ? { id: scaleConfig.id } : {}),
        name: 'SCALE_APP',
        value: String(this.zoomService.getCurrentZoomPercentage()),
      },
      ...this.userConfigs.filter(c => c.name !== 'SCALE_APP'),
    ];

    this.service
      .updateProfile({
        id,
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
        email: this.email(),
        urlImg: this.currentAvatarUrl() ?? undefined,
        configs,
      })
      .subscribe({
        next: (updated: UserAccess) => {
          this.saving.set(false);
          if (updated?.configs) {
            this.userConfigs = updated.configs;
          }

          this.initialData.set({
            firstName: this.firstName(),
            lastName: this.lastName(),
            urlImg: this.currentAvatarUrl(),
          });

          this.notifySessionUpdate({
            firstName: updated.firstName ?? this.firstName(),
            lastName: updated.lastName ?? this.lastName(),
            urlImage: this.currentAvatarUrl() ?? undefined,
          });

          this.toast.success('Informações pessoais salvas com sucesso!');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.toast.error(toReadableError(err, 'Não foi possível salvar as alterações.'));
        },
      });
  }

  cancelChanges(): void {
    const initial = this.initialData();
    this.firstName.set(initial.firstName ?? '');
    this.lastName.set(initial.lastName ?? '');
    this.currentAvatarUrl.set(initial.urlImg ?? null);
    this.toast.info('Alterações descartadas.');
  }

  /* ── Controle de Zoom com Debounce de 1s para envio ao backend ─────────── */
  onZoomIn(): void {
    this.zoomService.zoomIn();
    this.scheduleZoomSave();
  }

  onZoomOut(): void {
    this.zoomService.zoomOut();
    this.scheduleZoomSave();
  }

  onResetZoom(): void {
    this.zoomService.resetZoom();
    this.scheduleZoomSave();
  }

  private scheduleZoomSave(): void {
    if (this.zoomSaveTimeout) {
      clearTimeout(this.zoomSaveTimeout);
    }
    this.zoomSaveTimeout = setTimeout(() => {
      this.saveZoomConfig();
    }, 1000);
  }

  private saveZoomConfig(): void {
    const id = this.userId();
    if (!id) return;

    this.savingZoom.set(true);

    const currentZoom = this.zoomService.getCurrentZoomPercentage();
    const scaleConfig = this.userConfigs.find(c => c.name === 'SCALE_APP');
    const initial = this.initialData();

    const configs: UserConfigItem[] = [
      {
        ...(scaleConfig?.id ? { id: scaleConfig.id } : {}),
        name: 'SCALE_APP',
        value: String(currentZoom),
      },
      ...this.userConfigs.filter(c => c.name !== 'SCALE_APP'),
    ];

    this.service
      .updateProfile({
        id,
        firstName: this.firstName().trim() || initial.firstName || '',
        lastName: this.lastName().trim() || initial.lastName || '',
        email: this.email(),
        urlImg: this.currentAvatarUrl() ?? undefined,
        configs,
      })
      .subscribe({
        next: (res: UserAccess) => {
          this.savingZoom.set(false);
          if (res?.configs) {
            this.userConfigs = res.configs;
          }
          this.toast.success('Preferência de zoom salva!');
        },
        error: (err: unknown) => {
          this.savingZoom.set(false);
          this.toast.error(toReadableError(err, 'Não foi possível salvar a preferência de zoom.'));
        },
      });
  }

  private notifySessionUpdate(updated: {
    firstName?: string;
    lastName?: string;
    urlImage?: string;
  }): void {
    const session = this.userSession ?? this.config.userSession;
    session?.onUserUpdated?.(updated);

    this.auth.currentUser.update(curr => {
      if (!curr) return null;
      const fn = updated.firstName !== undefined ? updated.firstName : curr.firstName;
      const ln = updated.lastName !== undefined ? updated.lastName : curr.lastName;
      const full = `${fn ?? ''} ${ln ?? ''}`.trim() || curr.fullName;
      return {
        ...curr,
        firstName: fn,
        lastName: ln,
        fullName: full,
        avatarUrl: updated.urlImage !== undefined ? updated.urlImage : curr.avatarUrl,
      };
    });
  }
}
