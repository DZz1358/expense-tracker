import { Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryLabel } from '../../mocks/expense-categories';

@Pipe({
  name: 'categoryLabel',
})
export class CategoryLabelPipe implements PipeTransform {
  transform(value: ExpenseCategory | null | undefined): string {
    return getExpenseCategoryLabel(value);
  }
}
