import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Controle de escala e zoom da interface via CSS variables (`--app-custom-zoom` e `font-size`).
 * Totalmente desacoplado de qualquer projeto, operando com persistência no LocalStorage.
 */
@Injectable({ providedIn: 'root' })
export class WebAuthZoomService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly minZoom = 70;
  private readonly maxZoom = 140;
  private readonly step = 10;
  private readonly storageKey = 'app_zoom_percentage';

  private readonly _zoomPercentage = signal<number>(100);
  readonly zoomPercentage = computed(() => this._zoomPercentage());

  constructor() {
    this.init();
  }

  private init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= this.minZoom && parsed <= this.maxZoom) {
          this._zoomPercentage.set(parsed);
          this.applyZoom(parsed);
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }

  zoomIn(): void {
    const next = Math.min(this.maxZoom, this._zoomPercentage() + this.step);
    this.setZoomPercentage(next);
  }

  zoomOut(): void {
    const next = Math.max(this.minZoom, this._zoomPercentage() - this.step);
    this.setZoomPercentage(next);
  }

  resetZoom(): void {
    this.setZoomPercentage(100);
  }

  setZoomPercentage(percentage: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, percentage));
    this._zoomPercentage.set(clamped);
    this.applyZoom(clamped);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.storageKey, String(clamped));
      } catch {}
    }
  }

  getCurrentZoomPercentage(): number {
    return this._zoomPercentage();
  }

  private applyZoom(percentage: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = this.document.documentElement;
    if (percentage === 100) {
      root.style.removeProperty('--app-custom-zoom');
      root.style.removeProperty('font-size');
    } else {
      const scale = percentage / 100;
      root.style.setProperty('--app-custom-zoom', String(scale));
      root.style.fontSize = `${16 * scale}px`;
    }
  }
}

/** Alias para compatibilidade */
export const ZoomService = WebAuthZoomService;
