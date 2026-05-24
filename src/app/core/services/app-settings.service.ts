import { computed, Injectable, inject, signal } from '@angular/core';

import { EXPENSE_CATEGORY_LIST } from '../../mocks/expense-categories';
import { AuthUser, UpdateUserSettingsRequest } from '../models/auth.models';
import { LocalStorageService } from '../../shared/local-storage/local-storage.service';
import { StorageKey } from '../../shared/local-storage/storage-key.enum';

export type CurrencyCode = 'USD' | 'EUR' | 'NOK' | 'UAH' | 'GBP';
export type ExpenseDateFormat = 'dd.MM.yyyy' | 'MMM d, y' | 'yyyy-MM-dd';
export type AppLanguage = 'en' | 'ru' | 'uk';

export interface ExpenseCategoryOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  custom?: boolean;
}

export interface AppSettings {
  language: AppLanguage;
  currency: CurrencyCode;
  dateFormat: ExpenseDateFormat;
  notificationsEnabled: boolean;
  customCategories: ExpenseCategoryOption[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'en',
  currency: 'EUR',
  dateFormat: 'dd.MM.yyyy',
  notificationsEnabled: false,
  customCategories: [],
};

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private readonly localStorageService = inject(LocalStorageService);

  private readonly settingsSignal = signal<AppSettings>(
    this.createSettingsFromUser(
      this.localStorageService.getItem<AuthUser>(StorageKey.User),
      DEFAULT_APP_SETTINGS,
    ),
  );

  readonly settings = this.settingsSignal.asReadonly();
  readonly categories = computed<ExpenseCategoryOption[]>(() => [
    ...EXPENSE_CATEGORY_LIST,
    ...this.settingsSignal().customCategories,
  ]);

  updateSetting<TKey extends keyof AppSettings>(
    key: TKey,
    value: AppSettings[TKey],
  ): void {
    this.settingsSignal.update((settings) => ({
      ...settings,
      [key]: value,
    }));
  }

  reset(): void {
    this.settingsSignal.set(DEFAULT_APP_SETTINGS);
  }

  addCustomCategory(category: Omit<ExpenseCategoryOption, 'id' | 'custom'>): void {
    const id = this.createCategoryId(category.label);
    this.settingsSignal.update((settings) => ({
      ...settings,
      customCategories: [
        ...settings.customCategories,
        {
          ...category,
          id,
          custom: true,
        },
      ],
    }));
  }

  removeCustomCategory(categoryId: string): void {
    this.settingsSignal.update((settings) => ({
      ...settings,
      customCategories: settings.customCategories.filter((category) => category.id !== categoryId),
    }));
  }

  updateCustomCategory(
    categoryId: string,
    changes: Omit<ExpenseCategoryOption, 'id' | 'custom'>,
  ): void {
    this.settingsSignal.update((settings) => ({
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
    }));
  }

  getCategory(categoryId: string | null | undefined): ExpenseCategoryOption | null {
    if (!categoryId) return null;
    return this.categories().find((category) => category.id === categoryId) ?? null;
  }

  toUserSettingsRequest(extraSettings: Record<string, unknown> = {}): UpdateUserSettingsRequest {
    const settings = this.settingsSignal();
    return {
      category: settings.customCategories.map((category) => category.id),
      settings: {
        language: settings.language,
        currency: settings.currency,
        dateFormat: settings.dateFormat,
        notificationsEnabled: settings.notificationsEnabled,
        customCategories: settings.customCategories,
        ...extraSettings,
      },
    };
  }

  syncWithUser(user: AuthUser | null): void {
    this.settingsSignal.set(this.createSettingsFromUser(user, this.settingsSignal()));
  }

  private createSettingsFromUser(user: AuthUser | null, fallback: AppSettings): AppSettings {
    if (!user) {
      return DEFAULT_APP_SETTINGS;
    }

    const rawSettings = this.asRecord(user.settings);
    const language = rawSettings?.['language'];
    const currency = rawSettings?.['currency'];
    const dateFormat = rawSettings?.['dateFormat'];
    const notificationsEnabled = rawSettings?.['notificationsEnabled'];
    const customCategories = this.createCustomCategoriesFromUser(
      user.category,
      rawSettings?.['customCategories'],
      fallback.customCategories,
    );

    if (!rawSettings && !Array.isArray(user.category)) {
      return fallback;
    }

    return {
      language: this.isAppLanguage(language) ? language : fallback.language,
      currency: this.isCurrencyCode(currency) ? currency : fallback.currency,
      dateFormat: this.isExpenseDateFormat(dateFormat)
        ? dateFormat
        : fallback.dateFormat,
      notificationsEnabled: typeof notificationsEnabled === 'boolean'
        ? notificationsEnabled
        : fallback.notificationsEnabled,
      customCategories,
    };
  }

  private createCustomCategoriesFromUser(
    categoryIds: unknown,
    rawCustomCategories: unknown,
    fallbackCategories: ExpenseCategoryOption[],
  ): ExpenseCategoryOption[] {
    const storedCategories = this.readCustomCategories(rawCustomCategories);
    if (!Array.isArray(categoryIds)) {
      return storedCategories.length ? storedCategories : fallbackCategories;
    }

    return categoryIds
      .filter((categoryId): categoryId is string => typeof categoryId === 'string' && categoryId.trim().length > 0)
      .map((categoryId) => {
        const id = categoryId.trim();
        return (
          storedCategories.find((category) => category.id === id) ??
          fallbackCategories.find((category) => category.id === id) ??
          this.createCategoryOptionFromId(id)
        );
      });
  }

  private readCustomCategories(value: unknown): ExpenseCategoryOption[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((category): category is Record<string, unknown> => typeof category === 'object' && category !== null)
      .filter((category) => (
        typeof category['id'] === 'string' &&
        typeof category['label'] === 'string' &&
        typeof category['icon'] === 'string' &&
        typeof category['color'] === 'string'
      ))
      .map((category) => ({
        id: String(category['id']),
        label: String(category['label']),
        icon: String(category['icon']),
        color: String(category['color']),
        custom: true,
      }));
  }

  private createCategoryOptionFromId(id: string): ExpenseCategoryOption {
    return {
      id,
      label: id.replace(/^custom_/, '').replace(/_/g, ' '),
      icon: 'sell',
      color: '#607D8B',
      custom: true,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private isCurrencyCode(value: unknown): value is CurrencyCode {
    return ['USD', 'EUR', 'NOK', 'UAH', 'GBP'].includes(String(value));
  }

  private isExpenseDateFormat(value: unknown): value is ExpenseDateFormat {
    return ['dd.MM.yyyy', 'MMM d, y', 'yyyy-MM-dd'].includes(String(value));
  }

  private isAppLanguage(value: unknown): value is AppLanguage {
    return ['en', 'ru', 'uk'].includes(String(value));
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
