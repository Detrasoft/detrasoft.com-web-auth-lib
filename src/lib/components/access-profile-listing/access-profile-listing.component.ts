import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonComponent, ListColumnDirective, ListComponent, ToastService } from '@detrasoft.com/detra-ng';

import { WEB_AUTH_CONFIG } from '../../web-auth.config';
import { AccessProfileService } from '../../services/access-profile.service';
import { AccessProfile } from '../../models/access-profile.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';
import { WebAuthConfirmComponent } from '../shared/web-auth-confirm.component';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';

@Component({
  selector: 'dwa-access-profile-listing',
  standalone: true,
  imports: [
    CommonModule,
    ListComponent,
    ListColumnDirective,
    ButtonComponent,
    WebAuthPageHeaderComponent,
    WebAuthStateComponent,
    WebAuthConfirmComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-profile-listing.component.html',
  styleUrl: './access-profile-listing.component.scss',
})
export class AccessProfileListingComponent implements OnInit {
  private readonly service = inject(AccessProfileService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly config = inject(WEB_AUTH_CONFIG);

  private readonly searchInput$ = new Subject<string>();

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly labels = this.config.labels;
  readonly backPath = this.config.backPath;
  readonly pageSize = this.config.pageSize;

  readonly profiles = signal<AccessProfile[]>([]);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly pendingDelete = signal<AccessProfile | null>(null);
  readonly deleting = signal(false);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.profiles().length === 0);
  readonly isFiltered = computed(() => this.searchTerm().trim().length > 0);
  readonly hasRolesColumn = computed(() => this.profiles().some(p => (p.roles?.length ?? 0) > 0));

  constructor() {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(term => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.list(this.page(), this.pageSize, this.searchTerm()).subscribe({
      next: response => {
        this.profiles.set(response?.content ?? []);
        this.totalRecords.set(response?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toReadableError(err, 'Não foi possível carregar os perfis de acesso.'));
        this.profiles.set([]);
        this.totalRecords.set(0);
        this.loading.set(false);
      },
    });
  }

  onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value ?? '');
  }

  clearSearch(): void {
    this.searchInput$.next('');
  }

  /** O `<ds-list>` emite a página em base 1; o serviço converte para base 0. */
  onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  newProfile(): void {
    void this.router.navigate([this.config.profilesBasePath, 'new']);
  }

  edit(profile: AccessProfile): void {
    if (!profile?.id) return;
    void this.router.navigate([this.config.profilesBasePath, profile.id, 'edit']);
  }

  /** Perfis padrão (detrasoftId=null) não podem ser editados/excluídos pelo tenant. */
  isDefault(profile: AccessProfile): boolean {
    return !!profile?.isDefault;
  }

  roleCount(profile: AccessProfile): number {
    return profile?.roles?.length ?? 0;
  }

  hasRoleDetails(profile: AccessProfile): boolean {
    return (profile?.roles?.length ?? 0) > 0;
  }

  /** Amostra de permissões exibida como chips na listagem. */
  rolePreview(profile: AccessProfile): string[] {
    return (profile?.roles ?? []).slice(0, 3).map(role => role.name || role.code);
  }

  hiddenRoleCount(profile: AccessProfile): number {
    return Math.max(0, this.roleCount(profile) - 3);
  }

  askDelete(profile: AccessProfile): void {
    this.pendingDelete.set(profile);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const profile = this.pendingDelete();
    if (!profile?.id || this.deleting()) return;

    this.deleting.set(true);

    this.service.delete(profile.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`Perfil "${profile.name}" excluído.`);

        if (this.profiles().length === 1 && this.page() > 1) {
          this.page.update(current => current - 1);
        }
        this.load();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível excluir o perfil.'));
      },
    });
  }

  pendingDeleteName(): string {
    return this.pendingDelete()?.name ?? '';
  }
}
