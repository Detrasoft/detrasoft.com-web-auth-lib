import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ButtonComponent,
  DropdownComponent,
  InputComponent,
  ToastService,
} from '@detrasoft.com/detra-ng';

import { WEB_AUTH_CONFIG } from '../../web-auth.config';
import { UserAccessService } from '../../services/user-access.service';
import { AccessProfileService } from '../../services/access-profile.service';
import { AccessProfile } from '../../models/access-profile.model';
import {
  USER_TYPE_OPTIONS,
  UserAccess,
  UserType,
  userFullName,
} from '../../models/user-access.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';
import { WebAuthConfirmComponent } from '../shared/web-auth-confirm.component';

/** Mesmo padrão usado pelo `UserValidatorModelService` do legado. */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Catálogo de perfis carregado de uma vez para o seletor. */
const PROFILE_PICKER_PAGE_SIZE = 200;

@Component({
  selector: 'dwa-user-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputComponent,
    DropdownComponent,
    ButtonComponent,
    WebAuthPageHeaderComponent,
    WebAuthStateComponent,
    WebAuthConfirmComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-editor.component.html',
  styleUrl: './user-editor.component.scss',
})
export class UserEditorComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UserAccessService);
  private readonly profileService = inject(AccessProfileService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(WEB_AUTH_CONFIG);

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly usersBasePath = this.config.usersBasePath;

  /** Cópia mutável: o `[options]` do `<ds-dropdown>` é tipado como `any[]`. */
  readonly typeOptions = [...USER_TYPE_OPTIONS];

  readonly userId = signal<string | null>(null);
  readonly user = signal<UserAccess | null>(null);
  readonly profiles = signal<AccessProfile[]>([]);
  readonly selectedProfileIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingDelete = signal(false);
  readonly deleting = signal(false);

  // Estados de validação assíncrona do e-mail
  readonly emailChecking = signal(false);
  readonly emailTaken = signal(false);
  readonly emailAvailable = signal(false);
  private checkEmailTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly isEditMode = computed(() => !!this.userId());

  readonly title = computed(() =>
    this.isEditMode() ? userFullName(this.user()) || 'Editar usuário' : 'Novo usuário',
  );

  readonly description = computed(() =>
    this.isEditMode()
      ? 'Atualize as informações cadastrais e permissões de acesso do usuário.'
      : 'Informe os dados básicos. A pessoa receberá um e-mail para definir a própria senha e ativar o acesso.',
  );

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(120)]],
    lastName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    type: ['Default' as UserType, [Validators.required]],
  });

  readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: 'Default' as UserType,
  });

  readonly isStandardUser = computed(() => this.selectedType() === 'Default');

  readonly missingProfile = computed(
    () => this.isStandardUser() && this.selectedProfileIds().length === 0,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.userId.set(id);
    this.loadProfiles();

    if (id) {
      this.load(id);
    }
  }

  ngOnDestroy(): void {
    if (this.checkEmailTimeout) {
      clearTimeout(this.checkEmailTimeout);
    }
  }

  onEmailChange(value: string): void {
    if (this.checkEmailTimeout) {
      clearTimeout(this.checkEmailTimeout);
    }

    this.emailTaken.set(false);
    this.emailAvailable.set(false);

    const trimmed = (value ?? '').trim().toLowerCase();
    const originalEmail = (this.user()?.email ?? '').trim().toLowerCase();

    // Se for o mesmo e-mail do usuário em edição, não precisa verificar e está liberado
    if (this.isEditMode() && trimmed === originalEmail) {
      this.emailChecking.set(false);
      this.clearEmailTakenError();
      return;
    }

    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
      this.emailChecking.set(false);
      this.clearEmailTakenError();
      return;
    }

    this.emailChecking.set(true);
    this.checkEmailTimeout = setTimeout(() => {
      const excludeId = this.isEditMode() ? this.userId() : null;
      this.service.checkEmailExists(trimmed, excludeId).subscribe({
        next: (exists: boolean) => {
          this.emailChecking.set(false);
          this.emailTaken.set(exists);
          this.emailAvailable.set(!exists);
          if (exists) {
            this.form.controls.email.setErrors({
              ...this.form.controls.email.errors,
              emailTaken: true,
            });
          } else {
            this.clearEmailTakenError();
          }
        },
        error: () => {
          this.emailChecking.set(false);
        },
      });
    }, 400);
  }

  private clearEmailTakenError(): void {
    if (this.form.controls.email.hasError('emailTaken')) {
      const errors = { ...this.form.controls.email.errors };
      delete errors['emailTaken'];
      this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  /** Mensagem de erro do campo, exibida somente após interação. */
  fieldError(name: 'firstName' | 'lastName' | 'email'): string {
    if (name === 'email') {
      if (this.emailTaken() || this.form.controls.email.hasError('emailTaken')) {
        return 'Este e-mail já está sendo utilizado por outro usuário.';
      }
    }
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return '';
    if (control.hasError('required')) return 'Campo obrigatório.';
    if (control.hasError('pattern')) return 'Informe um e-mail válido.';
    if (control.hasError('maxlength')) return 'Texto muito longo.';
    return 'Valor inválido.';
  }

  /**
   * ⚠️ Contrato de ordem — não reordenar.
   *
   * Os componentes de formulário da detra-ng (`ds-input`, `ds-dropdown`) são
   * `OnPush` e o `writeValue` deles **não** chama `markForCheck()`. Se o
   * `patchValue` acontecer com os campos já renderizados, o valor entra no
   * `FormControl` mas a `<input>` continua exibindo o conteúdo antigo.
   *
   * Aqui isso não ocorre porque o formulário só é renderizado quando
   * `loading()` vira `false` (ver template): o `patchValue` e o `disable()`
   * rodam **antes**, de modo que os componentes nascem já com o valor correto.
   *
   * Consequência prática: qualquer novo fluxo que recarregue o usuário precisa
   * voltar `loading` para `true` antes de tocar no formulário.
   */
  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getById(id).subscribe({
      next: user => {
        this.user.set(user);
        this.form.patchValue({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          type: user.type ?? 'Default',
        });
        this.emailChecking.set(false);
        this.emailTaken.set(false);
        this.emailAvailable.set(false);
        this.clearEmailTakenError();

        this.selectedProfileIds.set(
          (user.profiles ?? []).map(profile => profile.id).filter((id): id is string => !!id),
        );
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toReadableError(err, 'Não foi possível carregar o usuário.'));
        this.loading.set(false);
      },
    });
  }

  private loadProfiles(): void {
    this.profileService.list(1, PROFILE_PICKER_PAGE_SIZE).subscribe({
      next: response => this.profiles.set(response?.content ?? []),
      // Falha no catálogo não bloqueia a edição dos dados básicos.
      error: () => this.profiles.set([]),
    });
  }

  isProfileSelected(profileId?: string): boolean {
    return !!profileId && this.selectedProfileIds().includes(profileId);
  }

  toggleProfile(profileId?: string): void {
    if (!profileId) return;
    this.selectedProfileIds.update(current =>
      current.includes(profileId)
        ? current.filter(id => id !== profileId)
        : [...current, profileId],
    );
  }



  private selectedProfilesPayload(): Array<{ id: string; name: string }> {
    const selected = this.selectedProfileIds();
    return this.profiles()
      .filter(profile => !!profile.id && selected.includes(profile.id))
      .map(profile => ({ id: profile.id as string, name: profile.name }));
  }

  save(): void {
    if (this.saving() || this.emailChecking()) return;

    if (this.emailTaken() || this.form.controls.email.hasError('emailTaken')) {
      this.toast.error('Este e-mail já está sendo utilizado por outro usuário.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Revise os campos destacados antes de salvar.');
      return;
    }

    if (this.isStandardUser() && this.missingProfile()) {
      this.toast.warning(
        'Usuários do tipo Padrão precisam de ao menos um perfil de acesso, senão entram sem permissão alguma.',
      );
      return;
    }

    const raw = this.form.getRawValue();
    const profiles = raw.type === 'Admin' ? [] : this.selectedProfilesPayload();
    this.saving.set(true);

    const id = this.userId();
    const request$ = id
      ? this.service.update({
          id,
          firstName: raw.firstName.trim(),
          lastName: raw.lastName.trim(),
          email: raw.email.trim(),
          type: raw.type,
          inactive: this.user()?.inactive ?? false,
          profiles,
        })
      : this.service.create({
          firstName: raw.firstName.trim(),
          lastName: raw.lastName.trim(),
          email: raw.email.trim(),
          type: raw.type,
          profiles,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          id
            ? 'Usuário atualizado.'
            : 'Usuário criado. Enviamos um e-mail para a pessoa definir a senha.',
        );
        this.goBack();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível salvar o usuário.'));
      },
    });
  }

  askDelete(): void {
    this.pendingDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(false);
  }

  confirmDelete(): void {
    const id = this.userId();
    if (!id || this.deleting()) return;

    this.deleting.set(true);

    this.service.delete(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(false);
        this.toast.success('Usuário removido do workspace.');
        this.goBack();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível excluir o usuário.'));
      },
    });
  }

  goBack(): void {
    this.location.back();
  }
}
