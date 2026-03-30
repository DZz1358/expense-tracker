import { HostListener, Injectable, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

@Injectable({
  providedIn: 'root',
})
export class ViewportServiceService {
  readonly isMobile = signal(false);

  constructor(private bo: BreakpointObserver) {
    this.bo.observe('(max-width: 767px)').subscribe(result => {
      this.isMobile.set(result.matches);
    });
  }
}
