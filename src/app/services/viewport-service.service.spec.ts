import { TestBed } from '@angular/core/testing';

import { ViewportServiceService } from './viewport-service.service';

describe('ViewportServiceService', () => {
  let service: ViewportServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewportServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
