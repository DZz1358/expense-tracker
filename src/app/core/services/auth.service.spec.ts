import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { authInterceptor, SKIP_AUTH } from '../interceptors/auth.interceptor';
import { LoginResponse } from '../models/auth.models';
import { AuthService } from './auth.service';
import { AuthTokenStorageService } from './auth-token-storage.service';
import { UserService } from './user.service';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokenStorage: AuthTokenStorageService;
  let httpTestingController: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
    tokenStorage = TestBed.inject(AuthTokenStorageService);
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('stores the access token after a successful login', () => {
    const payload = {
      email: 'john@example.com',
      password: 'secret123',
    };
    const response: LoginResponse = {
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John',
        settings: { theme: Theme.Dark },
      },
    };

    service.login(payload).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/auth/login`,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.headers.has('Authorization')).toBeFalse();

    request.flush(response);

    expect(tokenStorage.getToken()).toBe('token-123');
    expect(service.isAuthenticated()).toBeTrue();
    TestBed.tick();
    expect(TestBed.inject(ThemeService).activeTheme()).toBe(Theme.Dark);
    expect(document.body.classList.contains(Theme.Dark)).toBeTrue();
  });

  it('applies the refreshed account theme without opening settings', () => {
    TestBed.inject(ThemeService).setTheme(Theme.Dark);
    tokenStorage.setToken('token-123');
    TestBed.inject(UserService).getMe().subscribe();
    const request = httpTestingController.expectOne(`${environment.apiUrl}/users/me`);
    request.flush({ id: 'user-1', email: 'john@example.com', settings: { theme: Theme.Light } });
    TestBed.tick();

    expect(TestBed.inject(ThemeService).activeTheme()).toBe(Theme.Light);
    expect(document.body.classList.contains(Theme.Dark)).toBeFalse();
  });

  it('requests a reset email without sending a stored access token or changing the session', () => {
    tokenStorage.setToken('old-token');
    const payload = { email: 'john@example.com' };
    const response = { success: true, message: 'sent' };
    service.forgotPassword(payload).subscribe((result) => expect(result).toEqual(response));

    const request = httpTestingController.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(SKIP_AUTH)).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush(response);
    expect(tokenStorage.getToken()).toBe('old-token');
  });

  it('submits a reset token without bearer authentication and preserves the session on failure', () => {
    tokenStorage.setToken('old-token');
    const payload = { token: 'a'.repeat(64), newPassword: 'password123' };
    service.resetPassword(payload).subscribe({
      next: () => fail('Expected an invalid-link error'),
      error: (error) => expect(error.status).toBe(400),
    });

    const request = httpTestingController.expectOne(`${environment.apiUrl}/auth/reset-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(SKIP_AUTH)).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ message: 'Invalid link' }, { status: 400, statusText: 'Bad Request' });
    expect(tokenStorage.getToken()).toBe('old-token');
  });

  it('removes the token on logout', () => {
    spyOn(router, 'navigate').and.resolveTo(true);
    localStorage.setItem('access_token', 'token-123');

    service.logout();

    expect(tokenStorage.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
