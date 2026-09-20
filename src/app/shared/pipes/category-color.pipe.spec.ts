import { TestBed } from '@angular/core/testing';

import { CategoryColorPipe } from './category-color.pipe';

describe('CategoryColorPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({});
    const pipe = TestBed.runInInjectionContext(() => new CategoryColorPipe());
    expect(pipe).toBeTruthy();
  });
});
