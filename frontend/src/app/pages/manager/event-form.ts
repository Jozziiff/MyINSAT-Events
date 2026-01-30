import { Component, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService } from '../../services/manager-api.service';
import { resolveImageUrl, getApiUrl } from '../../utils/image.utils';

const API_URL = getApiUrl();

interface EventSection {
    title: string;
    description: string;
    imageUrl?: string;
}

interface SectionForm {
    enabled: boolean;
    title: string;
    description: string;
    imageUrl: string;
    imageFile: File | null;
    imagePreview: string;
}

interface EnabledSection extends SectionForm {
    key: string;
}

const DEFAULT_SECTION_IMAGE = `${API_URL}/uploads/defaults/activities-default.jpg`;

@Component({
    selector: 'app-event-form',
    imports: [FormsModule, RouterLink],
    templateUrl: './event-form.html',
    styleUrl: './event-form.css',
    animations: [fadeSlideIn]
})
export class EventFormComponent implements OnInit {
    // Form state
    submitting = signal(false);
    error = signal<string | null>(null);
    success = signal(false);
    loadingEvent = signal(false);

    isEditMode = signal(false);
    eventId = signal<number | null>(null);
    clubId = signal<number | null>(null);
    // Required fields
    title = '';
    description = '';
    location = '';
    startTime = '';
    endTime = '';
    minEndTime = '';
    capacity = 30;
    price = 0;

    // Cover image
    coverUrl = '';
    coverFile: File | null = null;
    coverPreview = '';

    // Optional sections
    sections: { [key: string]: SectionForm } = {
        details: { enabled: false, title: 'Event Details', description: '', imageUrl: '', imageFile: null, imagePreview: '' },
        schedule: { enabled: false, title: 'Schedule', description: '', imageUrl: '', imageFile: null, imagePreview: '' },
        speakers: { enabled: false, title: 'Speakers', description: '', imageUrl: '', imageFile: null, imagePreview: '' },
        requirements: { enabled: false, title: 'Requirements', description: '', imageUrl: '', imageFile: null, imagePreview: '' },
        prizes: { enabled: false, title: 'Prizes', description: '', imageUrl: '', imageFile: null, imagePreview: '' },
    };

    constructor(
        private managerApi: ManagerApiService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        const clubIdParam = this.route.snapshot.paramMap.get('clubId');
        if (clubIdParam) {
            this.clubId.set(+clubIdParam);
        }

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.eventId.set(+id);
            this.loadEvent(+id);
        }
    }

    loadEvent(id: number) {
        this.loading.set(true);
        const clubId = this.clubId();
        if (!clubId) {
            this.error.set('Club ID not found');
            this.loading.set(false);
            return;
        }
        this.managerApi.getClubEvents(clubId).subscribe({
            next: (events) => {
                const event = events.find(e => e.id === id);
                if (event) {
                    this.eventForm.patchValue({
                        title: event.title,
                        description: event.description,
                        location: event.location,
                        startTime: this.formatDateForInput(event.startTime),
                        endTime: this.formatDateForInput(event.endTime),
                        capacity: event.capacity,
                        price: event.price || 0
                    });

                    if (event.photoUrl) {
                        this.coverImageUrl.set(resolveImageUrl(event.photoUrl) || '');
                    }

                if (event.sections && Array.isArray(event.sections)) {
                    const sectionKeys = Object.keys(this.sections);
                    event.sections.forEach((section, idx) => {
                        if (idx < sectionKeys.length) {
                            const key = sectionKeys[idx];
                            this.sections[key] = {
                                enabled: true,
                                title: section.title,
                                description: section.description,
                                imageUrl: section.imageUrl || '',
                                imageFile: null,
                                imagePreview: ''
                            };
                        }
                    });
                }

                this.cdr.detectChanges();
            } else {
                this.error.set('Event not found');
            }
        } catch (err) {
            this.error.set('Failed to load event');
        } finally {
            this.loadingEvent.set(false);
        }
    }

    formatDateForInput(dateString: string): string {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }

    // Handle start time change - auto-set end time to 2 hours later
    onStartTimeChange() {
        if (!this.startTime) {
            this.minEndTime = '';
            return;
        }

        const startDate = new Date(this.startTime);

        // Set minimum end time to start time
        this.minEndTime = this.startTime;

        // Auto-set end time to 2 hours after start if end time is not set or is before start
        if (!this.endTime || new Date(this.endTime) <= startDate) {
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2);
            this.endTime = endDate.toISOString().slice(0, 16);
        }

        this.cdr.detectChanges();
    }

    // Get minimum start time (current time)
    getMinStartTime(): string {
        const now = new Date();
        return now.toISOString().slice(0, 16);
    }

    // Preview helpers
    getPreviewCover(): string {
        return this.coverPreview || this.coverUrl;
    }

    getEnabledSections(): EnabledSection[] {
        return Object.entries(this.sections)
            .filter(([_, section]) => section.enabled)
            .map(([key, section]) => ({ ...section, key }));
    }

    hasAnyContent(): boolean {
        return !!(
            this.title ||
            this.description ||
            this.location ||
            this.getPreviewCover() ||
            this.getEnabledSections().length > 0
        );
    }

    // Handle file selection
    onFileSelected(event: Event, target: string) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];

        // Validate file type
        if (!file.type.match(/image\/(jpg|jpeg|png|gif|webp)/)) {
            this.error.set('Please select a valid image file (JPG, PNG, GIF, WebP)');
            input.value = '';
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.error.set('Image must be smaller than 5MB');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = e.target?.result as string;

            if (target === 'cover') {
                this.coverFile = file;
                this.coverPreview = preview;
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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('event', 'event');

            try {
                const response = await fetch(`${API_URL}/upload/image`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();
                let imageUrl = data.url;

                // Make sure URL is absolute
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${API_URL}${imageUrl}`;
                }

                return imageUrl || '';
            } catch (err) {
                throw new Error('Failed to upload image');
            }
        }
        return url;
    }

    async onSubmit() {
        // Validation
        if (!this.title.trim()) {
            this.error.set('Event title is required');
            return;
        }
        if (this.title.trim().length < 3) {
            this.error.set('Title must be at least 3 characters');
            return;
        }
        if (!this.location.trim()) {
            this.error.set('Event location is required');
            return;
        }
        if (!this.startTime) {
            this.error.set('Start time is required');
            return;
        }
        if (!this.endTime) {
            this.error.set('End time is required');
            return;
        }
        if (new Date(this.endTime) <= new Date(this.startTime)) {
            this.error.set('End time must be after start time');
            return;
        }
        if (this.capacity < 1) {
            this.error.set('Capacity must be at least 1');
            return;
        }
        if (this.price < 0) {
            this.error.set('Price cannot be negative');
            return;
        }

        this.submitting.set(true);
        this.error.set(null);

        try {
            // Upload cover image
            let photoUrl = await this.uploadIfNeeded(this.coverFile, this.coverUrl);

            // Convert to relative URL if needed
            if (photoUrl && photoUrl.startsWith(API_URL)) {
                photoUrl = photoUrl.replace(API_URL, '');
            }

            // Build event data
            const eventData: any = {
                clubId: this.clubId(),
                title: this.title.trim(),
                description: this.description.trim() || undefined,
                location: this.location.trim(),
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(this.endTime).toISOString(),
                capacity: this.capacity,
                price: this.price,
                photoUrl: photoUrl || undefined,
            };

            // Add enabled sections
            const enabledSections: EventSection[] = [];
            for (const [key, section] of Object.entries(this.sections)) {
                if (section.enabled && section.description.trim()) {
                    const imageUrl = await this.uploadIfNeeded(section.imageFile, section.imageUrl);
                    let relativeImageUrl = imageUrl;
                    if (relativeImageUrl && relativeImageUrl.startsWith(API_URL)) {
                        relativeImageUrl = relativeImageUrl.replace(API_URL, '');
                    }

                    enabledSections.push({
                        title: section.title.trim(),
                        description: section.description.trim(),
                        imageUrl: relativeImageUrl || undefined,
                    });
                }
            }

            if (enabledSections.length > 0) {
                eventData.sections = enabledSections;
            }

            // Create or update event
            const request = this.isEditMode()
                ? this.managerApi.updateEvent(this.eventId()!, eventData)
                : this.managerApi.createEvent(eventData);

            await request.toPromise();

            this.success.set(true);
            setTimeout(() => {
                this.router.navigate(['/manager']);
            }, 1500);

        } catch (err: any) {
            this.error.set(err.error?.message || `Failed to ${this.isEditMode() ? 'update' : 'create'} event`);
        } finally {
            this.submitting.set(false);
        }
    }

    getSectionKeys(): string[] {
        return Object.keys(this.sections);
    }

    getSectionLabel(key: string): string {
        const labels: { [key: string]: string } = {
            details: 'Event Details',
            schedule: 'Schedule',
            speakers: 'Speakers',
            requirements: 'Requirements',
            prizes: 'Prizes & Awards',
        };
        return labels[key] || key;
    }

    getDefaultImageForSection(key: string): string {
        return DEFAULT_SECTION_IMAGE;
    }

    formatDateForDisplay(dateString: string): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getFormattedPrice(): string {
        return this.price === 0 ? 'Free' : `${this.price} DT`;
    }
}

