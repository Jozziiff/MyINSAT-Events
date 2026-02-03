import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageUploadFieldComponent } from '../image-upload-field/image-upload-field';
import { fadeSlideIn } from '../../../animations';

export interface SectionFormData {
  enabled: boolean;
  title: string;
  content: string;
  imageUrl: string;
  imageFile: File | null;
  imagePreview: string;
}

export interface SectionConfig {
  key: string;
  label: string;
  defaultTitle: string;
}

@Component({
  selector: 'app-optional-section-editor',
  standalone: true,
  imports: [FormsModule, ImageUploadFieldComponent],
  animations: [fadeSlideIn],
  template: `
    <div class="optional-section" [class.enabled]="section.enabled">
      <div class="section-toggle">
        <label class="toggle-switch">
          <input
            type="checkbox"
            [ngModel]="section.enabled"
            (ngModelChange)="onToggle($event)">
          <span class="slider"></span>
        </label>
        <span class="toggle-label">{{ config.label }}</span>
      </div>

      @if (section.enabled) {
        <div class="section-fields" @fadeSlideIn>
          <div class="form-group">
            <label>Title</label>
            <input
              type="text"
              [ngModel]="section.title"
              (ngModelChange)="onTitleChange($event)"
              [placeholder]="'e.g., ' + config.label"
            >
          </div>

          <div class="form-group">
            <label>Content</label>
            <textarea
              [ngModel]="section.content"
              (ngModelChange)="onContentChange($event)"
              placeholder="Write about this section..."
              rows="3"
            ></textarea>
          </div>

          <app-image-upload-field
            label="Image (optional)"
            [inputId]="config.key"
            placeholder="Image URL"
            [preview]="section.imagePreview"
            [ngModel]="section.imageUrl"
            (ngModelChange)="onImageUrlChange($event)"
            (fileSelected)="onFileSelected($event)"
            size="small">
          </app-image-upload-field>
        </div>
      }
    </div>
  `,
  styles: [`
    .optional-section {
      padding: 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      margin-bottom: 0.75rem;
      transition: all var(--transition-base);

      &.enabled {
        border-color: var(--color-primary);
        background: rgba(99, 102, 241, 0.02);
      }
    }

    .section-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toggle-label {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: 0.95rem;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 42px;
      height: 24px;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .slider {
          background: var(--color-primary);

          &::before {
            transform: translateX(18px);
          }
        }
      }

      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: var(--color-border);
        border-radius: 24px;
        transition: all var(--transition-base);

        &::before {
          content: '';
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: all var(--transition-base);
        }
      }
    }

    .section-fields {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .form-group {
      margin-bottom: 1rem;

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
    }
  `]
})
export class OptionalSectionEditorComponent {
  @Input() config!: SectionConfig;
  @Input() section: SectionFormData = {
    enabled: false,
    title: '',
    content: '',
    imageUrl: '',
    imageFile: null,
    imagePreview: ''
  };

  @Output() sectionChange = new EventEmitter<SectionFormData>();
  @Output() fileSelected = new EventEmitter<File>();

  private emitChange(partial: Partial<SectionFormData>): void {
    this.section = { ...this.section, ...partial };
    this.sectionChange.emit(this.section);
  }

  onToggle(enabled: boolean): void {
    this.emitChange({ enabled });
  }

  onTitleChange(title: string): void {
    this.emitChange({ title });
  }

  onContentChange(content: string): void {
    this.emitChange({ content });
  }

  onImageUrlChange(imageUrl: string): void {
    this.emitChange({ imageUrl });
  }

  onFileSelected(file: File): void {
    this.fileSelected.emit(file);
  }
}
