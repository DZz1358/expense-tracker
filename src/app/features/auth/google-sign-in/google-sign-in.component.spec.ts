import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { of, throwError } from 'rxjs';

import { LanguageService } from '../../../core/i18n/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleButtonOptions, GoogleIdentityService } from '../../../core/services/google-identity.service';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';

import { GoogleSignInComponent } from './google-sign-in.component';

const createGoogleIdentityStub = () =>
  jasmine.createSpyObj<GoogleIdentityService>(
    'GoogleIdentityService',
    ['load', 'initialize', 'release', 'renderButton', 'disableAutoSelect'],
    { isConfigured: true },
  );

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

describe('GoogleSignInComponent', () => {
  let fixture: ComponentFixture<GoogleSignInComponent>;
  let component: GoogleSignInComponent;
  let googleIdentity: jasmine.SpyObj<GoogleIdentityService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let router: Router;
  let onCredential: ((credential: string) => void) | undefined;

  const authResponse = {
    accessToken: 'token-123',
    user: { id: 'user-1', email: 'john@example.com' },
  };

  const settle = async () => {
    await fixture.whenStable();
    await flushMicrotasks();
    fixture.detectChanges();
  };

  const lastRenderOptions = (): GoogleButtonOptions =>
    googleIdentity.renderButton.calls.mostRecent().args[1];

  const visibleLabel = () =>
    (fixture.nativeElement.querySelector('.google-sign-in__button') as HTMLElement).textContent?.trim();

  beforeEach(async () => {
    localStorage.clear();
    onCredential = undefined;

    googleIdentity = createGoogleIdentityStub();
    googleIdentity.initialize.and.callFake(async (callback) => {
      onCredential = callback;
    });

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['loginWithGoogle']);
    authService.loginWithGoogle.and.returnValue(of(authResponse));
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [GoogleSignInComponent],
      providers: [
        provideRouter([]),
        { provide: GoogleIdentityService, useValue: googleIdentity },
        { provide: AuthService, useValue: authService },
        { provide: SnackbarService, useValue: snackbar },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(GoogleSignInComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '300px';
    fixture.detectChanges();
    await settle();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders Google's button through the official SDK into the hidden overlay once ready", () => {
    expect(googleIdentity.initialize).toHaveBeenCalledTimes(1);
    expect(component.status()).toBe('ready');

    const overlay = fixture.nativeElement.querySelector('.google-sign-in__native') as HTMLElement;
    expect(googleIdentity.renderButton).toHaveBeenCalledWith(overlay, jasmine.objectContaining({
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      locale: 'en',
    }));
    expect(lastRenderOptions().width).toBe(300);
  });

  it('clamps the Google button width to the 200-400px range Google supports', async () => {
    const container = fixture.nativeElement as HTMLElement;

    container.style.width = '1000px';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
    expect(lastRenderOptions().width).toBe(400);

    container.style.width = '120px';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
    expect(lastRenderOptions().width).toBe(200);
  });

  it('shows the app-translated label on the visible button and disables it until ready', async () => {
    const languageService = TestBed.inject(LanguageService);
    const button = fixture.nativeElement.querySelector('.google-sign-in__button') as HTMLButtonElement;

    expect(visibleLabel()).toBe(languageService.t('auth.continueWithGoogle'));
    expect(button.disabled).toBeFalse();

    fixture.componentRef.setInput('text', 'signup_with');
    await settle();
    expect(visibleLabel()).toBe(languageService.t('auth.signUpWithGoogle'));

    fixture.componentRef.setInput('text', 'signin_with');
    await settle();
    expect(visibleLabel()).toBe(languageService.t('auth.signInWithGoogle'));
  });

  it("re-renders Google's button and translates the label when the language changes", async () => {
    const languageService = TestBed.inject(LanguageService);
    const renders = googleIdentity.renderButton.calls.count();

    languageService.setLanguage('uk');
    await settle();

    expect(googleIdentity.renderButton.calls.count()).toBeGreaterThan(renders);
    expect(lastRenderOptions().locale).toBe('uk');
    expect(visibleLabel()).toBe('Продовжити з Google');
  });

  it('exchanges the Google credential for an app session and navigates home', async () => {
    const busyStates: boolean[] = [];
    component.busy.subscribe((busy) => busyStates.push(busy));

    onCredential!('id-token');
    fixture.detectChanges();
    expect(visibleLabel()).toBe(TestBed.inject(LanguageService).t('auth.signingInWithGoogle'));
    expect((fixture.nativeElement.querySelector('.google-sign-in') as HTMLElement).hasAttribute('inert')).toBeTrue();
    await settle();
    expect((fixture.nativeElement.querySelector('.google-sign-in') as HTMLElement).hasAttribute('inert')).toBeFalse();

    expect(authService.loginWithGoogle).toHaveBeenCalledOnceWith('id-token');
    expect(snackbar.success).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/expenses']);
    expect(busyStates).toEqual([true, false]);
    expect(component.busy()).toBeFalse();
  });

  it('releases its credential handler when destroyed', () => {
    fixture.destroy();

    expect(googleIdentity.release).toHaveBeenCalledOnceWith(onCredential!);
  });

  it('ignores credentials while another sign-in is running', async () => {
    component.busy.set(true);

    onCredential!('id-token');
    await settle();

    expect(authService.loginWithGoogle).not.toHaveBeenCalled();
  });

  it('shows the backend-specific message for a linked local account (409)', async () => {
    authService.loginWithGoogle.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    );
    const expected = TestBed.inject(LanguageService).t('auth.googleEmailAlreadyRegistered');

    onCredential!('id-token');
    await settle();

    expect(snackbar.error).toHaveBeenCalledOnceWith(expected);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.busy()).toBeFalse();
  });

  it('maps the remaining backend statuses to their messages', async () => {
    const languageService = TestBed.inject(LanguageService);
    const cases: [number, string][] = [
      [400, 'auth.googleInvalidCredential'],
      [401, 'auth.googleTokenExpired'],
      [503, 'auth.googleNotConfigured'],
      [500, 'auth.googleSignInFailed'],
    ];

    for (const [status, key] of cases) {
      snackbar.error.calls.reset();
      authService.loginWithGoogle.and.returnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );

      onCredential!('id-token');
      await settle();

      expect(snackbar.error).toHaveBeenCalledOnceWith(languageService.t(key));
    }
  });
});

describe('GoogleSignInComponent when the SDK cannot be loaded', () => {
  it('falls back to a hint instead of the button', async () => {
    const googleIdentity = createGoogleIdentityStub();
    googleIdentity.initialize.and.rejectWith(new Error('blocked'));

    await TestBed.configureTestingModule({
      imports: [GoogleSignInComponent],
      providers: [
        provideRouter([]),
        { provide: GoogleIdentityService, useValue: googleIdentity },
        { provide: AuthService, useValue: jasmine.createSpyObj<AuthService>('AuthService', ['loginWithGoogle']) },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(GoogleSignInComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('unavailable');
    expect(googleIdentity.renderButton).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.google-sign-in__button')).toBeNull();
    const hint = fixture.nativeElement.querySelector('.google-sign-in__hint') as HTMLElement;
    expect(hint.textContent).toContain(TestBed.inject(LanguageService).t('auth.googleSignInUnavailable'));
  });
});
