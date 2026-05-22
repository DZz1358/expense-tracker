import { ApplicationRef, Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { concat, first, interval } from 'rxjs';

import { LanguageService } from '../i18n/language.service';

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly appRef = inject(ApplicationRef);
  private readonly languageService = inject(LanguageService);
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  init(): void {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    // The first update check waits until Angular finishes initial rendering.
    // After that, the app checks again on a predictable interval while it stays open.
    const appIsStable$ = this.appRef.isStable.pipe(first(Boolean));
    const updateCheckInterval$ = interval(UPDATE_CHECK_INTERVAL);

    concat(appIsStable$, updateCheckInterval$).subscribe(() => {
      this.swUpdate?.checkForUpdate();
    });

    // Angular downloads a complete new app version before sending VERSION_READY.
    // Reloading after the user's confirmation lets the service worker serve that version.
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type !== 'VERSION_READY') {
        return;
      }

      const shouldReload = window.confirm(
        this.languageService.t('appUpdate.updateAvailable'),
      );

      if (shouldReload) {
        window.location.reload();
      }
    });
  }
}
