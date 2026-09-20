import { TestBed } from '@angular/core/testing';

import { AppSettingsService } from './app-settings.service';

describe('AppSettingsService categories', () => {
  let service: AppSettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppSettingsService);
  });

  afterEach(() => localStorage.clear());

  it('resolves legacy built-in category casing and whitespace', () => {
    expect(service.getCategory(' Other ')?.id).toBe('other');
    expect(service.getCategory('OTHER')?.label).toBe('Other');
  });
});
