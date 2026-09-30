import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { WEB_AUTH_CONFIG } from '../web-auth.config';

/**
 * authGuard — protege rotas internas. Redireciona para login se não houver sessão ativa.
 */
export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const config = inject(WEB_AUTH_CONFIG);

  if (auth.isLogged()) {
    return true;
  }

  auth.previousUrl = state.url;
  const loginPath = config.loginRoute || '/login';
  return router.createUrlTree([loginPath], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * guestGuard — só permite acesso a quem NÃO está autenticado (telas de login e registro).
 * Redireciona usuários já autenticados para a homeRoute/dashboard configurada.
 */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const config = inject(WEB_AUTH_CONFIG);

  if (!auth.isLogged()) {
    return true;
  }

  const homePath = config.homeRoute || config.redirectUrlAfterLogin || '/';
  return router.parseUrl(homePath);
};
