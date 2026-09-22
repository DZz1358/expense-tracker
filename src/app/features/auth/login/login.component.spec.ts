import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { GoogleSignInComponent } from '../google-sign-in/google-sign-in.component';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let googleIdentityStub: jasmine.SpyObj<GoogleIdentityService>;

  beforeEach(async () => {
    googleIdentityStub = jasmine.createSpyObj<GoogleIdentityService>(
      'GoogleIdentityService',
      ['load', 'initialize', 'release', 'renderButton', 'disableAutoSelect'],
      { isConfigured: true },
    );
    googleIdentityStub.initialize.and.resolveTo();

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'loginWithGoogle']);
    authServiceSpy.login.and.returnValue(
      of({
        accessToken: 'token-123',
        user: {
          id: 'user-1',
          email: 'john@example.com',
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: GoogleIdentityService, useValue: googleIdentityStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Google sign-in button below the form', async () => {
    await fixture.whenStable();

    expect(googleIdentityStub.initialize).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('app-google-sign-in')).not.toBeNull();
  });

  it('shares the loading state with the Google button in both directions', async () => {
    await fixture.whenStable();
    const googleSignIn = fixture.debugElement.query(By.directive(GoogleSignInComponent))
      .componentInstance as GoogleSignInComponent;

    component.isLoading.set(true);
    fixture.detectChanges();
    expect(googleSignIn.busy()).toBeTrue();

    googleSignIn.busy.set(false);
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  });

  it('marks fields as touched when the form is submitted while invalid', async () => {
    await component.onSubmit(new SubmitEvent('submit'));

    expect(component.loginForm().touched()).toBeTrue();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });
});
