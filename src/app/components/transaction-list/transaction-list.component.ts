import { Component, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { CommonModule, NgFor } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { TransactionService } from '../../service/transaction.service';
import { Transaction } from '../../models/transaction.interface';
import { TransactionTypePipe } from "../../pipes/transactionType.pipe";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { transactionsType } from '../../constants/transaction-type.const';
import { categoryType } from '../../constants/category-type.const';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatInputModule,
    CommonModule,
    MatIcon,
    MatButtonModule,
    TransactionTypePipe,
    MatDatepickerModule,
    NgFor,
    MatTooltipModule
  ],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss'
})
export class TransactionListComponent implements OnInit {
  public categories: string[] = categoryType;
  public transactionTypes: string[] = transactionsType;
  public balance: number = 0;
  public transactions: Transaction[] = [];
  public form!: FormGroup;
  public filteredData = [...this.transactions];
  public displayedColumns: string[] = ['transactionName', 'category', 'date', 'amount'];

  transactionService = inject(TransactionService);

  constructor(
    private dialog: MatDialog,
    private fb: FormBuilder
  ) { }

  get categoryFC(): UntypedFormControl {
    return this.form.get('category') as UntypedFormControl;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      category: ['All'],
      transactionType: ['All'],
      date: [null],
    });

    this.loadTransactions();
    this.subscribeToFilters();
  }

  loadTransactions(): void {
    this.transactions = this.transactionService.getTransactions();
    this.filteredData = this.transactions;
    this.updateCalculations();
  }

  subscribeToFilters(): void {
    this.form.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const { category, transactionType, date } = this.form.value;

    this.filteredData = this.transactions.filter((transaction) => {
      const matchesCategory =
        category === 'All' || transaction.category === category;

      const matchesTransactionType =
        transactionType === 'All' ||
        transaction.transactionType === transactionType;

      const matchesDate =
        !date || new Date(transaction.date).toDateString() === date.toDateString();

      return matchesCategory && matchesTransactionType && matchesDate;
    });
    console.log('this.filteredData', this.filteredData)
  }


  private updateCalculations(): void {
    this.balance = this.transactionService.getBalance();
  }

  addTransaction() {
    this.dialog.open(TransactionFormComponent, {
      maxWidth: '400px',
      width: '100%',
    }).afterClosed()
      .pipe(
    ).subscribe((data) => {
      if (data) {
        this.transactionService.saveTransaction(data)
        this.loadTransactions();
      }
    });
  }

}
