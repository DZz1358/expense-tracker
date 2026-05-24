import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { disabled, email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';

interface LoginData {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule, FormField, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly snackbarService = inject(SnackbarService);

  readonly isLoading = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);

  loginModel = signal<LoginData>({
    email: '',
    password: ''
  })

  loginForm = form(this.loginModel, (login) => {
    required(login.email, { message: this.languageService.t('validation.emailRequired') });
    email(login.email, { message: this.languageService.t('validation.emailInvalid') });
    required(login.password, { message: this.languageService.t('validation.passwordRequired') });
    minLength(login.password, 8, { message: this.languageService.t('validation.passwordMin') });

    disabled(login.email, () => this.isLoading());
    disabled(login.password, () => this.isLoading());
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    this.isLoading.set(true);
    try {
      await submit(this.loginForm, async () => {
        const credentials = this.loginModel();
        await firstValueFrom(
          this.authService.login({ email: credentials.email, password: credentials.password })
        );
        this.snackbarService.success(this.languageService.t('auth.loginSuccess'));
        this.router.navigate(['/expenses']);
      });
    } catch (err: any) {
      this.snackbarService.error(err.error?.message ?? this.languageService.t('auth.loginFailed'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
