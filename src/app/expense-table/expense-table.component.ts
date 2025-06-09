import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ThemeToggleComponent } from '../shared/theme-toggle/theme-toggle.component';


@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatToolbarModule, MatButtonModule, ThemeToggleComponent],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss'
})
export class ExpenseTableComponent {

}
