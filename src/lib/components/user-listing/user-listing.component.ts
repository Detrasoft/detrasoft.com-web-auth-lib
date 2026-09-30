import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonComponent, ListColumnDirective, ListComponent, ToastService } from '@detrasoft.com/detra-ng';

import { WEB_AUTH_CONFIG } from '../../web-auth.config';
import { UserAccessService } from '../../services/user-access.service';
import { UserAccess, isUserActive, toUserAccessFilter, userFullName, userInitials, userTypeLabel } from '../../models/user-access.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';
import { WebAuthConfirmComponent } from '../shared/web-auth-confirm.component';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';

@Component({
  selector: 'dwa-user-listing',
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
  templateUrl: './user-listing.component.html',
  styleUrl: './user-listing.component.scss',
})
export class UserListingComponent implements OnInit {
  private readonly service = inject(UserAccessService);
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

  readonly users = signal<UserAccess[]>([]);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly processingId = signal<string | null>(null);
  readonly pendingDelete = signal<UserAccess | null>(null);
  readonly deleting = signal(false);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.users().length === 0);
  readonly isFiltered = computed(() => this.searchTerm().trim().length > 0);

  readonly fullName = userFullName;
  readonly initials = userInitials;
  readonly isActive = isUserActive;
  readonly typeLabel = userTypeLabel;

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

    this.service.search(toUserAccessFilter(this.searchTerm()), this.page(), this.pageSize).subscribe({
      next: response => {
        this.users.set(response?.content ?? []);
        this.totalRecords.set(response?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toReadableError(err, 'Não foi possível carregar os usuários.'));
        this.users.set([]);
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

  newUser(): void {
    void this.router.navigate([this.config.usersBasePath, 'new']);
  }

  edit(user: UserAccess): void {
    if (!user?.id) return;
    void this.router.navigate([this.config.usersBasePath, user.id, 'edit']);
  }

  toggleActive(user: UserAccess): void {
    if (!user?.id || this.processingId()) return;

    const inactive = !user.inactive;
    this.processingId.set(user.id);

    this.service.setInactive(user.id, inactive).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(item => (item.id === user.id ? { ...item, inactive } : item)),
        );
        this.processingId.set(null);
        this.toast.success(
          inactive
            ? `${this.fullName(user)} foi inativado e não consegue mais acessar o workspace.`
            : `${this.fullName(user)} voltou a ter acesso ao workspace.`,
        );
      },
      error: (err: unknown) => {
        this.processingId.set(null);
        this.toast.error(toReadableError(err, 'Não foi possível alterar o acesso do usuário.'));
      },
    });
  }

  askDelete(user: UserAccess): void {
    this.pendingDelete.set(user);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const user = this.pendingDelete();
    if (!user?.id || this.deleting()) return;

    this.deleting.set(true);

    this.service.delete(user.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`${this.fullName(user)} foi removido do workspace.`);

        // Evita ficar numa página órfã ao excluir o último item.
        if (this.users().length === 1 && this.page() > 1) {
          this.page.update(current => current - 1);
        }
        this.load();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível excluir o usuário.'));
      },
    });
  }
}
