import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ViewportServiceService } from './services/viewport-service.service';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  viewportServiceService = inject(ViewportServiceService);
  title = 'expense-tracker';

  mobileSidebarOpen = false;

  toggleMobileSidebar() {
    if (!this.viewportServiceService.isMobile()) return;
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen = false;
  }
}
