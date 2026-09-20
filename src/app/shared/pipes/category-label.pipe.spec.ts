import { TestBed } from '@angular/core/testing';

import { CategoryLabelPipe } from './category-label.pipe';

describe('CategoryLabelPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({});
    const pipe = TestBed.runInInjectionContext(() => new CategoryLabelPipe());
    expect(pipe).toBeTruthy();
  });
});
