import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { disabled, email, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterLink, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule, FormField, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  registerModel = signal<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  registerForm = form(this.registerModel, (reg) => {
    required(reg.name, { message: this.languageService.t('validation.nameRequired') });
    minLength(reg.name, 2, { message: this.languageService.t('validation.nameMin') });
    required(reg.email, { message: this.languageService.t('validation.emailRequired') });
    email(reg.email, { message: this.languageService.t('validation.emailInvalid') });
    required(reg.password, { message: this.languageService.t('validation.passwordRequired') });
    minLength(reg.password, 8, { message: this.languageService.t('validation.passwordMin') });
    required(reg.confirmPassword, { message: this.languageService.t('validation.confirmPasswordRequired') });
    validate(reg.confirmPassword, ({ value, valueOf }) => {
      const confirmPassword = value();
      return confirmPassword && confirmPassword !== valueOf(reg.password)
        ? { kind: 'passwordMismatch', message: this.languageService.t('validation.passwordMismatch') }
        : null;
    });

    disabled(reg.name, () => this.isLoading());
    disabled(reg.email, () => this.isLoading());
    disabled(reg.password, () => this.isLoading());
    disabled(reg.confirmPassword, () => this.isLoading());
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await submit(this.registerForm, async () => {
        const { name, email, password } = this.registerModel();
        await firstValueFrom(
          this.authService.register({ name, email, password })
        );
        this.router.navigate(['/expenses']);
      });
    } catch (err: any) {
      this.errorMessage.set(err.error?.message ?? this.languageService.t('auth.registrationFailed'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
