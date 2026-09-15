import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { LocalStorageService } from '../local-storage/local-storage.service';
import { StorageKey } from '../local-storage/storage-key.enum';
import { AuthUser } from '../../core/models/auth.models';

import { Theme } from './theme.enum';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  #localStorageService = inject(LocalStorageService);

  #activeThemeSignal = signal<Theme>(this.#localStorageService.getItem(StorageKey.Theme) || Theme.Light);
  activeTheme = this.#activeThemeSignal.asReadonly();

  themeIcon = computed(() => this.activeTheme());

  constructor() {
    this.syncFromSettings(this.#localStorageService.getItem<AuthUser>(StorageKey.User)?.settings);
  }

  syncFromSettings(settings: Record<string, unknown> | undefined): void {
    const theme = settings?.['theme'];
    if (theme === Theme.Dark || theme === Theme.Light) {
      this.setTheme(theme);
    }
  }

  toggleTheme(): void {
    this.setTheme(this.#activeThemeSignal() === Theme.Dark ? Theme.Light : Theme.Dark);
  }

  setTheme(theme: Theme): void {
    this.#activeThemeSignal.set(theme);
    this.#localStorageService.setItem(StorageKey.Theme, theme);
  }

  syncThemeWithDOM = effect(() => {
    document.body.classList.toggle(Theme.Dark, this.#activeThemeSignal() === Theme.Dark);
  });

}
