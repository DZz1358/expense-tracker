import { inject, Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryLabel } from '../../mocks/expense-categories';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { LanguageService } from '../../core/i18n/language.service';

@Pipe({
  name: 'categoryLabel',
  pure: false,
})
export class CategoryLabelPipe implements PipeTransform {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly languageService = inject(LanguageService);

  transform(value: ExpenseCategory | string | null | undefined): string {
    const category = this.appSettingsService.getCategory(value);
    if (category?.custom) return category.label;
    if (category) return this.languageService.t(`category.${category.id}`);
    return getExpenseCategoryLabel(value as ExpenseCategory);
  }
}
