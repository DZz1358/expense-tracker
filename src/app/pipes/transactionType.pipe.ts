import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'transactionType',
  standalone: true
})
export class TransactionTypePipe implements PipeTransform {

  transform(transactionType: string) {
    switch (transactionType) {

      case "Expense":
        return '#FFF6F6';

      case "Income":
        return '#F9FFFB';

    }

    return null;
  }
}
