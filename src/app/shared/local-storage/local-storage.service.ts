import { Injectable } from '@angular/core';
import { StorageKey } from './storage-key.enum';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  setItem<T>(key: StorageKey, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getItem<T>(key: StorageKey): T | null {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
