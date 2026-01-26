import { Injectable, signal } from '@angular/core';
import { Event, EventSummary } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private readonly apiUrl = 'http://localhost:3000';

  events = signal<EventSummary[]>([]);
  selectedEvent = signal<Event | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  private resolveImageUrl(url?: string): string | undefined {
    if (!url) return undefined;
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${this.apiUrl}${url}`;
  }

  private resolveEventImages(event: any): EventSummary {
    return {
      ...event,
      photoUrl: this.resolveImageUrl(event.photoUrl),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      club: event.club ? {
        ...event.club,
        logoUrl: this.resolveImageUrl(event.club.logoUrl),
      } : null,
    };
  }

  private resolveFullEventImages(event: any): Event {
    return {
      ...event,
      photoUrl: this.resolveImageUrl(event.photoUrl),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
      sections: event.sections?.map((section: any) => ({
        ...section,
        imageUrl: this.resolveImageUrl(section.imageUrl),
      })),
      club: event.club ? {
        ...event.club,
        logoUrl: this.resolveImageUrl(event.club.logoUrl),
      } : null,
    };
  }

  async getAllEvents(): Promise<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      const resolved = data.map((event: any) => this.resolveEventImages(event));
      this.events.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getUpcomingEvents(): Promise<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/events/upcoming`);
      if (!response.ok) throw new Error('Failed to fetch upcoming events');
      const data = await response.json();
      const resolved = data.map((event: any) => this.resolveEventImages(event));
      this.events.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getEventById(id: number): Promise<Event | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/events/${id}`);
      if (!response.ok) throw new Error('Failed to fetch event details');
      const data = await response.json();
      const resolved = this.resolveFullEventImages(data);
      this.selectedEvent.set(resolved);
      return resolved;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // Format date for display (e.g., "Oct 20")
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Format price for display
  formatPrice(price?: number): string {
    if (!price || price === 0) return 'Free';
    return `${price} TND`;
  }

  // Get status label for display
  getStatusLabel(event: EventSummary): string {
    if (event.capacity) {
      // If capacity is defined, we could show remaining spots
      return 'Open';
    }
    return 'Open';
  }
}
