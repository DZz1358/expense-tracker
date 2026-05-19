import { inject, Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryColor } from '../../mocks/expense-categories';
import { AppSettingsService } from '../../core/services/app-settings.service';

@Pipe({
  name: 'categoryColor',
  pure: false,
})
export class CategoryColorPipe implements PipeTransform {
  private readonly appSettingsService = inject(AppSettingsService);

  transform(value: ExpenseCategory | string | null | undefined): string {
    return this.appSettingsService.getCategory(value)?.color ?? getExpenseCategoryColor(value as ExpenseCategory);
  }

}
