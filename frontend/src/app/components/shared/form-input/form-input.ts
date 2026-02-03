import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type InputType = 'text' | 'email' | 'tel' | 'url' | 'textarea';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './form-input.html',
  styleUrl: './form-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true
    }
  ]
})
export class FormInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() inputId = '';
  @Input() type: InputType = 'text';
  @Input() placeholder = '';
  @Input() maxLength?: number;
  @Input() rows = 4;
  @Input() required = false;
  @Input() hint = '';

  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }
}
