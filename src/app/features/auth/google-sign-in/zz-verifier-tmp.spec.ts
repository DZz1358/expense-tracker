import { afterNextRender, afterRenderEffect, Component, computed, signal, untracked, ɵAfterRenderManager as AfterRenderManager, ɵSIGNAL as SIGNAL } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/* eslint-disable @typescript-eslint/no-explicit-any */
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const source = signal('en');
const derived = computed(() => source() + '!');
const status = signal<'loading' | 'ready'>('loading');
const width = signal(200);
let runs = 0;
let lastLocale = '';

@Component({ selector: 'app-zz-probe2', template: '<div></div>' })
class Probe2Component {
  constructor() {
    afterNextRender(async () => {
      await Promise.resolve();
      width.set(400);
      status.set('ready');
    });
    afterRenderEffect({
      write: () => {
        runs++;
        if (status() !== 'ready') return;
        lastLocale = untracked(() => derived());
        width();
      },
    });
  }
}

describe('ZZ verifier probe 7', () => {
  it('computed read inside untracked after an early-returning first run', async () => {
    runs = 0;
    await TestBed.configureTestingModule({ imports: [Probe2Component] }).compileComponents();
    const fixture = TestBed.createComponent(Probe2Component);
    fixture.detectChanges();
    await fixture.whenStable(); await tick(); fixture.detectChanges();
    const mgr = TestBed.inject(AfterRenderManager) as any;
    const seq = [...(mgr.impl.sequences as Set<any>)].find((s) => s.nodes && s.nodes.some((n: any) => n));
    const node = seq.nodes.find((n: any) => n);
    const links = () => { const out: string[] = []; for (let l = node.producers; l !== undefined; l = l.nextProducer) out.push(l.producer === status[SIGNAL] ? 'status' : l.producer === width[SIGNAL] ? 'width' : l.producer === derived[SIGNAL] ? 'DERIVED' : l.producer === source[SIGNAL] ? 'SOURCE' : '?'); return out; };
    const runsBefore = runs;
    console.log('ZZ p7: after settle producers', JSON.stringify(links()), 'runs', runs, 'lastLocale', lastLocale);
    source.set('uk');
    await fixture.whenStable(); await tick(); fixture.detectChanges();
    console.log('ZZ p7: after source change producers', JSON.stringify(links()), 'runs', runsBefore, '->', runs, 'lastLocale', lastLocale);
    expect(true).toBeTrue();
  });
});
