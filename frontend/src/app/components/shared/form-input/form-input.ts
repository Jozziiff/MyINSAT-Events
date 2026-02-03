import { Component, Input, forwardRef } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type InputType = 'text' | 'email' | 'tel' | 'url' | 'textarea';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-group" [class.has-char-count]="maxLength">
      <label [for]="inputId">{{ label }}{{ required ? ' *' : '' }}</label>
      @if (type === 'textarea') {
        <textarea
          [id]="inputId"
          [ngModel]="value"
          (ngModelChange)="onValueChange($event)"
          [placeholder]="placeholder"
          [rows]="rows"
          [required]="required"
        ></textarea>
      } @else {
        <input
          [type]="type"
          [id]="inputId"
          [ngModel]="value"
          (ngModelChange)="onValueChange($event)"
          [placeholder]="placeholder"
          [maxlength]="maxLength ?? null"
          [required]="required"
        >
      }
      @if (maxLength) {
        <span class="char-count">{{ value.length }}/{{ maxLength }}</span>
      }
      @if (hint) {
        <span class="field-hint">{{ hint }}</span>
      }
    </div>
  `,
  styles: [`
    .form-group {
      margin-bottom: 1.25rem;
      position: relative;
    }

    .form-group.has-char-count {
      position: relative;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 0.4rem;
    }

    input, textarea {
      width: 100%;
      padding: 0.75rem 0.875rem;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.95rem;
      transition: all var(--transition-base);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
    }

    textarea {
      resize: vertical;
      min-height: 80px;
    }

    .char-count {
      position: absolute;
      right: 0;
      top: 0;
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }

    .field-hint {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  `],
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
