import { Component, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubsService } from '../../services/clubs.service';
import { CreateClubDto, ClubSection, ClubContact, Club } from '../../models/club.model';
import { fadeSlideIn } from '../../animations';

interface SectionForm {
  enabled: boolean;
  title: string;
  content: string;
  imageUrl: string;
  imageFile: File | null;
  imagePreview: string;
}

interface EnabledSection extends SectionForm {
  key: string;
}

// Default images for preview (should match backend defaults)
const DEFAULT_IMAGES = {
  about: 'http://localhost:3000/uploads/defaults/about-default.jpg',
  history: 'http://localhost:3000/uploads/defaults/history-default.jpg',
  mission: 'http://localhost:3000/uploads/defaults/mission-default.jpg',
  activities: 'http://localhost:3000/uploads/defaults/activities-default.jpg',
  achievements: 'http://localhost:3000/uploads/defaults/achievements-default.jpg',
  joinUs: 'http://localhost:3000/uploads/defaults/join-default.jpg',
};

@Component({
  selector: 'app-club-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './club-form.html',
  styleUrl: './club-form.css',
  animations: [fadeSlideIn]
})
export class ClubFormComponent implements OnInit {
  // Default images for preview
  defaultImages = DEFAULT_IMAGES;

  // Edit mode
  isEditMode = false;
  clubId: number | null = null;
  loadingClub = signal(false);

  // Form state
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Required fields
  name = '';
  shortDescription = '';
  about = '';

  // Image fields - simplified without toggle
  logoUrl = '';
  logoFile: File | null = null;
  logoPreview = '';

  coverUrl = '';
  coverFile: File | null = null;
  coverPreview = '';

  aboutImageUrl = '';
  aboutImageFile: File | null = null;
  aboutImagePreview = '';

  // Optional sections
  sections: { [key: string]: SectionForm } = {
    history: { enabled: false, title: 'Our History', content: '', imageUrl: '', imageFile: null, imagePreview: '' },
    mission: { enabled: false, title: 'Our Mission', content: '', imageUrl: '', imageFile: null, imagePreview: '' },
    activities: { enabled: false, title: 'What We Do', content: '', imageUrl: '', imageFile: null, imagePreview: '' },
    achievements: { enabled: false, title: 'Achievements', content: '', imageUrl: '', imageFile: null, imagePreview: '' },
    joinUs: { enabled: false, title: 'Join Us', content: '', imageUrl: '', imageFile: null, imagePreview: '' },
  };

  // Contact info
  contact: ClubContact = {
    email: '',
    phone: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    website: '',
  };

  constructor(
    private clubsService: ClubsService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Check if we're in edit mode by looking for :id param
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
    } catch (err) {
      this.error.set('Failed to load club data');
    } finally {
      this.loadingClub.set(false);
    }
  }

  private populateForm(club: Club) {
    this.name = club.name;
    this.shortDescription = club.shortDescription;
    this.about = club.about;
    this.logoUrl = club.logoUrl || '';
    this.coverUrl = club.coverImageUrl || '';
    this.aboutImageUrl = club.aboutImageUrl || '';

    // Populate sections
    const sectionKeys = ['history', 'mission', 'activities', 'achievements', 'joinUs'] as const;
    for (const key of sectionKeys) {
      const section = club[key];
      if (section) {
        this.sections[key] = {
          enabled: true,
          title: section.title,
          content: section.content,
          imageUrl: section.imageUrl || '',
          imageFile: null,
          imagePreview: ''
        };
      }
    }

    // Populate contact
    if (club.contact) {
      this.contact = { ...this.contact, ...club.contact };
    }

    this.cdr.detectChanges();
  }

  // Preview helper methods
  getPreviewLogo(): string {
    return this.logoPreview || this.logoUrl;
  }

  getPreviewCover(): string {
    return this.coverPreview || this.coverUrl;
  }

  getPreviewAboutImage(): string {
    return this.aboutImagePreview || this.aboutImageUrl;
  }

  getEnabledSections(): EnabledSection[] {
    return Object.entries(this.sections)
      .filter(([_, section]) => section.enabled)
      .map(([key, section]) => ({ ...section, key }));
  }

  hasAnyContact(): boolean {
    return Object.values(this.contact).some(v => !!v?.trim());
  }

  hasAnyContent(): boolean {
    return !!(
      this.name || 
      this.shortDescription || 
      this.about || 
      this.getPreviewLogo() || 
      this.getPreviewCover() ||
      this.getEnabledSections().length > 0 ||
      this.hasAnyContact()
    );
  }

  // Handle file selection
  onFileSelected(event: Event, target: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const preview = e.target?.result as string;

      if (target === 'logo') {
        this.logoFile = file;
        this.logoPreview = preview;
      } else if (target === 'cover') {
        this.coverFile = file;
        this.coverPreview = preview;
      } else if (target === 'about') {
        this.aboutImageFile = file;
        this.aboutImagePreview = preview;
      } else if (this.sections[target]) {
        this.sections[target].imageFile = file;
        this.sections[target].imagePreview = preview;
      }

      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
  }

  // Upload image and get URL
  private async uploadIfNeeded(file: File | null, url: string): Promise<string> {
    if (file) {
      const uploadedUrl = await this.clubsService.uploadImage(file);
      return uploadedUrl || '';
    }
    return url;
  }

  async onSubmit() {
    // Validation
    if (!this.name.trim()) {
      this.error.set('Club name is required');
      return;
    }
    if (!this.shortDescription.trim()) {
      this.error.set('Short description is required');
      return;
    }
    if (!this.about.trim()) {
      this.error.set('About section is required');
      return;
    }
    if (!this.logoFile && !this.logoUrl.trim()) {
      this.error.set('Club logo is required');
      return;
    }
    if (!this.coverFile && !this.coverUrl.trim()) {
      this.error.set('Cover image is required');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      // Upload images
      const logoUrl = await this.uploadIfNeeded(this.logoFile, this.logoUrl);
      const coverUrl = await this.uploadIfNeeded(this.coverFile, this.coverUrl);
      const aboutImageUrl = await this.uploadIfNeeded(this.aboutImageFile, this.aboutImageUrl);

      // Build club data (logoUrl and coverImageUrl are required, validated above)
      const clubData: CreateClubDto = {
        name: this.name.trim(),
        shortDescription: this.shortDescription.trim(),
        about: this.about.trim(),
        logoUrl: logoUrl, // Required
        coverImageUrl: coverUrl, // Required
        aboutImageUrl: aboutImageUrl || undefined, // Optional
      };

      // Add enabled sections
      for (const [key, section] of Object.entries(this.sections)) {
        if (section.enabled && section.content.trim()) {
          const imageUrl = await this.uploadIfNeeded(section.imageFile, section.imageUrl);
          (clubData as any)[key] = {
            title: section.title.trim(),
            content: section.content.trim(),
            imageUrl: imageUrl || undefined,
          } as ClubSection;
        }
      }

      // Add contact if any field is filled
      const hasContact = Object.values(this.contact).some(v => v && v.trim());
      if (hasContact) {
        clubData.contact = {};
        for (const [key, value] of Object.entries(this.contact)) {
          if (value && value.trim()) {
            (clubData.contact as any)[key] = value.trim();
          }
        }
      }

      // Create or update club
      let result: Club | null;
      if (this.isEditMode && this.clubId) {
        result = await this.clubsService.updateClub(this.clubId, clubData);
      } else {
        result = await this.clubsService.createClub(clubData);
      }

      if (result) {
        this.success.set(true);
        setTimeout(() => {
          this.router.navigate(['/clubs', result!.id]);
        }, 1500);
      } else {
        this.error.set(this.clubsService.error() || `Failed to ${this.isEditMode ? 'update' : 'create'} club`);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      this.submitting.set(false);
    }
  }

  getSectionKeys(): string[] {
    return Object.keys(this.sections);
  }

  getSectionLabel(key: string): string {
    const labels: { [key: string]: string } = {
      history: 'History',
      mission: 'Mission',
      activities: 'Activities',
      achievements: 'Achievements',
      joinUs: 'Join Us',
    };
    return labels[key] || key;
  }

  getDefaultImageForSection(key: string): string {
    return (DEFAULT_IMAGES as any)[key] || DEFAULT_IMAGES.about;
  }
}
