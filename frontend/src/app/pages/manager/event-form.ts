import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService } from '../../services/manager-api.service';

@Component({
    selector: 'app-event-form',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './event-form.html',
    styleUrl: './event-form.css',
    animations: [fadeSlideIn]
})
export class EventFormComponent implements OnInit {
    eventForm: FormGroup;
    isEditMode = signal(false);
    eventId = signal<number | null>(null);
    loading = signal(false);
    error = signal('');

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

    onSubmit() {
        if (this.eventForm.invalid) {
            this.eventForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.error.set('');

        const formValue = this.eventForm.value;
        const eventData = {
            ...formValue,
            startTime: new Date(formValue.startTime).toISOString(),
            endTime: new Date(formValue.endTime).toISOString()
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

    getFieldError(fieldName: string): string {
        const field = this.eventForm.get(fieldName);
        if (field?.hasError('required')) return 'This field is required';
        if (field?.hasError('minlength')) return 'Too short';
        if (field?.hasError('min')) return 'Must be positive';
        return '';
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.eventForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }
}
