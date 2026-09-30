import { Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { JwtInterceptor } from './jwt.interceptor';
import { DeviceIdInterceptor } from './device-id.interceptor';

export * from './jwt.interceptor';
export * from './device-id.interceptor';

/**
 * Provider clássico para registrar os interceptors em aplicações que usam `HTTP_INTERCEPTORS`.
 *
 * Para aplicações standalone modernas (Angular 15+), prefira:
 * `provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, deviceIdInterceptor]))`
 */
export function provideWebAuthInterceptors(): Provider[] {
  return [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: DeviceIdInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
  ];
}
