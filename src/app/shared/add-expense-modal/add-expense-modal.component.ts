import { Component, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-expense-modal',
  imports: [MatIcon, MatDialogModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSelectModule, MatDatepickerModule, MatButtonModule],
  templateUrl: './add-expense-modal.component.html',
  styleUrl: './add-expense-modal.component.scss'
})
export class AddExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  fb = inject(FormBuilder);

  categories = [{ value: 'food', viewValue: 'Food' }, { value: 'health', viewValue: 'Health' }, { value: 'transport', viewValue: 'Transport' }];
  paymentMethods = [{ value: 'cash', viewValue: 'Cash' }, { value: 'creditCard', viewValue: 'Credit Card' }, { value: 'paypal', viewValue: 'PayPal' }];

  minTime = signal(new Date());
  minDate = signal(new Date());

  public get dateFC(): FormControl {
    return this.form.get('date') as FormControl;
  }

  public form = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    paymentMethod: ['', Validators.required],
    date: [new Date(), Validators.required],
    description: [''],
  });

  addExpense() {
    console.log('this.form.value :>> ', this.form.value);
    const data = this.form.value;
    this.dialogRef.close(data);
  }


}
