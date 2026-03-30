import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';
import { authInterceptor, SKIP_AUTH } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let tokenStorage: AuthTokenStorageService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(AuthTokenStorageService);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('adds a bearer token to API requests', () => {
    tokenStorage.setToken('token-123');

    http.get(`${environment.apiUrl}/expenses`).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/expenses`,
    );

    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer token-123',
    );

    request.flush([]);
  });

  it('does not add a token when the request is marked to skip auth', () => {
    tokenStorage.setToken('token-123');

    http
      .post(
        `${environment.apiUrl}/auth/login`,
        {},
        {
          context: new HttpContext().set(SKIP_AUTH, true),
        },
      )
      .subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/auth/login`,
    );

    expect(request.request.headers.has('Authorization')).toBeFalse();

    request.flush({});
  });

  it('does not add a token to non-api requests', () => {
    tokenStorage.setToken('token-123');

    http.get('/assets/config.json').subscribe();

    const request = httpTestingController.expectOne('/assets/config.json');

    expect(request.request.headers.has('Authorization')).toBeFalse();

    request.flush({});
  });

  it('keeps an existing authorization header unchanged', () => {
    tokenStorage.setToken('token-123');

    http
      .get(`${environment.apiUrl}/expenses`, {
        headers: {
          Authorization: 'Custom token',
        },
      })
      .subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/expenses`,
    );

    expect(request.request.headers.get('Authorization')).toBe('Custom token');

    request.flush([]);
  });
});
