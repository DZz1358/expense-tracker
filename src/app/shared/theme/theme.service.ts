import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { LocalStorageService } from '../local-storage/local-storage.service';
import { StorageKey } from '../local-storage/storage-key.enum';

import { Theme } from './theme.enum';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  #localStorageService = inject(LocalStorageService);

  #activeThemeSignal = signal<Theme>(this.#localStorageService.getItem(StorageKey.Theme) || Theme.Light);
  activeTheme = this.#activeThemeSignal.asReadonly();

  themeIcon = computed(() => this.activeTheme());

  toggleTheme(): void {
    this.#activeThemeSignal.update((theme) => theme === Theme.Dark ? Theme.Light : Theme.Dark);
    this.#localStorageService.setItem(StorageKey.Theme, this.#activeThemeSignal());
  }

  syncThemeWithDOM = effect(() => {
    document.body.classList.toggle(Theme.Dark, this.#activeThemeSignal() === Theme.Dark);
  });

}
