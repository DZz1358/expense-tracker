import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LocalStorageService } from '../../shared/local-storage/local-storage.service';
import { StorageKey } from '../../shared/local-storage/storage-key.enum';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(AuthTokenStorageService);
  const localStorageService = inject(LocalStorageService);
  const router = inject(Router);
  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const skipAuth = req.context.get(SKIP_AUTH);

  const token = !skipAuth && isApiRequest && !req.headers.has('Authorization')
    ? tokenStorage.getToken()
    : null;

  const authRequest = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(authRequest).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !skipAuth
      ) {
        tokenStorage.clearToken();
        localStorageService.removeItem(StorageKey.User);
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
