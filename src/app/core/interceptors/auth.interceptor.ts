import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(AuthTokenStorageService);

  if (
    req.context.get(SKIP_AUTH) ||
    !req.url.startsWith(environment.apiUrl) ||
    req.headers.has('Authorization')
  ) {
    return next(req);
  }

  const token = tokenStorage.getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
