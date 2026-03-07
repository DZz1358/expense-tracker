import { Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryColor } from '../../mocks/expense-categories';

@Pipe({
  name: 'categoryColor',
})
export class CategoryColorPipe implements PipeTransform {

  transform(value: ExpenseCategory | null | undefined): string {
    return getExpenseCategoryColor(value);
  }

}
