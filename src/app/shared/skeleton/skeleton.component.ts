import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>('16px');
  readonly borderRadius = input<string>('8px');
  readonly circle = input<boolean>(false);

  normalizeSize(value: string | number): string {
    return typeof value === 'number' ? `${value}px` : value;
  }
}
