import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-expense-modal',
  imports: [MatIconModule, MatDialogModule, FormsModule, ReactiveFormsModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss'
})
export class ExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  fb = inject(FormBuilder);

  categories = [{ value: 'food', viewValue: 'Food' }, { value: 'health', viewValue: 'Health' }, { value: 'transport', viewValue: 'Transport' }];
  paymentMethods = [{ value: 'cash', viewValue: 'Cash' }, { value: 'creditCard', viewValue: 'Credit Card' }, { value: 'paypal', viewValue: 'PayPal' }];

  public get dateFC(): FormControl {
    return this.form.get('date') as FormControl;
  }

  constructor() {
    console.log('this.dialogData :>> ', this.dialogData);
    if (this.dialogData.isEdit && this.dialogData.expense) {
      this.form.patchValue(this.dialogData.expense);
      this.dateFC.setValue(this.dialogData.expense.date.toDate());
    }
  }

  public form = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    paymentMethod: ['', Validators.required],
    date: [new Date(), Validators.required],
    description: [''],
  });

  addExpense() {
    const data = {
      ...this.form.value,
      createdAt: this.dialogData.isEdit ? this.dialogData.expense.createdAt : new Date(),
    };
    this.dialogRef.close(data);
  }

}
