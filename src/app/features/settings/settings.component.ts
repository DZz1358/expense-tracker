import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Observable, forkJoin, map } from 'rxjs';

import {
  AppLanguage,
  AppSettings,
  AppSettingsService,
  CurrencyCode,
  ExpenseCategoryOption,
  ExpenseDateFormat,
} from '../../core/services/app-settings.service';
import { UnsavedChangesComponent } from '../../core/guards/unsaved-changes.guard';
import { IExpense } from '../../models/expense.interface';
import { UserService } from '../../core/services/user.service';
import {
  ConfirmationModalComponent,
  ConfirmationModalData,
  ConfirmationModalResult,
} from '../../shared/confirmation-modal/confirmation-modal.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';
import { ExpenseTableService } from '../expense-table/expense-table.service';
import {
  CustomCategoryModalComponent,
  CustomCategoryModalData,
} from './custom-category-modal/custom-category-modal.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';

type SelectOption<TValue extends string> = { value: TValue; label: string };
type CustomCategoryChanges = Omit<ExpenseCategoryOption, 'id' | 'custom'>;

const DIALOG_WIDTH = 'calc(100% - 30px)';
const DEFAULT_DIALOG_MAX_WIDTH = '520px';
const CLEAR_DIALOG_MAX_WIDTH = '600px';
const DATE_FORMAT_PREVIEW_DATE = '2026-12-31T12:00:00';

const CURRENCY_OPTIONS: Array<SelectOption<CurrencyCode>> = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'NOK', label: 'Norwegian Krone (NOK)' },
  { value: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
];

const DATE_FORMAT_VALUES: readonly ExpenseDateFormat[] = [
  'dd.MM.yyyy',
  'MMM d, y',
  'yyyy-MM-dd',
];

const LANGUAGE_OPTIONS: Array<SelectOption<AppLanguage>> = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Українська' },
];

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements UnsavedChangesComponent {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly userService = inject(UserService);
  private readonly themeService = inject(ThemeService);
  private readonly expenseTableService = inject(ExpenseTableService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly languageService = inject(LanguageService);
  private readonly snackbarService = inject(SnackbarService);

  readonly settings = this.appSettingsService.settings;
  readonly categories = this.appSettingsService.categories;
  readonly activeTheme = this.themeService.activeTheme;
  readonly Theme = Theme;

  readonly isWorking = signal(false);
  readonly isSavingSettings = signal(false);
  readonly hasUnsavedChanges = signal(false);

  readonly currencyOptions = CURRENCY_OPTIONS;

  readonly dateFormatOptions = computed<Array<SelectOption<ExpenseDateFormat>>>(() => DATE_FORMAT_VALUES.map((value) => ({
    value,
    label: formatDate(DATE_FORMAT_PREVIEW_DATE, value, this.languageService.dateLocale()),
  })));

  readonly languageOptions = LANGUAGE_OPTIONS;

  constructor() {
    this.userService.getMe()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (user) => {
          this.syncThemeFromSettings(user.settings);
          this.hasUnsavedChanges.set(false);
        },
        error: () => {
          this.showError(this.languageService.t('settings.loadFailed'));
        },
      });
  }

  updateSetting<TKey extends keyof AppSettings>(key: TKey, value: AppSettings[TKey]): void {
    this.appSettingsService.updateSetting(key, value);
    this.markUnsaved();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.markUnsaved();
  }

  resetSettings(): void {
    this.appSettingsService.reset();
    this.markUnsaved();
    this.setStatus(this.languageService.t('settings.resetDone'));
  }

  saveSettings(): void {
    if (this.isSavingSettings()) return;

    this.isSavingSettings.set(true);

    this.userService.updateUserSettings(
      this.appSettingsService.toUserSettingsRequest({ theme: this.activeTheme() }),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.syncThemeFromSettings(user.settings);
          this.hasUnsavedChanges.set(false);
          this.isSavingSettings.set(false);
          this.setStatus(this.languageService.t('settings.saved'));
        },
        error: (err: any) => {
          this.isSavingSettings.set(false);
          this.showError(err?.error?.message ?? this.languageService.t('settings.saveFailed'));
        },
      });
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (this.isSavingSettings()) {
      return false;
    }

    if (!this.hasUnsavedChanges()) {
      return true;
    }

    return this.openConfirmationDialog({
      title: this.languageService.t('settings.unsavedTitle'),
      message: this.languageService.t('settings.unsavedMessage'),
      confirmButtonLabel: this.languageService.t('settings.discardChanges'),
    })
      .pipe(map((result) => this.isConfirmed(result)));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges() && !this.isSavingSettings()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  openAddCustomCategoryModal(): void {
    this.openCustomCategoryDialog({ mode: 'create' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.addCustomCategory(result));
  }

  removeCustomCategory(categoryId: string): void {
    this.appSettingsService.removeCustomCategory(categoryId);
    this.markUnsaved();
    this.setStatus(this.languageService.t('settings.categoryRemoved'));
  }

  editCustomCategory(categoryId: string): void {
    const category = this.settings().customCategories.find((item) => item.id === categoryId);
    if (!category) return;

    this.openCustomCategoryDialog({ mode: 'edit', category })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.updateCustomCategory(category.id, result));
  }

  openClearExpensesModal(): void {
    this.startWork();
    this.expenseTableService.getAllExpenses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (expenses: IExpense[]) => {
          this.finishWork(null);
          this.confirmClearExpenses(expenses);
        },
        error: () => this.finishWork(null, this.languageService.t('settings.loadFailed')),
      });
  }

  private openConfirmationDialog(
    data: ConfirmationModalData,
    maxWidth = DEFAULT_DIALOG_MAX_WIDTH,
  ): Observable<ConfirmationModalResult | false | undefined> {
    return this.dialog.open<ConfirmationModalComponent, ConfirmationModalData, ConfirmationModalResult | false>(
      ConfirmationModalComponent,
      {
        width: DIALOG_WIDTH,
        maxWidth,
        data,
      },
    ).afterClosed();
  }

  private openCustomCategoryDialog(
    data: CustomCategoryModalData,
  ): Observable<CustomCategoryChanges | null | undefined> {
    return this.dialog.open<CustomCategoryModalComponent, CustomCategoryModalData, CustomCategoryChanges | null>(
      CustomCategoryModalComponent,
      {
        width: DIALOG_WIDTH,
        maxWidth: DEFAULT_DIALOG_MAX_WIDTH,
        data,
      },
    ).afterClosed();
  }

  private addCustomCategory(category: CustomCategoryChanges | null | undefined): void {
    if (!category) return;

    this.appSettingsService.addCustomCategory(category);
    this.markUnsaved();
    this.setStatus(this.languageService.t('settings.categoryAdded'));
  }

  private updateCustomCategory(
    categoryId: string,
    category: CustomCategoryChanges | null | undefined,
  ): void {
    if (!category) return;

    this.appSettingsService.updateCustomCategory(categoryId, category);
    this.markUnsaved();
    this.setStatus(this.languageService.t('settings.categoryUpdated'));
  }

  private confirmClearExpenses(expenses: IExpense[]): void {
    if (!expenses.length) {
      this.setStatus(this.languageService.t('settings.noExpensesToClear'));
      return;
    }

    this.openConfirmationDialog(
      {
        title: this.languageService.t('settings.clearTitle'),
        message: this.languageService.t('settings.clearMessageWithCount', {
          count: expenses.length,
        }),
        confirmationText: 'DELETE',
        confirmButtonLabel: this.languageService.t('common.delete'),
      },
      CLEAR_DIALOG_MAX_WIDTH,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!this.isConfirmed(result)) return;
        this.clearExpenses(expenses);
      });
  }

  private clearExpenses(expenses: IExpense[]): void {
    this.startWork();
    forkJoin(expenses.map((expense) => this.expenseTableService.deleteExpense(expense.id)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishWork(this.languageService.t('settings.allCleared')),
        error: () => this.finishWork(null, this.languageService.t('settings.clearFailed')),
      });
  }

  private startWork(): void {
    this.isWorking.set(true);
  }

  private finishWork(status: string | null, error?: string): void {
    this.isWorking.set(false);

    if (error) {
      this.showError(error);
      return;
    }

    if (status) {
      this.setStatus(status);
    }
  }

  private setStatus(message: string): void {
    this.snackbarService.success(message);
  }

  private showError(message: string): void {
    this.snackbarService.error(message);
  }

  private isConfirmed(result: ConfirmationModalResult | false | undefined): boolean {
    return Boolean(result && result.confirmed);
  }

  private markUnsaved(): void {
    this.hasUnsavedChanges.set(true);
  }

  private syncThemeFromSettings(settings: Record<string, unknown> | undefined): void {
    const theme = settings?.['theme'];
    if (theme === Theme.Dark || theme === Theme.Light) {
      this.themeService.setTheme(theme);
    }
  }
}
