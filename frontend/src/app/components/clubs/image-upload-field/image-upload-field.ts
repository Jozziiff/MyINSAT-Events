import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './image-upload-field.html',
  styleUrl: './image-upload-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadFieldComponent),
      multi: true
    }
  ]
})
export class ImageUploadFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() inputId = '';
  @Input() placeholder = 'https://example.com/image.png';
  @Input() preview = '';
  @Input() size: 'normal' | 'wide' | 'small' = 'normal';
  @Input() required = false;

  @Output() fileSelected = new EventEmitter<File>();

  url = '';
  
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.url = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onUrlChange(value: string): void {
    this.url = value;
    this.onChange(value);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
      this.onTouched();
    }
  }

  get uploadBtnClass(): string {
    const classes = ['upload-btn'];
    if (this.size === 'wide') classes.push('wide');
    if (this.size === 'small') classes.push('small');
    return classes.join(' ');
  }

  get thumbClass(): string {
    const classes = ['preview-thumb'];
    if (this.size === 'wide') classes.push('wide');
    if (this.size === 'small') classes.push('small');
    return classes.join(' ');
  }
}
