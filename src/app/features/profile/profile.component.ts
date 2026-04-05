import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';

interface ProfileFormData {
  name: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Component({
  selector: 'app-profile',
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    FormField,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly themeService = inject(ThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.authService.currentUser;
  readonly activeTheme = this.themeService.activeTheme;
  readonly Theme = Theme;

  readonly isEditingProfile = signal(false);
  readonly isChangingPassword = signal(false);
  readonly isSavingProfile = signal(false);
  readonly isSavingPassword = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal(false);
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly today = new Date();

  // Datepicker uses Date object, stored separately from the signals form
  readonly datePickerValue = signal<Date | null>(null);

  profileModel = signal<ProfileFormData>({ name: '' });

  profileForm = form(this.profileModel, (p) => {
    required(p.name, { message: 'Name is required' });
    minLength(p.name, 2, { message: 'Name must be at least 2 characters' });
    disabled(p.name, () => this.isSavingProfile());
  });

  passwordModel = signal<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  passwordForm = form(this.passwordModel, (p) => {
    required(p.currentPassword, { message: 'Current password is required' });
    required(p.newPassword, { message: 'New password is required' });
    minLength(p.newPassword, 8, { message: 'At least 8 characters' });
    required(p.confirmNewPassword, { message: 'Please confirm your password' });
    disabled(p.currentPassword, () => this.isSavingPassword());
    disabled(p.newPassword, () => this.isSavingPassword());
    disabled(p.confirmNewPassword, () => this.isSavingPassword());
  });

  readonly passwordMismatch = computed(() => {
    const { newPassword, confirmNewPassword } = this.passwordModel();
    return confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  });

  constructor() {
    this.userService
      .getMe()
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.datePickerValue.set(user.dateOfBirth ? new Date(user.dateOfBirth) : null);
      });
  }

  startEditProfile(): void {
    const user = this.currentUser();
    this.profileModel.set({ name: user?.name ?? '' });
    this.datePickerValue.set(user?.dateOfBirth ? new Date(user.dateOfBirth) : null);
    this.profileError.set(null);
    this.isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.isEditingProfile.set(false);
    this.profileError.set(null);
  }

  async saveProfile(event: Event): Promise<void> {
    event.preventDefault();
    this.isSavingProfile.set(true);
    this.profileError.set(null);
    try {
      await submit(this.profileForm, async () => {
        const { name } = this.profileModel();
        const dob = this.datePickerValue();
        const dateOfBirth = dob
          ? `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`
          : null;
        await firstValueFrom(this.userService.updateProfile({ name, dateOfBirth }));
        this.isEditingProfile.set(false);
      });
    } catch (err: any) {
      this.profileError.set(err?.error?.message ?? 'Failed to update profile');
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  startChangePassword(): void {
    this.passwordModel.set({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
    this.isChangingPassword.set(true);
  }

  cancelChangePassword(): void {
    this.isChangingPassword.set(false);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
  }

  async savePassword(event: Event): Promise<void> {
    event.preventDefault();
    if (this.passwordMismatch()) return;
    this.isSavingPassword.set(true);
    this.passwordError.set(null);
    try {
      await submit(this.passwordForm, async () => {
        const { currentPassword, newPassword } = this.passwordModel();
        await firstValueFrom(this.userService.updatePassword({ currentPassword, newPassword }));
        this.passwordSuccess.set(true);
        this.isChangingPassword.set(false);
      });
    } catch (err: any) {
      this.passwordError.set(err?.error?.message ?? 'Failed to update password');
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }

  openDeleteAccountModal(): void {
    this.dialog
      .open(ConfirmationModalComponent, {
        data: {
          title: 'Delete account?',
          message: 'This action is irreversible. All your data will be permanently deleted.',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result?.confirmed) return;
        this.authService.deleteAccount().subscribe();
      });
  }
}
