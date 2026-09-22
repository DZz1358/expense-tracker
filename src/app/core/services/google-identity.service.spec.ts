import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';

import { GOOGLE_IDENTITY_SCRIPT_URL, GoogleIdentity, GoogleIdentityService } from './google-identity.service';

type GoogleWindow = Window & { google?: { accounts: { id: Partial<GoogleIdentity> } } };

describe('GoogleIdentityService', () => {
  let service: GoogleIdentityService;
  let identity: jasmine.SpyObj<GoogleIdentity>;
  // Scripts the service tried to append; they are captured instead of inserted so the
  // real Google SDK is never downloaded into the Karma page.
  let injectedScripts: HTMLScriptElement[];

  const googleWindow = window as GoogleWindow;

  const installSdk = () => {
    googleWindow.google = { accounts: { id: identity } };
  };

  const removeSdk = () => {
    delete googleWindow.google;
  };

  const injectedScript = () => injectedScripts[injectedScripts.length - 1] ?? null;

  beforeEach(() => {
    removeSdk();
    injectedScripts = [];
    spyOn(document.head, 'appendChild').and.callFake(<T extends Node>(node: T): T => {
      injectedScripts.push(node as unknown as HTMLScriptElement);
      return node;
    });
    identity = jasmine.createSpyObj<GoogleIdentity>('google.accounts.id', [
      'initialize',
      'renderButton',
      'disableAutoSelect',
    ]);

    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleIdentityService);
  });

  afterEach(() => {
    removeSdk();
  });

  it('is configured when a Google client id is present', () => {
    expect(service.isConfigured).toBe(environment.googleClientId.length > 0);
  });

  it('resolves immediately when the SDK is already on the page', async () => {
    installSdk();

    await expectAsync(service.load()).toBeResolvedTo(identity as unknown as GoogleIdentity);
    expect(injectedScripts.length).toBe(0);
  });

  it('injects the Google script once and resolves after it loads', async () => {
    const first = service.load();
    const second = service.load();

    expect(injectedScripts.length).toBe(1);
    const script = injectedScript()!;
    expect(script.src).toBe(GOOGLE_IDENTITY_SCRIPT_URL);
    expect(script.async).toBeTrue();

    installSdk();
    script.dispatchEvent(new Event('load'));

    await expectAsync(first).toBeResolvedTo(identity as unknown as GoogleIdentity);
    await expectAsync(second).toBeResolvedTo(identity as unknown as GoogleIdentity);
  });

  it('rejects when the script fails and allows a retry', async () => {
    const failed = service.load();
    injectedScript()!.dispatchEvent(new Event('error'));

    await expectAsync(failed).toBeRejected();

    const retried = service.load();
    expect(injectedScripts.length).toBe(2);

    installSdk();
    injectedScript()!.dispatchEvent(new Event('load'));
    await expectAsync(retried).toBeResolved();
  });

  it('rejects when the script loads but does not expose google.accounts.id', async () => {
    const pending = service.load();

    injectedScript()!.dispatchEvent(new Event('load'));

    await expectAsync(pending).toBeRejected();
  });

  it('initializes the SDK once with the configured client id and re-enters the Angular zone', async () => {
    installSdk();
    const onCredential = jasmine.createSpy('onCredential').and.callFake(() => {
      expect(NgZone.isInAngularZone()).toBeTrue();
    });

    await service.initialize(onCredential);
    await service.initialize(onCredential);

    expect(identity.initialize).toHaveBeenCalledTimes(1);
    const config = identity.initialize.calls.mostRecent().args[0];
    expect(config.client_id).toBe(environment.googleClientId);
    expect(config.ux_mode).toBe('popup');

    config.callback?.({ credential: 'id-token', select_by: 'btn' });
    expect(onCredential).toHaveBeenCalledOnceWith('id-token');
  });

  it('routes credentials to the most recently registered handler and drops released ones', async () => {
    installSdk();
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');

    await service.initialize(first);
    await service.initialize(second);
    const config = identity.initialize.calls.mostRecent().args[0];

    config.callback?.({ credential: 'token-1', select_by: 'btn' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnceWith('token-1');

    service.release(first);
    config.callback?.({ credential: 'token-2', select_by: 'btn' });
    expect(second).toHaveBeenCalledWith('token-2');

    service.release(second);
    expect(() => config.callback?.({ credential: 'token-3', select_by: 'btn' })).not.toThrow();
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('lets initialize be retried after the script failed to load', async () => {
    const failed = service.initialize(() => undefined);
    injectedScript()!.dispatchEvent(new Event('error'));
    await expectAsync(failed).toBeRejected();

    installSdk();
    await expectAsync(service.initialize(() => undefined)).toBeResolved();
    expect(identity.initialize).toHaveBeenCalledTimes(1);
  });

  it('clears the host before rendering the button into it', () => {
    installSdk();
    const parent = document.createElement('div');
    parent.innerHTML = '<span>old</span>';

    service.renderButton(parent, { type: 'standard', text: 'continue_with' });

    expect(parent.childElementCount).toBe(0);
    expect(identity.renderButton).toHaveBeenCalledOnceWith(parent, { type: 'standard', text: 'continue_with' });
  });

  it('refuses to render before the SDK is loaded', () => {
    expect(() => service.renderButton(document.createElement('div'), { type: 'standard' })).toThrow();
  });

  it('disables auto select only when the SDK is loaded', () => {
    expect(() => service.disableAutoSelect()).not.toThrow();

    installSdk();
    service.disableAutoSelect();

    expect(identity.disableAutoSelect).toHaveBeenCalledTimes(1);
  });
});
