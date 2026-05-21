import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, tap } from 'rxjs';

import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import { AuthUser, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

import { AuthTokenStorageService } from './auth-token-storage.service';
import { LocalStorageService } from '../../shared/local-storage/local-storage.service';
import { StorageKey } from '../../shared/local-storage/storage-key.enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(AuthTokenStorageService);
  private readonly localStorageService = inject(LocalStorageService);

  readonly currentUser = signal<AuthUser | null>(
    this.localStorageService.getItem<AuthUser>(StorageKey.User)
  );

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        tap((response) => {
          this.tokenStorage.setToken(response.accessToken);
          this.currentUser.set(response.user);
          this.localStorageService.setItem(StorageKey.User, response.user);
        }),
      );
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        tap((response) => {
          this.tokenStorage.setToken(response.accessToken);
          this.currentUser.set(response.user);
          this.localStorageService.setItem(StorageKey.User, response.user);
        }),
      );
  }

  updateCurrentUser(user: AuthUser): void {
    this.currentUser.set(user);
    this.localStorageService.setItem(StorageKey.User, user);
  }

  deleteAccount(password: string): Observable<void> {
    return this.http.request<void>('DELETE', `${environment.apiUrl}/auth/account`, {
      body: { password },
    }).pipe(
      tap(() => {
        this.tokenStorage.clearToken();
        this.localStorageService.removeItem(StorageKey.User);
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }),
    );
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.localStorageService.removeItem(StorageKey.User);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.getToken() !== null;
  }
}
