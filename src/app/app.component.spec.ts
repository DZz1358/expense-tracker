import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { StorageKey } from './shared/local-storage/storage-key.enum';
import { Theme } from './shared/theme/theme.enum';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.classList.remove(Theme.Dark);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  for (const theme of [Theme.Dark, Theme.Light]) {
    it(`applies the saved user theme ${theme} on startup before opening settings`, () => {
      localStorage.setItem(StorageKey.Theme, JSON.stringify(theme === Theme.Dark ? Theme.Light : Theme.Dark));
      localStorage.setItem(StorageKey.User, JSON.stringify({
        id: 'user-1', email: 'john@example.com', settings: { theme },
      }));

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      TestBed.tick();

      expect(fixture.componentInstance.themeService.activeTheme()).toBe(theme);
      expect(document.body.classList.contains(Theme.Dark)).toBe(theme === Theme.Dark);
      expect(JSON.parse(localStorage.getItem(StorageKey.Theme)!)).toBe(theme);
    });
  }
});
