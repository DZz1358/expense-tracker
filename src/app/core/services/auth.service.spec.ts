import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { LoginResponse } from '../models/auth.models';
import { AuthService } from './auth.service';
import { AuthTokenStorageService } from './auth-token-storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokenStorage: AuthTokenStorageService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    tokenStorage = TestBed.inject(AuthTokenStorageService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
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
  });

  it('removes the token on logout', () => {
    localStorage.setItem('access_token', 'token-123');

    service.logout();

    expect(tokenStorage.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
