import { TestBed } from '@angular/core/testing';

import { CategoryIconPipe } from './category-icon.pipe';

describe('CategoryIconPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({});
    const pipe = TestBed.runInInjectionContext(() => new CategoryIconPipe());
    expect(pipe).toBeTruthy();
  });
});
