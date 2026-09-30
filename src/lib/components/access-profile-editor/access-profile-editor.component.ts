import { ChangeDetectionStrategy, Component, OnInit, LOCALE_ID, computed, inject, input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ButtonComponent,
  InputComponent,
  ToastService,
  TreeComponent,
  TreeNode,
} from '@detrasoft.com/detra-ng';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { WEB_AUTH_CONFIG } from '../../web-auth.config';
import { AccessProfileService } from '../../services/access-profile.service';
import {
  SoftwareService,
  SoftwareFunction,
  Software,
  resolveLocalizedName,
} from '../../services/software.service';
import { AccessProfile, AccessRole, toAccessProfilePayload } from '../../models/access-profile.model';
import { toReadableError } from '../../utils/notification.util';
import { WebAuthPageHeaderComponent } from '../shared/web-auth-page-header.component';
import { WebAuthStateComponent } from '../shared/web-auth-state.component';
import { WebAuthConfirmComponent } from '../shared/web-auth-confirm.component';

export interface FuncoesSoftware {
  softwareNome: string;
  funcoes: TreeNode[];
}

@Component({
  selector: 'dwa-access-profile-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    TreeComponent,
    WebAuthPageHeaderComponent,
    WebAuthStateComponent,
    WebAuthConfirmComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-profile-editor.component.html',
  styleUrl: './access-profile-editor.component.scss',
})
export class AccessProfileEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccessProfileService);
  private readonly softwareService = inject(SoftwareService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(WEB_AUTH_CONFIG);
  private readonly localeId = inject(LOCALE_ID, { optional: true }) ?? 'pt-BR';

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly profilesBasePath = this.config.profilesBasePath;

  readonly profileId = signal<string | null>(null);
  readonly profile = signal<AccessProfile | null>(null);
  readonly funcoesSoftware = signal<FuncoesSoftware[]>([]);
  readonly roles = signal<AccessRole[]>([]);
  readonly selectedKeys = signal<string[]>([]);
  readonly filterTerm = signal('');
  readonly loading = signal(false);
  readonly loadingRoles = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly rolesError = signal<string | null>(null);
  readonly pendingDelete = signal(false);
  readonly deleting = signal(false);

  readonly isEditMode = computed(() => !!this.profileId());

  /** Perfil padrão do sistema — somente visualização. */
  readonly isDefault = computed(() => !!this.profile()?.isDefault);
  readonly readOnly = computed(() => this.isDefault());

  readonly title = computed(() => {
    if (this.isDefault()) return this.profile()?.name || 'Visualizar perfil';
    return this.isEditMode() ? this.profile()?.name || 'Editar perfil' : 'Novo perfil de acesso';
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  /** Todas as folhas selecionáveis do catálogo */
  readonly allLeafNodes = computed<TreeNode[]>(() => {
    const list: TreeNode[] = [];
    const collect = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.selectable !== false && n.key) {
          list.push(n);
        }
        if (n.children && n.children.length > 0) {
          collect(n.children);
        }
      }
    };
    for (const fs of this.funcoesSoftware()) {
      collect(fs.funcoes);
    }
    return list;
  });

  /** Seleção no formato que o `<ds-tree>` espera (casada por `key`). */
  readonly selectedNodes = computed<TreeNode[]>(() => {
    const keys = new Set(this.selectedKeys());
    return this.allLeafNodes().filter(node => !!node.key && keys.has(node.key));
  });

  /** Árvores por software filtradas pelo termo de busca */
  readonly visibleFuncoesSoftware = computed<FuncoesSoftware[]>(() => {
    const term = this.filterTerm().trim().toLowerCase();
    if (!term) return this.funcoesSoftware();

    return this.funcoesSoftware()
      .map(fs => ({
        softwareNome: fs.softwareNome,
        funcoes: this.filterTreeNodes(fs.funcoes, term),
      }))
      .filter(fs => fs.funcoes.length > 0);
  });

  readonly hasNoVisibleNodes = computed(() => {
    const list = this.visibleFuncoesSoftware();
    return list.length === 0 || list.every(fs => fs.funcoes.length === 0);
  });

  readonly selectedCount = computed(() => this.selectedKeys().length);
  readonly totalCount = computed(() => this.roles().length);
  readonly isFiltered = computed(() => this.filterTerm().trim().length > 0);
  readonly hasNoRoles = computed(() => !this.loadingRoles() && this.roles().length === 0);
  readonly allSelected = computed(
    () => this.totalCount() > 0 && this.selectedCount() === this.totalCount(),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.profileId.set(id);
    this.loadRoles();

    if (id) {
      this.load(id);
    }
  }

  fieldError(): string {
    const control = this.form.controls.name;
    if (!control.touched || control.valid) return '';
    if (control.hasError('required')) return 'Informe um nome para o perfil.';
    if (control.hasError('maxlength')) return 'Nome muito longo.';
    return 'Valor inválido.';
  }

  /**
   * ⚠️ Contrato de ordem — não reordenar.
   *
   * O `ds-input` é `OnPush` e seu `writeValue` não chama `markForCheck()`. O
   * `patchValue` roda enquanto `loading()` ainda é `true` (formulário não
   * renderizado), então o campo nasce com o valor correto. Recarregar o perfil
   * com o formulário já na tela exige voltar `loading` para `true` antes.
   */
  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getById(id).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.form.patchValue({ name: profile.name ?? '' });
        this.selectedKeys.set(
          (profile.roles ?? [])
            .map(role => role.code ?? role.id)
            .filter((key): key is string => !!key),
        );
        if (profile.isDefault) {
          this.form.disable();
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(toReadableError(err, 'Não foi possível carregar o perfil.'));
        this.loading.set(false);
      },
    });
  }

  loadRoles(): void {
    this.loadingRoles.set(true);
    this.rolesError.set(null);

    forkJoin({
      softwares: this.softwareService.listAll(),
      backendRoles: this.service.listRoles().pipe(catchError(() => of([] as AccessRole[]))),
    }).subscribe({
      next: ({ softwares, backendRoles }) => {
        const backendRoleMap = new Map<string, AccessRole>();
        for (const r of backendRoles ?? []) {
          if (r.code) backendRoleMap.set(r.code, r);
        }

        const leaves: AccessRole[] = [];
        const fsList: FuncoesSoftware[] = (softwares ?? []).map((s: Software) => {
          const funcs = s.functions ?? s.funcoes ?? [];
          const funcoes = this.buildFuncaoTree(funcs, backendRoleMap, leaves);
          this.expandAllNodes(funcoes);
          const sName = resolveLocalizedName(s.name, this.localeId) || s.nome || '';
          return { softwareNome: sName, funcoes };
        });

        this.funcoesSoftware.set(fsList);
        this.roles.set(leaves);
        this.loadingRoles.set(false);
      },
      error: (err: unknown) => {
        this.rolesError.set(toReadableError(err, 'Não foi possível carregar as permissões do software.'));
        this.funcoesSoftware.set([]);
        this.roles.set([]);
        this.loadingRoles.set(false);
      },
    });
  }

  private buildFuncaoTree(
    funcoes: SoftwareFunction[],
    backendRoleMap: Map<string, AccessRole>,
    leavesAcc: AccessRole[],
  ): TreeNode[] {
    const roots = (funcoes ?? []).filter(f => f.root ?? f.raiz);
    return roots.map(f => this.buildNodeFromFuncao(f, backendRoleMap, leavesAcc));
  }

  private buildNodeFromFuncao(
    funcao: SoftwareFunction,
    backendRoleMap: Map<string, AccessRole>,
    leavesAcc: AccessRole[],
  ): TreeNode {
    const children: TreeNode[] = [];

    const subFunctions = funcao.subFunctions ?? funcao.subFuncoes;
    if (subFunctions && subFunctions.length > 0) {
      for (const sub of subFunctions) {
        children.push(this.buildNodeFromFuncao(sub, backendRoleMap, leavesAcc));
      }
    }

    const permissions = funcao.permissions ?? funcao.permissoes;
    if (permissions && permissions.length > 0) {
      for (const p of permissions) {
        const code = p.internalCode ?? p.codigoInterno ?? p.code ?? '';
        const permName = resolveLocalizedName(p.name, this.localeId) || p.nome || '';
        const backendRole = code ? backendRoleMap.get(code) : undefined;
        const roleData: AccessRole = {
          id: backendRole?.id,
          code,
          name: permName,
        };
        leavesAcc.push(roleData);

        children.push({
          label: code ? `${permName} (${code})` : permName,
          data: roleData,
          icon: 'fa-solid fa-key',
          children: [],
          selectable: true,
          key: code,
        });
      }
    }

    const funcName = resolveLocalizedName(funcao.name, this.localeId) || funcao.nome || '';
    const icon = funcao.icon ?? funcao.icone ?? this.getIconByType(funcao.type ?? funcao.tipo);

    return {
      label: funcName,
      data: funcao,
      icon,
      children,
      selectable: false,
      expanded: true,
    };
  }

  private getIconByType(tipo?: string | null): string {
    switch (tipo) {
      case 'M': return 'fa-solid fa-folder-plus';
      case 'C': return 'fa-solid fa-address-card';
      case 'L': return 'fa-solid fa-list-alt';
      case 'P': return 'fa-solid fa-cogs';
      case 'R': return 'fa-solid fa-chart-pie';
      case 'U': return 'fa-solid fa-sliders';
      default:  return 'fa-solid fa-cube';
    }
  }

  private expandAllNodes(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        node.expanded = true;
        this.expandAllNodes(node.children);
      }
    }
  }

  private filterTreeNodes(nodes: TreeNode[], term: string): TreeNode[] {
    const result: TreeNode[] = [];
    for (const node of nodes) {
      const labelMatch = node.label.toLowerCase().includes(term);
      const keyMatch = (node.key ?? '').toLowerCase().includes(term);
      const filteredChildren = node.children ? this.filterTreeNodes(node.children, term) : [];

      if (labelMatch || keyMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          expanded: true,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    }
    return result;
  }

  /**
   * O `<ds-tree>` emite a seleção inteira já recalculada; convertemos para
   * chaves, que são a fonte da verdade e sobrevivem ao filtro.
   */
  onSelectionChange(nodes: TreeNode[]): void {
    if (this.readOnly()) return;
    this.selectedKeys.set(
      (nodes ?? [])
        .filter(node => node.selectable !== false && !!node.key)
        .map(node => node.key as string),
    );
  }

  onFilterInput(event: Event): void {
    this.filterTerm.set((event.target as HTMLInputElement).value ?? '');
  }

  clearFilter(): void {
    this.filterTerm.set('');
  }

  /** Marca ou desmarca tudo — considera só as folhas visíveis quando há filtro. */
  toggleAllVisible(): void {
    const visibleLeafKeys: string[] = [];
    const collect = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.selectable !== false && n.key) {
          visibleLeafKeys.push(n.key);
        }
        if (n.children && n.children.length > 0) {
          collect(n.children);
        }
      }
    };
    for (const fs of this.visibleFuncoesSoftware()) {
      collect(fs.funcoes);
    }

    if (visibleLeafKeys.length === 0) return;

    const selected = new Set(this.selectedKeys());
    const allVisibleSelected = visibleLeafKeys.every(key => selected.has(key));

    if (allVisibleSelected) {
      visibleLeafKeys.forEach(key => selected.delete(key));
    } else {
      visibleLeafKeys.forEach(key => selected.add(key));
    }

    this.selectedKeys.set([...selected]);
  }

  private selectedRoles(): AccessRole[] {
    const keys = new Set(this.selectedKeys());
    return this.roles().filter(role => keys.has(role.code ?? role.id ?? ''));
  }

  save(): void {
    if (this.saving() || this.readOnly()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Informe um nome para o perfil.');
      return;
    }

    const roles = this.selectedRoles();
    if (roles.length === 0) {
      this.toast.warning(
        'Selecione ao menos uma permissão — um perfil sem permissões não concede acesso a nada.',
      );
      return;
    }

    const payload = toAccessProfilePayload(
      { id: this.profileId() ?? undefined, name: this.form.getRawValue().name },
      roles,
    );

    this.saving.set(true);

    const request$ = payload.id ? this.service.update(payload) : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(payload.id ? 'Perfil atualizado.' : 'Perfil criado.');
        this.goBack();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível salvar o perfil.'));
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
    const id = this.profileId();
    if (!id || this.deleting()) return;

    this.deleting.set(true);

    this.service.delete(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(false);
        this.toast.success('Perfil excluído.');
        this.goBack();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível excluir o perfil.'));
      },
    });
  }

  goBack(): void {
    this.location.back();
  }
}
