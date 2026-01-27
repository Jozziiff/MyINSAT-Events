import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService, EventRegistrations, Registration } from '../../services/manager-api.service';

@Component({
    selector: 'app-registrations-manager',
    imports: [CommonModule, FormsModule],
    templateUrl: './registrations-manager.html',
    styleUrl: './registrations-manager.css',
    animations: [fadeSlideIn]
})
export class RegistrationsManagerComponent implements OnInit {
    eventId = signal<number>(0);
    data = signal<EventRegistrations | null>(null);
    loading = signal(true);
    error = signal('');
    updatingId = signal<number | null>(null);
    searchTerm = signal('');

    filteredRegistrations = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const regs = this.data()?.registrations || [];

        if (!term) return regs;

        return regs.filter(r =>
            r.user.fullName.toLowerCase().includes(term) ||
            r.user.email.toLowerCase().includes(term)
        );
    });

    isEventDay = computed(() => {
        const eventData = this.data();
        if (!eventData) return false;

        const eventDate = new Date(eventData.event.startTime);
        const today = new Date();

        return eventDate.toDateString() === today.toDateString() || eventDate < today;
    });

    constructor(
        private managerApi: ManagerApiService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('eventId');
        if (id) {
            this.eventId.set(+id);
            this.loadRegistrations();
        }
    }

    loadRegistrations() {
        this.loading.set(true);
        this.error.set('');

        this.managerApi.getEventRegistrations(this.eventId()).subscribe({
            next: (data) => {
                this.data.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load registrations');
                this.loading.set(false);
            }
        });
    }

    getStatusClass(status: string): string {
        return status.toLowerCase().replace('_', '-');
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateStatus(registration: Registration, newStatus: string) {
        const currentData = this.data();
        if (!currentData) return;

        // Check if trying to mark attendance before event day
        if ((newStatus === 'ATTENDED' || newStatus === 'NO_SHOW') && !this.isEventDay()) {
            alert('Attendance can only be marked on or after the event day.');
            return;
        }

        if (newStatus === 'CONFIRMED' &&
            registration.status !== 'CONFIRMED' &&
            currentData.event.confirmedCount >= currentData.event.capacity) {
            alert('Event capacity reached! Cannot confirm more registrations.');
            return;
        }

        this.updatingId.set(registration.id);

        this.managerApi.updateRegistrationStatus(registration.id, newStatus).subscribe({
            next: () => {
                this.loadRegistrations();
                this.updatingId.set(null);
            },
            error: (err) => {
                alert('Failed to update status: ' + (err.error?.message || 'Unknown error'));
                this.updatingId.set(null);
            }
        });
    }

    goBack() {
        this.router.navigate(['/manager']);
    }

    getFilteredRegistrations(status?: string): Registration[] {
        const regs = this.data()?.registrations || [];
        return status ? regs.filter(r => r.status === status) : regs;
    }
}
