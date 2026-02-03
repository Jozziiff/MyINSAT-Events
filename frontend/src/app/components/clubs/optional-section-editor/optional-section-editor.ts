import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
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
  templateUrl: './optional-section-editor.html',
  styleUrl: './optional-section-editor.css',
  animations: [fadeSlideIn],
  changeDetection: ChangeDetectionStrategy.OnPush
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
