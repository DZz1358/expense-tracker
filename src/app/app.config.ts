import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { ErrorStateMatcher, MAT_DATE_LOCALE, provideNativeDateAdapter, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';

import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNativeDateAdapter(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher }
  ]
};
