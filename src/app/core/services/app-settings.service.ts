import { computed, Injectable, inject, signal } from '@angular/core';

import { EXPENSE_CATEGORY_LIST } from '../../mocks/expense-categories';
import { LocalStorageService } from '../../shared/local-storage/local-storage.service';
import { StorageKey } from '../../shared/local-storage/storage-key.enum';

export type CurrencyCode = 'USD' | 'EUR' | 'NOK' | 'UAH' | 'GBP';
export type ExpenseDateFormat = 'dd.MM.yyyy' | 'MMM d, y' | 'yyyy-MM-dd';

export interface ExpenseCategoryOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  custom?: boolean;
}

export interface AppSettings {
  currency: CurrencyCode;
  dateFormat: ExpenseDateFormat;
  defaultPageSize: number;
  notificationsEnabled: boolean;
  customCategories: ExpenseCategoryOption[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: 'EUR',
  dateFormat: 'dd.MM.yyyy',
  defaultPageSize: 10,
  notificationsEnabled: false,
  customCategories: [],
};

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private readonly localStorageService = inject(LocalStorageService);

  private readonly settingsSignal = signal<AppSettings>({
    ...DEFAULT_APP_SETTINGS,
    ...this.localStorageService.getItem<Partial<AppSettings>>(StorageKey.AppSettings),
  });

  readonly settings = this.settingsSignal.asReadonly();
  readonly categories = computed<ExpenseCategoryOption[]>(() => [
    ...EXPENSE_CATEGORY_LIST,
    ...this.settingsSignal().customCategories,
  ]);

  updateSetting<TKey extends keyof AppSettings>(
    key: TKey,
    value: AppSettings[TKey],
  ): void {
    this.settingsSignal.update((settings) => {
      const nextSettings = {
        ...settings,
        [key]: value,
      };
      this.localStorageService.setItem(StorageKey.AppSettings, nextSettings);
      return nextSettings;
    });
  }

  reset(): void {
    this.settingsSignal.set(DEFAULT_APP_SETTINGS);
    this.localStorageService.setItem(StorageKey.AppSettings, DEFAULT_APP_SETTINGS);
  }

  addCustomCategory(category: Omit<ExpenseCategoryOption, 'id' | 'custom'>): void {
    const id = this.createCategoryId(category.label);
    this.settingsSignal.update((settings) => {
      const nextSettings = {
        ...settings,
        customCategories: [
          ...settings.customCategories,
          {
            ...category,
            id,
            custom: true,
          },
        ],
      };
      this.localStorageService.setItem(StorageKey.AppSettings, nextSettings);
      return nextSettings;
    });
  }

  removeCustomCategory(categoryId: string): void {
    this.settingsSignal.update((settings) => {
      const nextSettings = {
        ...settings,
        customCategories: settings.customCategories.filter((category) => category.id !== categoryId),
      };
      this.localStorageService.setItem(StorageKey.AppSettings, nextSettings);
      return nextSettings;
    });
  }

  updateCustomCategory(
    categoryId: string,
    changes: Omit<ExpenseCategoryOption, 'id' | 'custom'>,
  ): void {
    this.settingsSignal.update((settings) => {
      const nextSettings = {
        ...settings,
        customCategories: settings.customCategories.map((category) => (
          category.id === categoryId
            ? {
                ...category,
                ...changes,
                custom: true,
              }
            : category
        )),
      };
      this.localStorageService.setItem(StorageKey.AppSettings, nextSettings);
      return nextSettings;
    });
  }

  getCategory(categoryId: string | null | undefined): ExpenseCategoryOption | null {
    if (!categoryId) return null;
    return this.categories().find((category) => category.id === categoryId) ?? null;
  }

  private createCategoryId(label: string): string {
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'category';
    return `custom_${slug}_${Date.now()}`;
  }
}
