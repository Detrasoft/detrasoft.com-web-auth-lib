import { Injectable } from '@angular/core';

/**
 * DeviceInfoService — gerencia a identidade persistente do dispositivo web.
 *
 * O authorization-server vincula a sessão de refresh ao header `Device-Id`.
 * No ambiente Web (browser), este serviço gera e persiste um UUID v4 no `localStorage`
 * sob a chave `detrasoft.device_id`.
 */
@Injectable({ providedIn: 'root' })
export class DeviceInfoService {
  private _deviceId = '';
  private _ready: Promise<void> | null = null;

  constructor() {
    this._ready = this.load();
  }

  /**
   * Aguarda a inicialização do Device-Id.
   */
  async ready(): Promise<void> {
    if (this._ready) {
      await this._ready;
    }
  }

  get deviceId(): string {
    return this._deviceId;
  }

  private async load(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('detrasoft.device_id');
        if (stored) {
          this._deviceId = stored;
          return;
        }
        const newId = this.generateUuid();
        localStorage.setItem('detrasoft.device_id', newId);
        this._deviceId = newId;
      } else {
        this._deviceId = this.generateUuid();
      }
    } catch {
      this._deviceId = this.generateUuid();
    }
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
