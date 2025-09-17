import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  http = inject(HttpClient)

  constructor() { }

  getData() {
    return this.http.get(`http://localhost:3000/expenses`)
  }
}
