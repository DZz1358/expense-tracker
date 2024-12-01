import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { categoryType } from '../../constants/category-type.const';
import { transactionsType } from '../../constants/transaction-type.const';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatInputModule,
    MatIcon,
    MatButtonModule,
    MatDatepickerModule,
    CommonModule
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss'
})
export class TransactionFormComponent implements OnInit {
  public transactionForm!: FormGroup;
  public categories: string[] = categoryType;
  public transactionTypes: string[] = transactionsType;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<any>,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.transactionForm = this.fb.group({
      title: ['', Validators.required],
      transactionType: ['', Validators.required,],
      category: ['', Validators.required],
      date: [null, Validators.required],
      amount: [null, [
        Validators.required,
        Validators.min(0.01),
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]],
    });
  }

  validateAmountInput() {
    const amountControl = this.transactionForm.get('amount');
    if (amountControl?.value) {
      const validValue = amountControl.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      const [integer, decimal] = validValue.split('.');
      if (decimal?.length > 2) {
        amountControl.setValue(`${integer}.${decimal.slice(0, 2)}`);
      } else {
        amountControl.setValue(validValue);
      }
    }
  }

  public cancel(): void {
    this.dialogRef.close();
  }

  onSubmit() {
    const newTransaction = this.transactionForm.value;
    this.transactionForm.reset();
    this.dialogRef.close(newTransaction);
  }

}
