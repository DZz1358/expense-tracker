import { Pipe, PipeTransform } from '@angular/core';

import { ExpenseCategory, getExpenseCategoryIcon } from '../../mocks/expense-categories';


@Pipe({
  name: 'categoryIcon',
})
export class CategoryIconPipe implements PipeTransform {
  transform(value: ExpenseCategory | null | undefined): string {
    return getExpenseCategoryIcon(value);
  }
}
