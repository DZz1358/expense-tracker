import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { LanguageService } from '../../../core/i18n/language.service';
import { PasswordRecoveryResponse } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    authService.forgotPassword.and.returnValue(of({ success: true, message: 'sent' }));
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['error']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: SnackbarService, useValue: snackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  for (const email of ['', 'invalid-email']) {
    it(`rejects invalid email ${JSON.stringify(email)} without requesting a link`, async () => {
      component.recoveryModel.set({ email });
      await component.onSubmit(new Event('submit'));

      expect(component.recoveryForm.email().touched()).toBeTrue();
      expect(authService.forgotPassword).not.toHaveBeenCalled();
      expect(component.emailSent()).toBeFalse();
      expect(component.isLoading()).toBeFalse();
    });
  }

  it('sends the email and replaces the form with confirmation and a login link', async () => {
    component.recoveryModel.set({ email: 'John@Example.com' });
    await component.onSubmit(new Event('submit'));
    fixture.detectChanges();

    expect(authService.forgotPassword).toHaveBeenCalledOnceWith({ email: 'john@example.com' });
    expect(component.emailSent()).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('disables the form and prevents duplicate requests while sending', async () => {
    const response = new Subject<PasswordRecoveryResponse>();
    authService.forgotPassword.and.returnValue(response);
    component.recoveryModel.set({ email: 'john@example.com' });
    const pending = component.onSubmit(new Event('submit'));
    fixture.detectChanges();

    expect(component.isLoading()).toBeTrue();
    expect(fixture.nativeElement.querySelector('input').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    expect(component.emailSent()).toBeFalse();
    await component.onSubmit(new Event('submit'));
    expect(authService.forgotPassword).toHaveBeenCalledTimes(1);

    response.next({ success: true, message: 'sent' });
    response.complete();
    await pending;
    expect(component.isLoading()).toBeFalse();
    expect(component.emailSent()).toBeTrue();
  });

  for (const [status, key] of [[503, 'auth.recoveryUnavailable'], [429, 'auth.tooManyRequests'], [0, 'auth.recoveryFailed']] as const) {
    it(`shows a translated error for status ${status} and allows retrying`, async () => {
      authService.forgotPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.recoveryModel.set({ email: 'john@example.com' });
      await component.onSubmit(new Event('submit'));

      expect(snackbar.error).toHaveBeenCalledWith(TestBed.inject(LanguageService).t(key));
      expect(component.emailSent()).toBeFalse();
      expect(component.isLoading()).toBeFalse();
      expect(component.recoveryForm.email().disabled()).toBeFalse();

      authService.forgotPassword.and.returnValue(of({ success: true, message: 'sent' }));
      await component.onSubmit(new Event('submit'));
      expect(component.emailSent()).toBeTrue();
    });
  }
});
