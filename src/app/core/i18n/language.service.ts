import { Injectable, computed, inject } from '@angular/core';

import { AppLanguage, AppSettingsService } from '../services/app-settings.service';
import { TRANSLATIONS } from './translations';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly appSettingsService = inject(AppSettingsService);

  readonly activeLanguage = computed(() => this.appSettingsService.settings().language);

  setLanguage(language: AppLanguage): void {
    this.appSettingsService.updateSetting('language', language);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translations = TRANSLATIONS[this.activeLanguage()] ?? TRANSLATIONS.en;
    const template = translations[key] ?? TRANSLATIONS.en[key] ?? key;

    if (!params) return template;

    return Object.entries(params).reduce(
      (value, [paramKey, paramValue]) => value.replaceAll(`{${paramKey}}`, String(paramValue)),
      template,
    );
  }
}
