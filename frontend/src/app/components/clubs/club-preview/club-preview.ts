import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ClubContact, ClubSection } from '../../../models/club.model';
import { ClubHeroComponent } from '../club-hero/club-hero';
import { ClubSectionRowComponent } from '../club-section-row/club-section-row';
import { ClubContactSectionComponent } from '../club-contact-section/club-contact-section';

// Default placeholder images for preview
export const DEFAULT_SECTION_IMAGES = {
  about: 'https://picsum.photos/seed/about/800/600',
  history: 'https://picsum.photos/seed/history/800/600',
  mission: 'https://picsum.photos/seed/mission/800/600',
  activities: 'https://picsum.photos/seed/activities/800/600',
  achievements: 'https://picsum.photos/seed/achievements/800/600',
  joinUs: 'https://picsum.photos/seed/joinus/800/600',
};

export interface PreviewSection {
  key: string;
  title: string;
  content: string;
  imageUrl: string;
  imagePreview: string;
}

@Component({
  selector: 'app-club-preview',
  standalone: true,
  imports: [ClubHeroComponent, ClubSectionRowComponent, ClubContactSectionComponent],
  templateUrl: './club-preview.html',
  styleUrl: './club-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubPreviewComponent {
  @Input() name = '';
  @Input() tagline = '';
  @Input() about = '';
  @Input() logoUrl = '';
  @Input() logoPreview = '';
  @Input() coverUrl = '';
  @Input() coverPreview = '';
  @Input() aboutImageUrl = '';
  @Input() aboutImagePreview = '';
  @Input() sections: PreviewSection[] = [];
  @Input() contact: ClubContact | null = null;

  defaultImages = DEFAULT_SECTION_IMAGES;

  get previewLogo(): string {
    return this.logoPreview || this.logoUrl;
  }

  get previewCover(): string {
    return this.coverPreview || this.coverUrl;
  }

  get previewAboutImage(): string {
    return this.aboutImagePreview || this.aboutImageUrl || this.defaultImages.about;
  }

  get hasAnyContent(): boolean {
    return !!(
      this.name ||
      this.tagline ||
      this.about ||
      this.previewLogo ||
      this.previewCover ||
      this.sections.length > 0 ||
      this.hasContact
    );
  }

  get hasContact(): boolean {
    if (!this.contact) return false;
    return Object.values(this.contact).some(v => !!v?.trim());
  }

  getSectionImage(section: PreviewSection): string {
    return section.imagePreview || section.imageUrl || this.getDefaultImageForSection(section.key);
  }

  getDefaultImageForSection(key: string): string {
    return (DEFAULT_SECTION_IMAGES as any)[key] || DEFAULT_SECTION_IMAGES.about;
  }
}
