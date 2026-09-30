/*
 * API pública da @detrasoft.com/web-auth
 *
 * Usuários, acesso e perfis de acesso para produtos Detrasoft.
 * Depende apenas do authorization-server e da @detrasoft.com/detra-ng.
 */

/* ── Configuração / providers ── */
export * from './lib/web-auth.config';

/* ── Rotas ── */
export * from './lib/web-auth.routes';

/* ── Models ── */
export * from './lib/models/api-response.model';
export * from './lib/models/user-access.model';
export * from './lib/models/access-profile.model';
export * from './lib/models/auth.model';

/* ── Services ── */
export * from './lib/services/auth.service';
export * from './lib/services/user-access.service';
export * from './lib/services/access-profile.service';
export * from './lib/services/software.service';
export * from './lib/services/zoom.service';

/* ── Utils ── */
export * from './lib/utils/notification.util';

/* ── Components ── */
export { LoginComponent } from './lib/components/login/login.component';
export { UserListingComponent } from './lib/components/user-listing/user-listing.component';
export { UserEditorComponent } from './lib/components/user-editor/user-editor.component';
export { AccessProfileListingComponent } from './lib/components/access-profile-listing/access-profile-listing.component';
export { AccessProfileEditorComponent } from './lib/components/access-profile-editor/access-profile-editor.component';
export { UserDataComponent } from './lib/components/user-data/user-data.component';
export { ChangePasswordComponent } from './lib/components/change-password/change-password.component';
export { ChangeEmailComponent } from './lib/components/change-email/change-email.component';

/* ── Components compartilhados (reutilizáveis pelo app hospedeiro) ── */
export { WebAuthPageHeaderComponent } from './lib/components/shared/web-auth-page-header.component';
export { WebAuthStateComponent } from './lib/components/shared/web-auth-state.component';
export { WebAuthConfirmComponent } from './lib/components/shared/web-auth-confirm.component';
