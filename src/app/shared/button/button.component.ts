import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass, MatButtonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  disabled = input<boolean>(false);
  id = input<string>('');
  label = input<string>('Click');
  appearance = input<'filled' | 'outlined' | 'tonal'>('filled');
  buttonClass = input<string>('');
  typeBtn = input<'button' | 'submit' | 'reset'>('button');

  clicked = output<void>();
}
