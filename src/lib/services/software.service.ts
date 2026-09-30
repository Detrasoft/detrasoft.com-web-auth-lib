import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { WEB_AUTH_CONFIG } from '../web-auth.config';

/* ── Types ── */

export interface LocalizedName {
  language?: string;
  locale?: string;
  value: string;
}

export type LocalizedValue = LocalizedName[] | string;

/**
 * Resolve o texto no idioma desejado a partir de um array multilíngue ou string simples.
 * Suporta correspondência exata ('pt-BR'), prefixo de idioma ('pt', 'en'),
 * com fallbacks inteligentes e fallback final para o primeiro valor disponível.
 */
export function resolveLocalizedName(
  names: LocalizedValue | undefined | null,
  currentLang: string = 'pt-BR',
): string {
  if (!names) return '';
  if (typeof names === 'string') return names;
  if (Array.isArray(names)) {
    if (names.length === 0) return '';
    const norm = (l?: string) => (l || '').toLowerCase().replace('_', '-');
    const target = norm(currentLang);
    const targetPrefix = target.split('-')[0];

    // 1. Correspondência exata (ex.: 'pt-BR' ou 'en-US')
    let found = names.find(n => norm(n.language || n.locale) === target);
    if (found?.value) return found.value;

    // 2. Correspondência por prefixo de idioma (ex.: 'pt' casa com 'pt-BR')
    found = names.find(n => {
      const l = norm(n.language || n.locale);
      return l.split('-')[0] === targetPrefix;
    });
    if (found?.value) return found.value;

    // 3. Fallback para 'pt-BR' ou 'pt'
    found = names.find(n => {
      const l = norm(n.language || n.locale);
      return l === 'pt-br' || l === 'pt';
    });
    if (found?.value) return found.value;

    // 4. Fallback para 'en' ou 'en-US'
    found = names.find(n => {
      const l = norm(n.language || n.locale);
      return l === 'en' || l === 'en-us';
    });
    if (found?.value) return found.value;

    // 5. Primeiro valor disponível
    return names[0]?.value || '';
  }
  return '';
}

export interface SoftwarePermission {
  id?: number | string;
  name: LocalizedValue;
  internalCode?: string;
  code?: string;
  /** Compatibilidade legado */
  codigoInterno?: string;
  nome?: string;
}

export type Permissao = SoftwarePermission;

export interface SoftwareFunction {
  id?: number | string;
  name: LocalizedValue;
  order?: number | null;
  type?: string | null;
  root?: boolean;
  url?: string | null;
  command?: string | null;
  icon?: string | null;
  subFunctions?: SoftwareFunction[];
  permissions?: SoftwarePermission[];

  /** Compatibilidade legado */
  nome?: string;
  ordem?: number | null;
  tipo?: string | null;
  raiz?: boolean;
  comando?: string | null;
  icone?: string | null;
  subFuncoes?: SoftwareFunction[];
  permissoes?: SoftwarePermission[];
}

export type Funcao = SoftwareFunction;

export interface Software {
  id?: number | string;
  name: LocalizedValue;
  functions?: SoftwareFunction[];

  /** Compatibilidade legado */
  nome?: string;
  funcoes?: SoftwareFunction[];
}

/* ── Service ── */

@Injectable({ providedIn: 'root' })
export class SoftwareService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WEB_AUTH_CONFIG, { optional: true });

  listAll(): Observable<Software[]> {
    const url = this.config?.softwareDataUrl ?? 'assets/data/software.json';
    return this.http.get<any>(url).pipe(
      map(res => {
        const data = res?.data || res;
        if (Array.isArray(data)) return data;
        return data?.content || [];
      }),
      catchError(() => of([] as Software[])),
    );
  }
}

