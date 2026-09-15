import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { disabled, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { LanguageService } from '../../../core/i18n/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule, FormField, TranslatePipe],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly languageService = inject(LanguageService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly queryParams = toSignal(this.route.queryParamMap);
  private readonly token = computed(() => this.queryParams()?.get('token') ?? '');
  private readonly rejectedToken = signal<string | null>(null);

  readonly invalidLink = computed(() => !/^[a-f0-9]{64}$/.test(this.token()) || this.rejectedToken() === this.token());
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly resetModel = signal({ newPassword: '', confirmPassword: '' });
  readonly resetForm = form(this.resetModel, (reset) => {
    required(reset.newPassword, { message: this.languageService.t('validation.newPasswordRequired') });
    minLength(reset.newPassword, 8, { message: this.languageService.t('validation.passwordMin') });
    validate(reset.newPassword, ({ value }) => new TextEncoder().encode(value()).length > 72
      ? { kind: 'passwordMax', message: this.languageService.t('validation.passwordMax') }
      : null);
    required(reset.confirmPassword, { message: this.languageService.t('validation.confirmPasswordRequired') });
    validate(reset.confirmPassword, ({ value, valueOf }) => value() && value() !== valueOf(reset.newPassword)
      ? { kind: 'passwordMismatch', message: this.languageService.t('validation.passwordMismatch') }
      : null);
    disabled(reset.newPassword, () => this.isLoading());
    disabled(reset.confirmPassword, () => this.isLoading());
  });

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isLoading() || this.invalidLink()) return;

    const token = this.token();
    try {
      await submit(this.resetForm, async () => {
        this.isLoading.set(true);
        await firstValueFrom(this.authService.resetPassword({
          token,
          newPassword: this.resetModel().newPassword,
        }));
        this.snackbarService.success(this.languageService.t('auth.passwordResetSuccess'));
        this.authService.logout();
      });
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        this.rejectedToken.set(token);
      } else {
        const key = error instanceof HttpErrorResponse && error.status === 429
          ? 'auth.tooManyRequests'
          : 'auth.passwordResetFailed';
        this.snackbarService.error(this.languageService.t(key));
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
