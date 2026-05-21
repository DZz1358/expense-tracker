import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { forkJoin } from 'rxjs';

import { AppLanguage, AppSettings, AppSettingsService, CurrencyCode, ExpenseDateFormat } from '../../core/services/app-settings.service';
import { IExpense } from '../../models/expense.interface';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { Theme } from '../../shared/theme/theme.enum';
import { ThemeService } from '../../shared/theme/theme.service';
import { ExpenseTableService } from '../expense-table/expense-table.service';
import { CustomCategoryModalComponent } from './custom-category-modal/custom-category-modal.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    TranslatePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly themeService = inject(ThemeService);
  private readonly expenseTableService = inject(ExpenseTableService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly languageService = inject(LanguageService);

  readonly settings = this.appSettingsService.settings;
  readonly categories = this.appSettingsService.categories;
  readonly activeTheme = this.themeService.activeTheme;
  readonly Theme = Theme;

  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isWorking = signal(false);

  readonly currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'NOK', label: 'Norwegian Krone (NOK)' },
    { value: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
  ];

  readonly dateFormatOptions: Array<{ value: ExpenseDateFormat; label: string }> = [
    { value: 'dd.MM.yyyy', label: '31.12.2026' },
    { value: 'MMM d, y', label: 'Dec 31, 2026' },
    { value: 'yyyy-MM-dd', label: '2026-12-31' },
  ];

  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly languageOptions: Array<{ value: AppLanguage; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ];

  updateSetting<TKey extends keyof AppSettings>(key: TKey, value: AppSettings[TKey]): void {
    this.appSettingsService.updateSetting(key, value);
    this.setStatus(this.languageService.t('settings.saved'));
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.setStatus(this.languageService.t('settings.themeUpdated'));
  }

  resetSettings(): void {
    this.appSettingsService.reset();
    this.setStatus(this.languageService.t('settings.resetDone'));
  }

  openAddCustomCategoryModal(): void {
    this.dialog.open(CustomCategoryModalComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '520px',
      data: { mode: 'create' },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.appSettingsService.addCustomCategory(result);
        this.setStatus(this.languageService.t('settings.categoryAdded'));
      });
  }

  removeCustomCategory(categoryId: string): void {
    this.appSettingsService.removeCustomCategory(categoryId);
    this.setStatus(this.languageService.t('settings.categoryRemoved'));
  }

  editCustomCategory(categoryId: string): void {
    const category = this.settings().customCategories.find((item) => item.id === categoryId);
    if (!category) return;

    this.dialog.open(CustomCategoryModalComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '520px',
      data: {
        mode: 'edit',
        category,
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.appSettingsService.updateCustomCategory(category.id, result);
        this.setStatus(this.languageService.t('settings.categoryUpdated'));
      });
  }

  exportExpenses(): void {
    this.startWork();
    this.expenseTableService.getAllExpenses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (expenses) => {
          const payload = {
            exportedAt: new Date().toISOString(),
            settings: this.settings(),
            expenses,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `expense-tracker-${new Date().toISOString().slice(0, 10)}.json`;
          anchor.click();
          URL.revokeObjectURL(url);
          this.finishWork(this.languageService.t('settings.exported'));
        },
        error: () => this.finishWork(null, this.languageService.t('settings.exportFailed')),
      });
  }

  importExpenses(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.startWork();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const settingsImported = this.applyImportedSettings(parsed);
        const expenses = this.extractExpenses(parsed);
        if (!expenses.length) {
          this.finishWork(
            settingsImported ? this.languageService.t('settings.settingsImported') : null,
            settingsImported ? undefined : this.languageService.t('settings.noExpensesInFile'),
          );
          return;
        }

        forkJoin(expenses.map((expense) => this.expenseTableService.addExpense(expense)))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.finishWork(this.languageService.t('settings.importedCount', { count: expenses.length })),
            error: () => this.finishWork(null, this.languageService.t('settings.importFailed')),
          });
      } catch {
        this.finishWork(null, this.languageService.t('settings.invalidFile'));
      }
    };
    reader.onerror = () => this.finishWork(null, this.languageService.t('settings.readFailed'));
    reader.readAsText(file);
  }

  openClearExpensesModal(): void {
    this.startWork();
    this.expenseTableService.getAllExpenses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (expenses: IExpense[]) => {
          this.finishWork(null);

          if (!expenses.length) {
            this.setStatus(this.languageService.t('settings.noExpensesToClear'));
            return;
          }

          this.dialog.open(ConfirmationModalComponent, {
            width: 'calc(100% - 30px)',
            maxWidth: '600px',
            data: {
              title: this.languageService.t('settings.clearTitle'),
              message: this.languageService.t('settings.clearMessageWithCount', {
                count: expenses.length,
              }),
              confirmationText: 'DELETE',
              confirmButtonLabel: this.languageService.t('common.delete'),
            },
          })
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
              if (!result?.confirmed) return;
              this.clearExpenses(expenses);
            });
        },
        error: () => this.finishWork(null, this.languageService.t('settings.loadFailed')),
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

  private extractExpenses(payload: unknown): Array<Omit<IExpense, 'id' | 'createdAt'>> {
    const rawExpenses = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' && payload !== null && Array.isArray((payload as { expenses?: unknown }).expenses)
        ? (payload as { expenses: unknown[] }).expenses
        : [];

    return rawExpenses
      .filter((item): item is Partial<IExpense> => typeof item === 'object' && item !== null)
      .map((expense) => ({
        amount: Number(expense.amount),
        category: String(expense.category ?? ''),
        description: expense.description ? String(expense.description) : '',
        expenseDate: String(expense.expenseDate ?? new Date().toISOString()),
        attachmentUrl: expense.attachmentUrl,
      }))
      .filter((expense) => Number.isFinite(expense.amount) && expense.amount > 0);
  }

  private applyImportedSettings(payload: unknown): boolean {
    if (typeof payload !== 'object' || payload === null) return false;
    const settings = (payload as { settings?: Partial<AppSettings> }).settings;
    if (!settings) return false;

    let imported = false;
    const currency = settings.currency;
    if (currency && this.currencyOptions.some((option) => option.value === currency)) {
      this.appSettingsService.updateSetting('currency', currency);
      imported = true;
    }
    const dateFormat = settings.dateFormat;
    if (dateFormat && this.dateFormatOptions.some((option) => option.value === dateFormat)) {
      this.appSettingsService.updateSetting('dateFormat', dateFormat);
      imported = true;
    }
    if (this.pageSizeOptions.includes(Number(settings.defaultPageSize))) {
      this.appSettingsService.updateSetting('defaultPageSize', Number(settings.defaultPageSize));
      imported = true;
    }
    if (typeof settings.notificationsEnabled === 'boolean') {
      this.appSettingsService.updateSetting('notificationsEnabled', settings.notificationsEnabled);
      imported = true;
    }
    if (Array.isArray(settings.customCategories)) {
      this.appSettingsService.updateSetting(
        'customCategories',
        settings.customCategories.filter((category) => (
          typeof category.id === 'string' &&
          typeof category.label === 'string' &&
          typeof category.icon === 'string' &&
          typeof category.color === 'string'
        )),
      );
      imported = true;
    }
    return imported;
  }

  private startWork(): void {
    this.isWorking.set(true);
    this.statusMessage.set(null);
    this.errorMessage.set(null);
  }

  private finishWork(status: string | null, error?: string): void {
    this.isWorking.set(false);
    this.statusMessage.set(status);
    this.errorMessage.set(error ?? null);
  }

  private setStatus(message: string): void {
    this.statusMessage.set(message);
    this.errorMessage.set(null);
  }
}
