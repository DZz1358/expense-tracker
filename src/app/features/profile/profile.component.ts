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

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';

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
    TranslatePipe,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
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

  readonly isUploadingAvatar = signal(false);
  readonly avatarPreview = signal<string | null>(null);
  readonly avatarError = signal<string | null>(null);

  readonly avatarSrc = computed(() => {
    const preview = this.avatarPreview();
    if (preview) return preview;
    const avatarUrl = this.currentUser()?.avatarUrl;
    if (!avatarUrl) return '/cat.jpg';
    return avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')
      ? avatarUrl
      : `${environment.apiUrl}${avatarUrl}`;
  });

  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly MAX_SIZE = 5 * 1024 * 1024;

  // Datepicker uses Date object, stored separately from the signals form
  readonly datePickerValue = signal<Date | null>(null);

  profileModel = signal<ProfileFormData>({ name: '' });

  profileForm = form(this.profileModel, (p) => {
    required(p.name, { message: this.languageService.t('validation.nameRequired') });
    minLength(p.name, 2, { message: this.languageService.t('validation.nameMin') });
    disabled(p.name, () => this.isSavingProfile());
  });

  passwordModel = signal<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  passwordForm = form(this.passwordModel, (p) => {
    required(p.currentPassword, { message: this.languageService.t('validation.currentPasswordRequired') });
    required(p.newPassword, { message: this.languageService.t('validation.newPasswordRequired') });
    minLength(p.newPassword, 8, { message: this.languageService.t('validation.passwordMin') });
    required(p.confirmNewPassword, { message: this.languageService.t('validation.confirmPasswordRequired') });
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.avatarError.set(this.languageService.t('profile.avatarTypeError'));
      return;
    }
    if (file.size > this.MAX_SIZE) {
      this.avatarError.set(this.languageService.t('profile.avatarSizeError'));
      return;
    }

    this.avatarError.set(null);

    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);

    this.isUploadingAvatar.set(true);
    this.userService
      .updateAvatar(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.avatarPreview.set(null);
          this.isUploadingAvatar.set(false);
        },
        error: (err: any) => {
          this.avatarPreview.set(null);
          this.isUploadingAvatar.set(false);
          this.avatarError.set(err?.error?.message ?? this.languageService.t('profile.avatarUploadFailed'));
        },
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
      this.profileError.set(err?.error?.message ?? this.languageService.t('profile.updateFailed'));
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
      this.passwordError.set(err?.error?.message ?? this.languageService.t('profile.passwordUpdateFailed'));
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
          title: this.languageService.t('profile.deleteAccountTitle'),
          message: this.languageService.t('profile.deleteAccountMessage'),
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
