import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { of, Subject, throwError } from 'rxjs';

import { routes } from '../../../app.routes';
import { LanguageService } from '../../../core/i18n/language.service';
import { PasswordRecoveryResponse } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  const token = 'a'.repeat(64);
  let harness: RouterTestingHarness;
  let component: ResetPasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword', 'resetPassword', 'logout', 'isAuthenticated']);
    authService.resetPassword.and.returnValue(of({ success: true, message: 'reset' }));
    authService.isAuthenticated.and.returnValue(true);
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['error', 'success']);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authService },
        { provide: SnackbarService, useValue: snackbar },
      ],
    }).compileComponents();

    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl(`/reset-password?token=${token}`, ResetPasswordComponent);
  });

  it('opens the reset form even when an old access token is stored', () => {
    expect(component.invalidLink()).toBeFalse();
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
  });

  it('allows requesting another link even when an old access token is stored', async () => {
    const recovery = await harness.navigateByUrl('/forgot-password', ForgotPasswordComponent);

    expect(recovery.emailSent()).toBeFalse();
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
  });

  for (const query of ['', '?token=invalid']) {
    it(`offers a new link instead of a form for ${query || 'a missing token'}`, async () => {
      component = await harness.navigateByUrl(`/reset-password${query}`, ResetPasswordComponent);
      await component.onSubmit(new Event('submit'));

      expect(component.invalidLink()).toBeTrue();
      expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
      expect(harness.routeNativeElement?.querySelector('a[href="/forgot-password"]')).not.toBeNull();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  }

  for (const [newPassword, confirmPassword] of [
    ['', ''],
    ['short', 'short'],
    ['password123', 'different123'],
    ['я'.repeat(37), 'я'.repeat(37)],
  ]) {
    it(`rejects invalid password input of length ${newPassword.length}`, async () => {
      component.resetModel.set({ newPassword, confirmPassword });
      await component.onSubmit(new Event('submit'));

      expect(component.resetForm().invalid()).toBeTrue();
      expect(component.resetForm().touched()).toBeTrue();
      expect(authService.resetPassword).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
    });
  }

  it('submits the URL token and password, then clears the old session and returns to login', async () => {
    component.resetModel.set({ newPassword: 'password123', confirmPassword: 'password123' });
    await component.onSubmit(new Event('submit'));

    expect(authService.resetPassword).toHaveBeenCalledOnceWith({ token, newPassword: 'password123' });
    expect(snackbar.success).toHaveBeenCalledWith(TestBed.inject(LanguageService).t('auth.passwordResetSuccess'));
    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('blocks duplicate submissions until the password reset completes', async () => {
    const response = new Subject<PasswordRecoveryResponse>();
    authService.resetPassword.and.returnValue(response);
    component.resetModel.set({ newPassword: 'password123', confirmPassword: 'password123' });
    const pending = component.onSubmit(new Event('submit'));
    harness.detectChanges();

    expect(component.isLoading()).toBeTrue();
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('input')?.disabled).toBeTrue();
    await component.onSubmit(new Event('submit'));
    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    expect(authService.logout).not.toHaveBeenCalled();

    response.next({ success: true, message: 'reset' });
    response.complete();
    await pending;
    expect(component.isLoading()).toBeFalse();
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('replaces expired or consumed links with a new-link action', async () => {
    authService.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.resetModel.set({ newPassword: 'password123', confirmPassword: 'password123' });
    await component.onSubmit(new Event('submit'));
    harness.detectChanges();

    expect(component.invalidLink()).toBeTrue();
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).not.toBeNull();
    expect(authService.logout).not.toHaveBeenCalled();
    await component.onSubmit(new Event('submit'));
    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
  });

  for (const [status, key] of [[429, 'auth.tooManyRequests'], [0, 'auth.passwordResetFailed']] as const) {
    it(`keeps the reset form available after status ${status}`, async () => {
      authService.resetPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.resetModel.set({ newPassword: 'password123', confirmPassword: 'password123' });
      await component.onSubmit(new Event('submit'));

      expect(snackbar.error).toHaveBeenCalledWith(TestBed.inject(LanguageService).t(key));
      expect(component.invalidLink()).toBeFalse();
      expect(component.isLoading()).toBeFalse();
      expect(authService.logout).not.toHaveBeenCalled();
    });
  }
});
