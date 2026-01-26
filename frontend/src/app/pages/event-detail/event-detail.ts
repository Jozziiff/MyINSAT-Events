import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService } from '../../services/manager-api.service';

interface EventSection {
    title: string;
    description: string;
    imageUrl?: string;
}

interface Event {
    id: number;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    capacity: number;
    price: number;
    photoUrl?: string;
    sections?: EventSection[];
    status: string;
}

@Component({
    selector: 'app-event-detail',
    imports: [CommonModule],
    templateUrl: './event-detail.html',
    styleUrl: './event-detail.css',
    animations: [fadeSlideIn]
})
export class EventDetailComponent implements OnInit {
    event = signal<Event | null>(null);
    loading = signal(true);
    error = signal('');
    sections = computed(() => this.event()?.sections ?? []);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private managerApi: ManagerApiService
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadEvent(+id);
        }
    }

    loadEvent(id: number) {
        this.loading.set(true);
        this.managerApi.getAllEvents().subscribe({
            next: (events) => {
                const event = events.find(e => e.id === id);
                if (event) {
                    this.event.set(event as Event);
                } else {
                    this.error.set('Event not found');
                }
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load event');
                this.loading.set(false);
            }
        });
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    goBack() {
        this.router.navigate(['/manager']);
    }
}
