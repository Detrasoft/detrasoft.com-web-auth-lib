import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { WEB_AUTH_CONFIG, ResolvedWebAuthConfig } from '../web-auth.config';
import { AuthenticationResponse, AuthUser, UserLoginPayload } from '../models/auth.model';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ACCESS_TOKEN_ALT: 'access_token',
  REFRESH_TOKEN_ALT: 'refresh_token',
  REMEMBER_EMAIL: 'rememberEmail',
  ACTIVE_SOFTWARE: 'activeSoftware',
  USER_DATA: 'userData',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly config: ResolvedWebAuthConfig = inject(WEB_AUTH_CONFIG);

  readonly accessToken = signal<string | null>(this.readInitialToken());
  readonly isAuthenticated = signal<boolean>(!!this.accessToken());
  readonly currentUser = signal<AuthUser | null>(this.readInitialUser());

  /**
   * Constrói a URL completa para login de acordo com o microservice `authorization-server`.
   * Padrão: `{baseUrl}/{apiPath}/auth/{software}/login`
   */
  getLoginUrl(software?: string): string {
    const sw = software || this.config.software || 'detrasoft';
    const cleanBase = (this.config.baseUrl || '').replace(/\/+$/, '');
    const cleanApiPath = (this.config.apiPath || '/authorization-server').replace(/^\/+|\/+$/g, '');
    const path = `auth/${sw}/login`;
    return cleanApiPath ? `${cleanBase}/${cleanApiPath}/${path}` : `${cleanBase}/${path}`;
  }

  /**
   * Realiza login no microservice `authorization-server` para o produto específico.
   *
   * @param payload Credenciais (e-mail e senha)
   * @param software Identificador do produto ('form', 'note', 'task', etc.)
   * @param remember Se deve persistir credenciais/sessão permanentemente
   * @param deviceId ID do dispositivo (opcional)
   */
  login(
    payload: UserLoginPayload,
    software?: string,
    remember = true,
    deviceId?: string,
  ): Observable<AuthenticationResponse> {
    const sw = software || this.config.software || 'detrasoft';
    const url = this.getLoginUrl(sw);

    const cleanPayload: UserLoginPayload = {
      email: payload.email.toLowerCase().trim(),
      password: payload.password,
    };

    let headers = new HttpHeaders();
    if (deviceId) {
      headers = headers.set('Device-Id', deviceId.trim());
    }

    return this.http.post<AuthenticationResponse>(url, cleanPayload, { headers }).pipe(
      tap((res) => {
        if (res.access_token) {
          this.saveSession(res, remember, cleanPayload.email, sw);
        }
      }),
    );
  }

  /**
   * Salva a sessão e atualiza os signals reativos.
   */
  saveSession(
    response: AuthenticationResponse,
    remember = true,
    email?: string,
    software?: string,
  ): void {
    const token = response.access_token;
    if (!token) return;

    const storage = remember ? localStorage : sessionStorage;

    try {
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN_ALT, token);

      if (response.refresh_token) {
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN_ALT, response.refresh_token);
      }

      if (software) {
        storage.setItem(STORAGE_KEYS.ACTIVE_SOFTWARE, software);
      }

      if (email && remember) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, email);
      } else if (!remember) {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      }

      const decoded = this.decodeJwt(token);
      const user: AuthUser = {
        id: decoded?.sub || decoded?.userId || decoded?.id,
        email: email || decoded?.email || decoded?.sub,
        fullName: decoded?.name || decoded?.fullName,
        userName: decoded?.preferred_username || decoded?.username,
        software: software || decoded?.software || this.config.software,
        roles: decoded?.roles || decoded?.authorities || [],
        permissions: decoded?.permissions || [],
      };

      storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      this.accessToken.set(token);
      this.isAuthenticated.set(true);
      this.currentUser.set(user);
    } catch (e) {
      console.warn('Não foi possível persistir tokens no storage:', e);
    }
  }

  /**
   * Remove tokens e encerra a sessão local.
   */
  logout(redirectRoute?: string): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN_ALT);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN_ALT);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);

      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN_ALT);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN_ALT);
      sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch {}

    this.accessToken.set(null);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);

    if (redirectRoute !== undefined) {
      this.router.navigateByUrl(redirectRoute);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
        null
      );
    } catch {
      return null;
    }
  }

  getSavedEmail(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL) || null;
    } catch {
      return null;
    }
  }

  private readInitialToken(): string | null {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
        null
      );
    } catch {
      return null;
    }
  }

  private readInitialUser(): AuthUser | null {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEYS.USER_DATA) ||
        sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}
