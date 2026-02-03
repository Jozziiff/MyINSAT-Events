import { Component, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubsService } from '../../services/clubs.service';
import { CreateClubDto, ClubSection, ClubContact, Club } from '../../models/club.model';
import { fadeSlideIn } from '../../animations';
import {
  ImageUploadFieldComponent,
  ClubPreviewComponent,
  ContactFormSectionComponent,
  OptionalSectionEditorComponent,
  DEFAULT_SECTION_IMAGES,
  SectionFormData,
  SectionConfig
} from '../../components/clubs';
import type { PreviewSection } from '../../components/clubs';
import { FormInputComponent } from '../../components/shared/form-input/form-input';

// Section configurations
const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'history', label: 'History', defaultTitle: 'Our History' },
  { key: 'mission', label: 'Mission', defaultTitle: 'Our Mission' },
  { key: 'activities', label: 'Activities', defaultTitle: 'What We Do' },
  { key: 'achievements', label: 'Achievements', defaultTitle: 'Achievements' },
  { key: 'joinUs', label: 'Join Us', defaultTitle: 'Join Us' }
];

const createEmptySection = (defaultTitle: string): SectionFormData => ({
  enabled: false,
  title: defaultTitle,
  content: '',
  imageUrl: '',
  imageFile: null,
  imagePreview: ''
});

@Component({
  selector: 'app-club-form',
  imports: [
    FormsModule,
    RouterLink,
    FormInputComponent,
    ImageUploadFieldComponent,
    ClubPreviewComponent,
    ContactFormSectionComponent,
    OptionalSectionEditorComponent
  ],
  templateUrl: './club-form.html',
  styleUrl: './club-form.css',
  animations: [fadeSlideIn]
})
export class ClubFormComponent implements OnInit {
  // Constants
  readonly defaultImages = DEFAULT_SECTION_IMAGES;
  readonly sectionConfigs = SECTION_CONFIGS;
  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = Array.from({ length: this.currentYear - 1899 }, (_, i) => this.currentYear - i);

  // Mode
  isEditMode = false;
  clubId: number | null = null;

  // State signals
  loadingClub = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Basic info
  name = '';
  shortDescription = '';
  about = '';
  foundedYear: number | null = null;

  // Images
  images = {
    logo: { url: '', file: null as File | null, preview: '' },
    cover: { url: '', file: null as File | null, preview: '' },
    about: { url: '', file: null as File | null, preview: '' }
  };

  // Sections
  sections: Record<string, SectionFormData> = {};

  // Contact
  contact: ClubContact = {};

  constructor(
    private clubsService: ClubsService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeSections();
  }

  private initializeSections(): void {
    for (const config of SECTION_CONFIGS) {
      this.sections[config.key] = createEmptySection(config.defaultTitle);
    }
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.clubId = parseInt(idParam, 10);
      this.loadClubData();
    }
  }

  async loadClubData() {
    if (!this.clubId) return;

    this.loadingClub.set(true);
    try {
      const club = await this.clubsService.getClubById(this.clubId);
      if (club) {
        this.populateForm(club);
      } else {
        this.error.set('Club not found');
      }
    } catch {
      this.error.set('Failed to load club data');
    } finally {
      this.loadingClub.set(false);
    }
  }

  private populateForm(club: Club) {
    this.name = club.name;
    this.shortDescription = club.shortDescription;
    this.about = club.about;
    this.foundedYear = club.foundedYear || null;
    
    this.images.logo.url = club.logoUrl || '';
    this.images.cover.url = club.coverImageUrl || '';
    this.images.about.url = club.aboutImageUrl || '';

    for (const config of SECTION_CONFIGS) {
      const section = club[config.key as keyof Club] as ClubSection | undefined;
      if (section) {
        this.sections[config.key] = {
          enabled: true,
          title: section.title,
          content: section.content,
          imageUrl: section.imageUrl || '',
          imageFile: null,
          imagePreview: ''
        };
      }
    }

    if (club.contact) {
      this.contact = { ...club.contact };
    }

    this.cdr.detectChanges();
  }

  // Image handling
  onImageFileSelected(file: File, target: 'logo' | 'cover' | 'about') {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.images[target].file = file;
      this.images[target].preview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onSectionImageSelected(file: File, sectionKey: string) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.sections[sectionKey].imageFile = file;
      this.sections[sectionKey].imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  // Preview helpers
  getEnabledSections(): PreviewSection[] {
    return SECTION_CONFIGS
      .filter(config => this.sections[config.key].enabled)
      .map(config => {
        const section = this.sections[config.key];
        return {
          key: config.key,
          title: section.title,
          content: section.content,
          imageUrl: section.imageUrl,
          imagePreview: section.imagePreview
        };
      });
  }

  // Form submission
  async onSubmit() {
    const validationError = this.validateForm();
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const clubData = await this.buildClubData();
      const result = this.isEditMode && this.clubId
        ? await this.clubsService.updateClub(this.clubId, clubData)
        : await this.clubsService.createClub(clubData);

      if (result) {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/clubs', result.id]), 1500);
      } else {
        this.error.set(this.clubsService.error() || `Failed to ${this.isEditMode ? 'update' : 'create'} club`);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      this.submitting.set(false);
    }
  }

  private validateForm(): string | null {
    if (!this.name.trim()) return 'Club name is required';
    if (!this.shortDescription.trim()) return 'Short description is required';
    if (!this.about.trim()) return 'About section is required';
    if (!this.images.logo.file && !this.images.logo.url.trim()) return 'Club logo is required';
    if (!this.images.cover.file && !this.images.cover.url.trim()) return 'Cover image is required';
    return null;
  }

  private async buildClubData(): Promise<CreateClubDto> {
    const [logoUrl, coverUrl, aboutImageUrl] = await Promise.all([
      this.uploadIfNeeded(this.images.logo.file, this.images.logo.url),
      this.uploadIfNeeded(this.images.cover.file, this.images.cover.url),
      this.uploadIfNeeded(this.images.about.file, this.images.about.url)
    ]);

    const clubData: CreateClubDto = {
      name: this.name.trim(),
      shortDescription: this.shortDescription.trim(),
      about: this.about.trim(),
      logoUrl,
      coverImageUrl: coverUrl,
      aboutImageUrl: aboutImageUrl || undefined,
      foundedYear: this.foundedYear || undefined
    };

    // Add sections
    for (const config of SECTION_CONFIGS) {
      const section = this.sections[config.key];
      if (section.enabled && section.content.trim()) {
        const imageUrl = await this.uploadIfNeeded(section.imageFile, section.imageUrl);
        (clubData as any)[config.key] = {
          title: section.title.trim(),
          content: section.content.trim(),
          imageUrl: imageUrl || undefined
        } as ClubSection;
      }
    }

    // Add contact
    const hasContact = Object.values(this.contact).some(v => v?.trim());
    if (hasContact) {
      clubData.contact = Object.fromEntries(
        Object.entries(this.contact).filter(([_, v]) => v?.trim())
      ) as ClubContact;
    }

    return clubData;
  }

  private async uploadIfNeeded(file: File | null, url: string): Promise<string> {
    if (file) {
      return await this.clubsService.uploadImage(file) || '';
    }
    return url;
  }
}
