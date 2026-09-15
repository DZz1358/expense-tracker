import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { Theme } from './theme.enum';
import { StorageKey } from '../local-storage/storage-key.enum';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);
  });

  it('should be created', () => {
    expect(TestBed.inject(ThemeService)).toBeTruthy();
  });

  it('restores the local theme when the user has no saved account theme', () => {
    localStorage.setItem(StorageKey.Theme, JSON.stringify(Theme.Dark));
    localStorage.setItem(StorageKey.User, JSON.stringify({ id: 'user-1', settings: {} }));
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.activeTheme()).toBe(Theme.Dark);
    expect(document.body.classList.contains(Theme.Dark)).toBeTrue();
  });

  it('keeps the active theme for missing or unsupported account preferences', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme(Theme.Dark);
    for (const settings of [undefined, {}, { theme: null }, { theme: 'system' }]) {
      service.syncFromSettings(settings);
      TestBed.tick();
      expect(service.activeTheme()).toBe(Theme.Dark);
      expect(document.body.classList.contains(Theme.Dark)).toBeTrue();
    }
  });
});
