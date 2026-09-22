import { DOCUMENT, inject, Injectable, NgZone } from '@angular/core';

import { environment } from '../../../environments/environment';

export type GoogleIdentity = typeof google.accounts.id;
export type GoogleButtonOptions = google.accounts.id.GsiButtonConfiguration;
export type GoogleCredentialHandler = (credential: string) => void;

// Google requires the SDK to be loaded from this URL, a local copy is not allowed.
export const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

@Injectable({
  providedIn: 'root',
})
export class GoogleIdentityService {
  private readonly document = inject(DOCUMENT);
  private readonly ngZone = inject(NgZone);

  private loadPromise: Promise<GoogleIdentity> | null = null;
  private initializePromise: Promise<GoogleIdentity> | null = null;
  private credentialHandler: GoogleCredentialHandler | null = null;

  readonly isConfigured = environment.googleClientId.length > 0;

  /**
   * Injects the Google Identity Services script once and resolves with the
   * `google.accounts.id` namespace. Concurrent callers share one request and a
   * failed load can be retried.
   */
  load(): Promise<GoogleIdentity> {
    const identity = this.getIdentity();
    if (identity) return Promise.resolve(identity);

    if (!this.loadPromise) {
      this.loadPromise = this.injectScript().catch((error) => {
        this.loadPromise = null;
        throw error;
      });
    }

    return this.loadPromise;
  }

  /**
   * Registers `onCredential` as the active handler. Google's own `initialize`
   * must run only once per page, so it is called on the first invocation and
   * later calls just swap the handler. Google invokes the callback from its
   * own script, outside the Angular zone, so it is re-entered via `NgZone.run`.
   */
  async initialize(onCredential: GoogleCredentialHandler): Promise<void> {
    this.credentialHandler = onCredential;

    if (!this.initializePromise) {
      this.initializePromise = this.load()
        .then((identity) => {
          identity.initialize({
            client_id: environment.googleClientId,
            ux_mode: 'popup',
            callback: ({ credential }) =>
              this.ngZone.run(() => this.credentialHandler?.(credential)),
          });
          return identity;
        })
        .catch((error) => {
          this.initializePromise = null;
          throw error;
        });
    }

    await this.initializePromise;
  }

  /** Drops `onCredential` if it is still the active handler (call on destroy). */
  release(onCredential: GoogleCredentialHandler): void {
    if (this.credentialHandler === onCredential) {
      this.credentialHandler = null;
    }
  }

  /** Renders the button into `parent`; requires a resolved `initialize()`. */
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void {
    const identity = this.getIdentity();
    if (!identity) {
      throw new Error('Google Identity Services is not loaded');
    }

    parent.replaceChildren();
    identity.renderButton(parent, options);
  }

  /** Prevents Google from silently signing the user back in after logout. */
  disableAutoSelect(): void {
    this.getIdentity()?.disableAutoSelect();
  }

  private getIdentity(): GoogleIdentity | null {
    return typeof google === 'undefined' ? null : google.accounts?.id ?? null;
  }

  private injectScript(): Promise<GoogleIdentity> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');

      const cleanup = () => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };
      const onLoad = () => {
        cleanup();
        const identity = this.getIdentity();
        if (identity) {
          resolve(identity);
        } else {
          script.remove();
          reject(new Error('Google Identity Services script loaded without google.accounts.id'));
        }
      };
      const onError = () => {
        cleanup();
        script.remove();
        reject(new Error('Failed to load Google Identity Services script'));
      };

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      this.document.head.appendChild(script);
    });
  }
}
