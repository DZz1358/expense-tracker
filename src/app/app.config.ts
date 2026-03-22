import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { ErrorStateMatcher, MAT_DATE_LOCALE, provideNativeDateAdapter, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { environment } from '../environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNativeDateAdapter(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    // provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // provideFirestore(() => getFirestore()),
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher }
  ]
};
