import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GoogleIdentityService } from '../../../core/services/google-identity.service';

import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let googleIdentityStub: jasmine.SpyObj<GoogleIdentityService>;

  beforeEach(async () => {
    googleIdentityStub = jasmine.createSpyObj<GoogleIdentityService>(
      'GoogleIdentityService',
      ['load', 'initialize', 'release', 'renderButton', 'disableAutoSelect'],
      { isConfigured: true },
    );
    googleIdentityStub.initialize.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: GoogleIdentityService, useValue: googleIdentityStub },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers Google sign-up below the form', async () => {
    await fixture.whenStable();

    expect(googleIdentityStub.initialize).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('app-google-sign-in')).not.toBeNull();
  });
});
