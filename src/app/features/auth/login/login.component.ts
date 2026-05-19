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

interface LoginData {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule, FormField],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  loginModel = signal<LoginData>({
    email: '',
    password: ''
  })

  loginForm = form(this.loginModel, (login) => {
    required(login.email, { message: 'Email is required' });
    email(login.email, { message: 'Enter a valid email address' });
    required(login.password, { message: 'Password is required' });
    minLength(login.password, 8, { message: 'Password must be at least 8 characters' });

    disabled(login.email, () => this.isLoading());
    disabled(login.password, () => this.isLoading());
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await submit(this.loginForm, async () => {
        const credentials = this.loginModel();
        await firstValueFrom(
          this.authService.login({ email: credentials.email, password: credentials.password })
        );
        this.router.navigate(['/expenses']);
      });
    } catch (err: any) {
      this.errorMessage.set(err.error?.message ?? 'Login failed');
    } finally {
      this.isLoading.set(false);
    }
  }
}
