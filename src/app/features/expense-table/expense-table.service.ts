import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExpenseTableService {
  private http = inject(HttpClient);

  getAllExpenses(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/expenses`);
  }

  addExpense(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/expenses`, {
      ...data
    })
  }
  updateExpense(data: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/expenses/${data.id}`, {
      ...data
    })
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/expenses/${id}`);
  }
}
