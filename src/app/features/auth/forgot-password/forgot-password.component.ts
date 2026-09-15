import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { disabled, email, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { LanguageService } from '../../../core/i18n/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule, FormField, TranslatePipe],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly snackbarService = inject(SnackbarService);

  readonly isLoading = signal(false);
  readonly emailSent = signal(false);
  readonly recoveryModel = signal({ email: '' });
  readonly recoveryForm = form(this.recoveryModel, (recovery) => {
    required(recovery.email, { message: this.languageService.t('validation.emailRequired') });
    email(recovery.email, { message: this.languageService.t('validation.emailInvalid') });
    maxLength(recovery.email, 254, { message: this.languageService.t('validation.emailMax') });
    disabled(recovery.email, () => this.isLoading());
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isLoading() || this.emailSent()) return;

    try {
      await submit(this.recoveryForm, async () => {
        this.isLoading.set(true);
        await firstValueFrom(this.authService.forgotPassword({
          email: this.recoveryModel().email.trim().toLowerCase(),
        }));
        this.emailSent.set(true);
      });
    } catch (error: unknown) {
      const key = error instanceof HttpErrorResponse && error.status === 503
        ? 'auth.recoveryUnavailable'
        : error instanceof HttpErrorResponse && error.status === 429
          ? 'auth.tooManyRequests'
          : 'auth.recoveryFailed';
      this.snackbarService.error(this.languageService.t(key));
    } finally {
      this.isLoading.set(false);
    }
  }
}
