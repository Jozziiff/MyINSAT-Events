import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { EventsService } from '../../services/events.service';
import { Event } from '../../models/event.model';

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
        private eventsService: EventsService
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadEvent(+id);
        }
    }

    async loadEvent(id: number) {
        this.loading.set(true);
        this.error.set('');

        const event = await this.eventsService.getEventById(id);

        if (event) {
            this.event.set(event);
        } else {
            this.error.set(this.eventsService.error() || 'Event not found');
        }

        this.loading.set(false);
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatPrice(price?: number): string {
        return this.eventsService.formatPrice(price);
    }

    goBack() {
        this.router.navigate(['/events']);
    }
}
