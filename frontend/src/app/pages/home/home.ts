import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { EventsService } from '../../services/events.service';
import { AuthStateService } from '../../services/auth/auth-state';
import { EventSummary, RegistrationStatus } from '../../models/event.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  animations: [fadeSlideIn]
})
export class HomeComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  trendingEvents = this.eventsService.trendingEvents;
  loading = this.eventsService.loading;
  error = this.eventsService.error;
  isAuthenticated = this.authState.isAuthenticated;

  // Track which events are being processed
  processingEvents = signal<Set<number>>(new Set());

  ngOnInit() {
    this.loadTrendingEvents();
  }

  async loadTrendingEvents() {
    await this.eventsService.getTrendingEvents(3);
  }

  navigateToEvents() {
    this.router.navigate(['/events']);
  }

  navigateToEvent(eventId: number) {
    this.router.navigate(['/events', eventId]);
  }

  formatDate(date: Date): string {
    return this.eventsService.formatDate(date);
  }

  formatPrice(price?: number): string {
    return this.eventsService.formatPrice(price);
  }

  formatRating(rating: number): string {
    if (rating === 0) return 'New';
    return rating.toFixed(1);
  }

  isInterested(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.INTERESTED;
  }

  isProcessing(eventId: number): boolean {
    return this.processingEvents().has(eventId);
  }

  async toggleInterest(event: EventSummary, e: MouseEvent) {
    e.stopPropagation();
    
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isProcessing(event.id)) return;

    // Add to processing
    const processing = new Set(this.processingEvents());
    processing.add(event.id);
    this.processingEvents.set(processing);

    try {
      if (this.isInterested(event)) {
        await this.eventsService.removeInterest(event.id);
      } else {
        await this.eventsService.markInterested(event.id);
      }
    } finally {
      // Remove from processing
      const updated = new Set(this.processingEvents());
      updated.delete(event.id);
      this.processingEvents.set(updated);
    }
  }

  getStarArray(rating: number): number[] {
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars ? 1 : 0);
    }
    return stars;
  }
}
