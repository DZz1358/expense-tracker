import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleButtonOptions, GoogleIdentityService } from '../../../core/services/google-identity.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

export type GoogleButtonText = NonNullable<GoogleButtonOptions['text']>;
export type GoogleSignInStatus = 'loading' | 'ready' | 'unavailable';

// Google only renders the standard button between these widths.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

// Google's button text cannot be translated by the app, so the visible label is ours.
const BUTTON_LABEL_KEYS: Record<GoogleButtonText, string> = {
  signin_with: 'auth.signInWithGoogle',
  signup_with: 'auth.signUpWithGoogle',
  continue_with: 'auth.continueWithGoogle',
  signin: 'auth.signInWithGoogle',
};

const GOOGLE_LOGIN_ERROR_KEYS: Record<number, string> = {
  400: 'auth.googleInvalidCredential',
  401: 'auth.googleTokenExpired',
  409: 'auth.googleEmailAlreadyRegistered',
  503: 'auth.googleNotConfigured',
};

@Component({
  selector: 'app-google-sign-in',
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: './google-sign-in.component.html',
  styleUrl: './google-sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleSignInComponent {
  private readonly authService = inject(AuthService);
  private readonly googleIdentityService = inject(GoogleIdentityService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly snackbarService = inject(SnackbarService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly buttonHost = viewChild<ElementRef<HTMLElement>>('googleButton');

  /** Google's button variant; the register page passes `signup_with`. */
  readonly text = input<GoogleButtonText>('continue_with');
  /** Shared with the parent form so the two sign-in flows cannot overlap. */
  readonly busy = model<boolean>(false);

  readonly status = signal<GoogleSignInStatus>(
    this.googleIdentityService.isConfigured ? 'loading' : 'unavailable',
  );
  readonly labelKey = computed(() => BUTTON_LABEL_KEYS[this.text()]);

  private readonly buttonWidth = signal<number>(MIN_BUTTON_WIDTH);
  private readonly onCredential = (credential: string) => this.signIn(credential);
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.initialize());

    // (Re)render Google's hidden button whenever the language or the available width change.
    afterRenderEffect({
      write: () => {
        const host = this.buttonHost();
        if (this.status() !== 'ready' || !host) return;

        const options: GoogleButtonOptions = {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: this.text(),
          shape: 'rectangular',
          locale: this.languageService.activeLanguage(),
          width: this.buttonWidth(),
        };

        untracked(() => this.render(host.nativeElement, options));
      },
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.googleIdentityService.release(this.onCredential);
    });
  }

  private async initialize(): Promise<void> {
    if (!this.googleIdentityService.isConfigured) return;

    try {
      await this.googleIdentityService.initialize(this.onCredential);
      // The user may have navigated away while the SDK was loading.
      if (this.destroyed) return;
      this.observeWidth();
      this.status.set('ready');
    } catch {
      this.status.set('unavailable');
    }
  }

  private render(host: HTMLElement, options: GoogleButtonOptions): void {
    try {
      this.googleIdentityService.renderButton(host, options);
    } catch {
      this.status.set('unavailable');
    }
  }

  private async signIn(credential: string): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.authService.loginWithGoogle(credential));
      this.snackbarService.success(this.languageService.t('auth.loginSuccess'));
      this.router.navigate(['/expenses']);
    } catch (error: unknown) {
      this.snackbarService.error(this.languageService.t(this.getErrorKey(error)));
    } finally {
      // The page may have been left while the request was in flight.
      if (!this.destroyed) this.busy.set(false);
    }
  }

  private getErrorKey(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    return GOOGLE_LOGIN_ERROR_KEYS[status] ?? 'auth.googleSignInFailed';
  }

  private observeWidth(): void {
    const host = this.elementRef.nativeElement;
    this.buttonWidth.set(this.clampWidth(host.clientWidth));

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      this.buttonWidth.set(this.clampWidth(entry.contentRect.width));
    });
    observer.observe(host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private clampWidth(width: number): number {
    return Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, Math.floor(width)));
  }
}
