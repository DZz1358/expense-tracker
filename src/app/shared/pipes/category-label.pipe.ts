import { inject, Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryLabel } from '../../mocks/expense-categories';
import { AppSettingsService } from '../../core/services/app-settings.service';

@Pipe({
  name: 'categoryLabel',
  pure: false,
})
export class CategoryLabelPipe implements PipeTransform {
  private readonly appSettingsService = inject(AppSettingsService);

  transform(value: ExpenseCategory | string | null | undefined): string {
    return this.appSettingsService.getCategory(value)?.label ?? getExpenseCategoryLabel(value as ExpenseCategory);
  }
}
