import { inject, Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryIcon } from '../../mocks/expense-categories';
import { AppSettingsService } from '../../core/services/app-settings.service';


@Pipe({
  name: 'categoryIcon',
  pure: false,
})
export class CategoryIconPipe implements PipeTransform {
  private readonly appSettingsService = inject(AppSettingsService);

  transform(value: ExpenseCategory | string | null | undefined): string {
    return this.appSettingsService.getCategory(value)?.icon ?? getExpenseCategoryIcon(value as ExpenseCategory);
  }
}
