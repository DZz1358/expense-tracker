import { Component, computed, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, MatToolbarModule, MatMenuModule, RouterLink, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  viewportServiceService = inject(ViewportServiceService);
  menuClick = output<void>();

  readonly avatarSrc = computed(() => {
    const avatarUrl = this.authService.currentUser()?.avatarUrl;
    if (!avatarUrl) return '/cat.jpg';
    return avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')
      ? avatarUrl
      : `${environment.apiUrl}${avatarUrl}`;
  });

  logOut() {
    this.authService.logout();
  }
}
