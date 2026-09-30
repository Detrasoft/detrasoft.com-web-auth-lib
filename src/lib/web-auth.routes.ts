import { Routes } from '@angular/router';

/**
 * Rotas de "Usuários e Acesso".
 *
 * Monte com `loadChildren` no app hospedeiro e informe o mesmo caminho em
 * `provideWebAuth({ usersBasePath })`, para a navegação interna bater:
 *
 * ```ts
 * {
 *   path: 'users',
 *   loadChildren: () => import('@detrasoft.com/web-auth').then(m => m.USERS_ROUTES),
 *   data: { title: 'Usuários' },
 * }
 * ```
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/user-listing/user-listing.component').then(m => m.UserListingComponent),
    data: { title: 'Usuários' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/user-editor/user-editor.component').then(m => m.UserEditorComponent),
    data: { title: 'Novo usuário' },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./components/user-editor/user-editor.component').then(m => m.UserEditorComponent),
    data: { title: 'Editar usuário' },
  },
  {
    path: ':id',
    redirectTo: ':id/edit',
    pathMatch: 'full',
  },
];

/**
 * Rotas de "Perfis de Acesso".
 *
 * ```ts
 * {
 *   path: 'profiles',
 *   loadChildren: () => import('@detrasoft.com/web-auth').then(m => m.ACCESS_PROFILES_ROUTES),
 *   data: { title: 'Perfis de acesso' },
 * }
 * ```
 */
export const ACCESS_PROFILES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/access-profile-listing/access-profile-listing.component').then(
        m => m.AccessProfileListingComponent,
      ),
    data: { title: 'Perfis de acesso' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/access-profile-editor/access-profile-editor.component').then(
        m => m.AccessProfileEditorComponent,
      ),
    data: { title: 'Novo perfil de acesso' },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./components/access-profile-editor/access-profile-editor.component').then(
        m => m.AccessProfileEditorComponent,
      ),
    data: { title: 'Editar perfil de acesso' },
  },
  {
    path: ':id',
    redirectTo: ':id/edit',
    pathMatch: 'full',
  },
];

/**
 * Rotas de "Meus dados e perfil" (User Data).
 *
 * ```ts
 * {
 *   path: 'user-data',
 *   loadChildren: () => import('@detrasoft.com/web-auth').then(m => m.USER_DATA_ROUTES),
 *   data: { title: 'Meus dados' },
 * }
 * ```
 */
export const USER_DATA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/user-data/user-data.component').then(m => m.UserDataComponent),
    data: { title: 'Meus dados' },
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./components/change-password/change-password.component').then(
        m => m.ChangePasswordComponent,
      ),
    data: { title: 'Alterar senha' },
  },
  {
    path: 'change-email',
    loadComponent: () =>
      import('./components/change-email/change-email.component').then(
        m => m.ChangeEmailComponent,
      ),
    data: { title: 'Alterar e-mail' },
  },
];

/**
 * Rota de "Login" compartilhado.
 *
 * ```ts
 * {
 *   path: 'login',
 *   loadChildren: () => import('@detrasoft.com/web-auth').then(m => m.LOGIN_ROUTES),
 *   data: { title: 'Entrar' },
 * }
 * ```
 */
export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    data: { title: 'Entrar' },
  },
];
