import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService } from '../../services/manager-api.service';

interface EventSection {
    title: string;
    description: string;
    imageUrl?: string;
}

@Component({
    selector: 'app-event-form',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './event-form.html',
    styleUrl: './event-form.css',
    animations: [fadeSlideIn]
})
export class EventFormComponent implements OnInit {
    eventForm: FormGroup;
    sections = signal<EventSection[]>([]);
    sectionControls = signal<FormControl[]>([]);
    
    isEditMode = signal(false);
    eventId = signal<number | null>(null);
    loading = signal(false);
    error = signal('');
    uploadingPhotoIndex = signal<number | null>(null);
    showPreview = signal(false);

    constructor(
        private fb: FormBuilder,
        private managerApi: ManagerApiService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.eventForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            location: ['', Validators.required],
            startTime: ['', Validators.required],
            endTime: ['', Validators.required],
            capacity: [30, [Validators.required, Validators.min(1)]],
            price: [0, [Validators.min(0)]]
        });
    }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.eventId.set(+id);
            this.loadEvent(+id);
        }
    }

    loadEvent(id: number) {
        this.loading.set(true);
        this.managerApi.getAllEvents().subscribe({
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
                    
                    if ((event as any).sections && Array.isArray((event as any).sections)) {
                        this.sections.set((event as any).sections);
                        this.initializeSectionControls((event as any).sections);
                    }
                }
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load event');
                this.loading.set(false);
            }
        });
    }

    formatDateForInput(dateString: string): string {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }

    addSection() {
        const newSection: EventSection = {
            title: '',
            description: '',
            imageUrl: ''
        };
        this.sections.update(s => [...s, newSection]);
        this.sectionControls.update(c => [
            ...c,
            new FormControl(''),
            new FormControl('')
        ]);
    }

    removeSection(index: number) {
        this.sections.update(s => s.filter((_, i) => i !== index));
        this.sectionControls.update(c => {
            const newControls = [...c];
            newControls.splice(index * 2, 2);
            return newControls;
        });
    }

    getSectionTitleControl(index: number): FormControl {
        const control = this.sectionControls()[index * 2];
        if (!control) {
            const newControl = new FormControl('');
            this.sectionControls.update(c => [...c, newControl]);
            return newControl;
        }
        return control;
    }

    getSectionDescriptionControl(index: number): FormControl {
        const control = this.sectionControls()[index * 2 + 1];
        if (!control) {
            const newControl = new FormControl('');
            this.sectionControls.update(c => [...c, newControl]);
            return newControl;
        }
        return control;
    }

    getSectionImageUrl(index: number): string {
        return this.sections()[index]?.imageUrl || '';
    }

    onSectionImageSelected(event: Event, sectionIndex: number): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) return;

        this.error.set('');

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

        this.uploadSectionPhoto(file, sectionIndex, input);
    }

    private uploadSectionPhoto(file: File, sectionIndex: number, input: HTMLInputElement): void {
        this.uploadingPhotoIndex.set(sectionIndex);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('event', 'event');

        fetch('http://localhost:3000/upload/image', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error('Upload failed');
            return response.json();
        })
        .then(data => {
            let imageUrl = data.url;
            // Make sure URL is absolute if it's relative
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `http://localhost:3000${imageUrl}`;
            }
            this.sections.update(s => {
                const updated = [...s];
                updated[sectionIndex] = { ...updated[sectionIndex], imageUrl };
                return updated;
            });
            this.uploadingPhotoIndex.set(null);
            input.value = '';
        })
        .catch(err => {
            this.error.set('Failed to upload photo. Please try again.');
            this.uploadingPhotoIndex.set(null);
            input.value = '';
        });
    }

    removeSectionImage(index: number): void {
        this.sections.update(s => {
            const updated = [...s];
            updated[index] = { ...updated[index], imageUrl: '' };
            return updated;
        });
    }

    openPreview(): void {
        this.showPreview.set(true);
    }

    closePreview(): void {
        this.showPreview.set(false);
    }

    initializeSectionControls(sections: EventSection[]): void {
        const controls: FormControl[] = [];
        sections.forEach(section => {
            controls.push(new FormControl(section.title));
            controls.push(new FormControl(section.description));
        });
        this.sectionControls.set(controls);
    }

    onSubmit() {
        if (this.eventForm.invalid) {
            this.eventForm.markAllAsTouched();
            return;
        }

        // Update sections with control values
        this.sections.update(s => s.map((section, idx) => ({
            ...section,
            title: this.getSectionTitleControl(idx).value || '',
            description: this.getSectionDescriptionControl(idx).value || ''
        })));

        this.loading.set(true);
        this.error.set('');

        const formValue = this.eventForm.value;
        const eventData = {
            ...formValue,
            startTime: new Date(formValue.startTime).toISOString(),
            endTime: new Date(formValue.endTime).toISOString(),
            sections: this.sections()
        };

        const request = this.isEditMode()
            ? this.managerApi.updateEvent(this.eventId()!, eventData)
            : this.managerApi.createEvent(eventData);

        request.subscribe({
            next: () => {
                this.router.navigate(['/manager']);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to save event');
                this.loading.set(false);
            }
        });
    }

    cancel() {
        this.router.navigate(['/manager']);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.eventForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.eventForm.get(fieldName);
        if (!field || !field.errors) return '';

        if (field.errors['required']) return `${fieldName} is required`;
        if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
        if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;

        return 'Invalid input';
    }
}
