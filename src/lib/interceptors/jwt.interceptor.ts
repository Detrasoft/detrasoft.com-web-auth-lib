import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn,
} from '@angular/common/http';
import { Observable, of, switchMap, catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { WEB_AUTH_CONFIG, ResolvedWebAuthConfig } from '../web-auth.config';

function isAllowedDomain(url: string, allowedDomains: (string | RegExp)[]): boolean {
  if (!url.startsWith('http')) return true;
  try {
    const parsed = new URL(url);
    return allowedDomains.some((rx) =>
      typeof rx === 'string' ? parsed.hostname.includes(rx) : rx.test(parsed.hostname),
    );
  } catch {
    return false;
  }
}

function shouldSkipToken(url: string, disallowedRoutes: (string | RegExp)[]): boolean {
  return disallowedRoutes.some((rx) =>
    typeof rx === 'string' ? url.includes(rx) : rx.test(url),
  );
}

/**
 * Functional JWT Interceptor para uso no `provideHttpClient(withInterceptors([jwtInterceptor]))`.
 */
export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const config = inject(WEB_AUTH_CONFIG);

  if (
    shouldSkipToken(req.url, config.tokenDisallowedRoutes) ||
    !isAllowedDomain(req.url, config.tokenAllowedDomains)
  ) {
    return next(req);
  }

  const token = auth.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const isLogout = req.url.includes(config.logoutPath || '/auth/logout');

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const refreshToken = auth.getRefreshToken();
      if (!isLogout && err.status === 401 && refreshToken) {
        return auth.refresh().pipe(
          switchMap((newToken) => {
            if (!newToken) {
              auth.logout();
              return throwError(() => err);
            }
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retried);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => err);
          }),
        );
      }
      if (isLogout && err.status === 401) {
        return of(null as any);
      }
      return throwError(() => err);
    }),
  );
};

/**
 * Classe JwtInterceptor para compatibilidade com `HTTP_INTERCEPTORS`.
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private readonly config: ResolvedWebAuthConfig = inject(WEB_AUTH_CONFIG);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (
      shouldSkipToken(req.url, this.config.tokenDisallowedRoutes) ||
      !isAllowedDomain(req.url, this.config.tokenAllowedDomains)
    ) {
      return next.handle(req);
    }

    const token = this.auth.getAccessToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    const isLogout = req.url.includes(this.config.logoutPath || '/auth/logout');

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        const refreshToken = this.auth.getRefreshToken();
        if (!isLogout && err.status === 401 && refreshToken) {
          return this.auth.refresh().pipe(
            switchMap((newToken) => {
              if (!newToken) {
                this.auth.logout();
                return throwError(() => err);
              }
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next.handle(retried);
            }),
            catchError(() => {
              this.auth.logout();
              return throwError(() => err);
            }),
          );
        }
        if (isLogout && err.status === 401) {
          return of(null as any);
        }
        return throwError(() => err);
      }),
    );
  }
}
