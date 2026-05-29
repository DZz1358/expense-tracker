import { formatDate } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Observable, finalize, forkJoin } from 'rxjs';

import {
  AppLanguage,
  AppSettings,
  AppSettingsService,
  CurrencyCode,
  ExpenseCategoryOption,
  ExpenseDateFormat,
} from '../../core/services/app-settings.service';
import { LanguageService } from '../../core/i18n/language.service';
import { UserService } from '../../core/services/user.service';
import { IExpense } from '../../models/expense.interface';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';
import { ExpenseTableService } from '../expense-table/expense-table.service';

type SelectOption<TValue extends string> = { value: TValue; label: string };
export type CustomCategoryChanges = Omit<ExpenseCategoryOption, 'id' | 'custom'>;

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

@Injectable()
export class SettingsFacade {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly userService = inject(UserService);
  private readonly themeService = inject(ThemeService);
  private readonly expenseTableService = inject(ExpenseTableService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly languageService = inject(LanguageService);
  private readonly snackbarService = inject(SnackbarService);

  readonly settings = this.appSettingsService.settings;
  readonly activeTheme = this.themeService.activeTheme;

  readonly isWorking = signal(false);
  readonly isSavingSettings = signal(false);
  readonly hasUnsavedChanges = signal(false);

  readonly currencyOptions = CURRENCY_OPTIONS;
  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly dateFormatOptions = computed<Array<SelectOption<ExpenseDateFormat>>>(() => (
    DATE_FORMAT_VALUES.map((value) => ({
      value,
      label: formatDate(DATE_FORMAT_PREVIEW_DATE, value, this.languageService.dateLocale()),
    }))
  ));

  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.userService.getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.syncThemeFromSettings(user.settings);
          this.hasUnsavedChanges.set(false);
        },
        error: () => this.snackbarService.error(this.languageService.t('settings.loadFailed')),
      });
  }

  updateSetting<TKey extends keyof AppSettings>(key: TKey, value: AppSettings[TKey]): void {
    this.appSettingsService.updateSetting(key, value);
    this.hasUnsavedChanges.set(true);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.hasUnsavedChanges.set(true);
  }

  resetSettings(): void {
    this.appSettingsService.reset();
    this.hasUnsavedChanges.set(true);
    this.snackbarService.success(this.languageService.t('settings.resetDone'));
  }

  saveSettings(): void {
    if (this.isSavingSettings()) return;

    this.isSavingSettings.set(true);
    this.userService.updateUserSettings(
      this.appSettingsService.toUserSettingsRequest({ theme: this.activeTheme() }),
    )
      .pipe(
        finalize(() => this.isSavingSettings.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.syncThemeFromSettings(user.settings);
          this.hasUnsavedChanges.set(false);
          this.snackbarService.success(this.languageService.t('settings.saved'));
        },
        error: (err: any) => {
          this.snackbarService.error(err?.error?.message ?? this.languageService.t('settings.saveFailed'));
        },
      });
  }

  canDeactivate(): boolean | null {
    if (this.isSavingSettings()) return false;
    if (!this.hasUnsavedChanges()) return true;
    return null;
  }

  shouldWarnBeforeUnload(): boolean {
    return this.hasUnsavedChanges() || this.isSavingSettings();
  }

  getCustomCategory(categoryId: string): ExpenseCategoryOption | null {
    return this.settings().customCategories.find((category) => category.id === categoryId) ?? null;
  }

  addCustomCategory(category: CustomCategoryChanges | null | undefined): void {
    if (!category) return;

    this.appSettingsService.addCustomCategory(category);
    this.hasUnsavedChanges.set(true);
    this.snackbarService.success(this.languageService.t('settings.categoryAdded'));
  }

  removeCustomCategory(categoryId: string): void {
    this.appSettingsService.removeCustomCategory(categoryId);
    this.hasUnsavedChanges.set(true);
    this.snackbarService.success(this.languageService.t('settings.categoryRemoved'));
  }

  updateCustomCategory(
    categoryId: string,
    changes: CustomCategoryChanges | null | undefined,
  ): void {
    if (!changes) return;

    this.appSettingsService.updateCustomCategory(categoryId, changes);
    this.hasUnsavedChanges.set(true);
    this.snackbarService.success(this.languageService.t('settings.categoryUpdated'));
  }

  loadExpensesForClear(): Observable<IExpense[]> {
    this.isWorking.set(true);
    return this.expenseTableService.getAllExpenses()
      .pipe(
        finalize(() => this.isWorking.set(false)),
        takeUntilDestroyed(this.destroyRef),
      );
  }

  notifyNoExpensesToClear(): void {
    this.snackbarService.success(this.languageService.t('settings.noExpensesToClear'));
  }

  notifyLoadExpensesFailed(): void {
    this.snackbarService.error(this.languageService.t('settings.loadFailed'));
  }

  clearExpenses(expenses: IExpense[]): void {
    this.isWorking.set(true);
    forkJoin(expenses.map((expense) => this.expenseTableService.deleteExpense(expense.id)))
      .pipe(
        finalize(() => this.isWorking.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.snackbarService.success(this.languageService.t('settings.allCleared')),
        error: () => this.snackbarService.error(this.languageService.t('settings.clearFailed')),
      });
  }

  private syncThemeFromSettings(settings: Record<string, unknown> | undefined): void {
    const theme = settings?.['theme'];
    if (theme === Theme.Dark || theme === Theme.Light) {
      this.themeService.setTheme(theme);
    }
  }
}
