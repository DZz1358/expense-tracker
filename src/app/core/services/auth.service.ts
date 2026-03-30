import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, tap } from 'rxjs';

import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

import { AuthTokenStorageService } from './auth-token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  login(payload: LoginRequest): Observable<LoginResponse> {
    console.log('Attempting login with payload:', payload);
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        tap((response) => {
          console.log('Login response:', response);
          this.tokenStorage.setToken(response.accessToken);
        }),
      );
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.getToken() !== null;
  }
}
