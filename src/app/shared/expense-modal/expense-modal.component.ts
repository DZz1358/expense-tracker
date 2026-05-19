import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { form, min, minLength, required, FormField, pattern } from '@angular/forms/signals';

import { ButtonComponent } from '../button/button.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
@Component({
  selector: 'app-expense-modal',
  imports: [MatIconModule, MatDialogModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, ButtonComponent, FormField],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss'
})
export class ExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  appSettingsService = inject(AppSettingsService);

  categories = computed(() => this.appSettingsService.categories());

  expenseModel = signal({
    amount: '',
    category: '',
    description: '',
    expenseDate: new Date(),
  })

  expenseForm = form(this.expenseModel, (expense) => {
    required(expense.amount, { message: 'Amount is required' });
    min(expense.amount, 0.01, { message: 'Amount must be greater than 0' });
    pattern(expense.amount, /^\d+(\.\d+)?$/, { message: 'Only numbers are allowed' });

    required(expense.category, { message: 'Category is required' });

    required(expense.description, { message: 'Description is required' });
    minLength(expense.description, 2, { message: 'Description must be at least 2 characters long' });
  });


  constructor() {
    if (this.dialogData.isEdit && this.dialogData.expense) {
      this.expenseModel.set({
        ...this.expenseModel(),
        ...this.dialogData.expense,
        expenseDate: this.dialogData.expense.expenseDate
      });
    }
  }

  addExpense() {
    const data = {
      ...this.expenseModel(),
      amount: Number(this.expenseModel().amount)
    };
    this.dialogRef.close(data);
  }

}
