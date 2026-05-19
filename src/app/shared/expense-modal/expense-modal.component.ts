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
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { CategoryLabelPipe } from '../pipes/category-label.pipe';
@Component({
  selector: 'app-expense-modal',
  imports: [MatIconModule, MatDialogModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, ButtonComponent, FormField, TranslatePipe, CategoryLabelPipe],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss'
})
export class ExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  appSettingsService = inject(AppSettingsService);
  languageService = inject(LanguageService);

  categories = computed(() => this.appSettingsService.categories());

  expenseModel = signal({
    amount: '',
    category: '',
    description: '',
    expenseDate: new Date(),
  })

  expenseForm = form(this.expenseModel, (expense) => {
    required(expense.amount, { message: this.languageService.t('validation.amountRequired') });
    min(expense.amount, 0.01, { message: this.languageService.t('validation.amountMin') });
    pattern(expense.amount, /^\d+(\.\d+)?$/, { message: this.languageService.t('validation.onlyNumbers') });

    required(expense.category, { message: this.languageService.t('validation.categoryRequired') });

    required(expense.description, { message: this.languageService.t('validation.descriptionRequired') });
    minLength(expense.description, 2, { message: this.languageService.t('validation.descriptionMin') });
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
