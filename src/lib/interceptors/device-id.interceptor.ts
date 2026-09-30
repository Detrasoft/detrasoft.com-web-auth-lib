import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptorFn,
  HttpHandlerFn,
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { DeviceInfoService } from '../services/device-info.service';

/**
 * Functional DeviceId Interceptor para uso no `provideHttpClient(withInterceptors([deviceIdInterceptor]))`.
 *
 * Envia o header `Device-Id` em toda requisição HTTP. O authorization-server usa esse
 * header para vincular a sessão de refresh ao dispositivo que a abriu.
 */
export const deviceIdInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const deviceInfo = inject(DeviceInfoService);

  if (req.headers.has('Device-Id')) {
    return next(req);
  }

  return from(deviceInfo.ready()).pipe(
    mergeMap(() => {
      const deviceId = deviceInfo.deviceId;
      if (!deviceId) {
        return next(req);
      }
      return next(req.clone({ setHeaders: { 'Device-Id': deviceId } }));
    }),
  );
};

/**
 * Classe DeviceIdInterceptor para compatibilidade com `HTTP_INTERCEPTORS`.
 */
@Injectable()
export class DeviceIdInterceptor implements HttpInterceptor {
  private readonly deviceInfo = inject(DeviceInfoService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.headers.has('Device-Id')) {
      return next.handle(req);
    }

    return from(this.deviceInfo.ready()).pipe(
      mergeMap(() => {
        const deviceId = this.deviceInfo.deviceId;
        if (!deviceId) {
          return next.handle(req);
        }
        return next.handle(req.clone({ setHeaders: { 'Device-Id': deviceId } }));
      }),
    );
  }
}
