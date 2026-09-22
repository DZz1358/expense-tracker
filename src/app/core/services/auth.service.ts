import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, tap } from 'rxjs';

import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import { AuthUser, ForgotPasswordRequest, GoogleLoginRequest, GoogleLoginResponse, LoginRequest, LoginResponse, PasswordRecoveryResponse, RegisterRequest, RegisterResponse, ResetPasswordRequest } from '../models/auth.models';
import { environment } from '../../../environments/environment';

import { AuthTokenStorageService } from './auth-token-storage.service';
import { LocalStorageService } from '../../shared/local-storage/local-storage.service';
import { StorageKey } from '../../shared/local-storage/storage-key.enum';
import { AppSettingsService } from './app-settings.service';
import { GoogleIdentityService } from './google-identity.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(AuthTokenStorageService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly googleIdentityService = inject(GoogleIdentityService);

  readonly currentUser = signal<AuthUser | null>(
    this.localStorageService.getItem<AuthUser>(StorageKey.User)
  );

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(tap((response) => this.storeSession(response)));
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(tap((response) => this.storeSession(response)));
  }

  /**
   * Exchanges a Google ID token for the app session. The Google credential is
   * only sent once here and never stored; protected requests use the returned
   * `accessToken` like after a regular login.
   */
  loginWithGoogle(credential: string): Observable<GoogleLoginResponse> {
    const payload: GoogleLoginRequest = { credential };

    return this.http
      .post<GoogleLoginResponse>(`${environment.apiUrl}/auth/google`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(tap((response) => this.storeSession(response)));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<PasswordRecoveryResponse> {
    return this.http.post<PasswordRecoveryResponse>(
      `${environment.apiUrl}/auth/forgot-password`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      },
    );
  }

  resetPassword(payload: ResetPasswordRequest): Observable<PasswordRecoveryResponse> {
    return this.http.post<PasswordRecoveryResponse>(
      `${environment.apiUrl}/auth/reset-password`, payload, {
        context: new HttpContext().set(SKIP_AUTH, true),
      },
    );
  }

  updateCurrentUser(user: AuthUser): void {
    this.currentUser.set(user);
    this.localStorageService.setItem(StorageKey.User, user);
    this.appSettingsService.syncWithUser(user);
  }

  deleteAccount(password: string): Observable<void> {
    // The deployed route currently ignores this body. Keeping the password in
    // the request makes the client forward-compatible with server-side
    // verification, which must be implemented by the backend.
    return this.http.request<void>('DELETE', `${environment.apiUrl}/users/me`, {
      body: { password },
    }).pipe(tap(() => this.clearSession()));
  }

  logout(): void {
    this.clearSession();
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.getToken() !== null;
  }

  private storeSession(response: LoginResponse): void {
    this.tokenStorage.setToken(response.accessToken);
    this.updateCurrentUser(response.user);
  }

  private clearSession(): void {
    this.tokenStorage.clearToken();
    this.localStorageService.removeItem(StorageKey.User);
    this.currentUser.set(null);
    this.appSettingsService.syncWithUser(null);
    // Only blocks an instant automatic re-sign-in; it does not revoke Google access.
    this.googleIdentityService.disableAutoSelect();
    this.router.navigate(['/login']);
  }
}
