import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, tap } from 'rxjs';

import { AuthUser, UpdatePasswordRequest, UpdateProfileRequest } from '../models/auth.models';
import { environment } from '../../../environments/environment';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getMe(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${environment.apiUrl}/users/me`)
      .pipe(tap((user) => this.authService.updateCurrentUser(user)));
  }

  updateProfile(payload: UpdateProfileRequest): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${environment.apiUrl}/users/me`, payload)
      .pipe(tap((user) => this.authService.updateCurrentUser(user)));
  }

  updateAvatar(file: File): Observable<AuthUser> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http
      .patch<AuthUser>(`${environment.apiUrl}/users/me/avatar`, formData)
      .pipe(tap((user) => this.authService.updateCurrentUser(user)));
  }

  updatePassword(payload: UpdatePasswordRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}/users/me/password`,
      payload,
    );
  }
}
