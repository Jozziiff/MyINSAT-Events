import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-club-section-row',
  standalone: true,
  templateUrl: './club-section-row.html',
  styleUrl: './club-section-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubSectionRowComponent {
  @Input() title = '';
  @Input() content = '';
  @Input() imageUrl = '';
  @Input() defaultImage = '';
  @Input() reversed = false;
  @Input() isPreview = false;
  @Input() showPlaceholder = false;

  get displayImage(): string {
    return this.imageUrl || this.defaultImage;
  }

  get displayTitle(): string {
    return this.title || 'Section Title';
  }

  get displayContent(): string {
    return this.content || 'Content for this section will appear here...';
  }

  get hasContent(): boolean {
    return !!this.content;
  }
}
