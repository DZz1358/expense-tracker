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

  it('splits built-in categories by operation type and still resolves any id', () => {
    const incomeIds = service.categoriesOf('income').map((category) => category.id);
    const expenseIds = service.categoriesOf('expense').map((category) => category.id);
    expect(incomeIds).toEqual(['salary', 'side_job', 'benefits', 'refund', 'gifts', 'other_income']);
    expect(expenseIds).toContain('housing');
    expect(expenseIds).not.toContain('salary');
    expect(service.categoriesOf('')).toEqual(service.categories());
    expect(service.categories().length).toBe(incomeIds.length + expenseIds.length);
    expect(service.getCategory('salary')?.type).toBe('income');
    expect(service.getCategory('other')?.type).toBe('expense');
  });

  it('treats custom categories without a stored type as expense categories', () => {
    service.addCustomCategory({ label: 'Coffee', icon: 'coffee', color: '#000000' });
    const custom = service.settings().customCategories[0];
    expect(custom.type).toBe('expense');
    expect(service.categoriesOf('expense')).toContain(custom);
    expect(service.categoriesOf('income')).not.toContain(custom);
  });
});
