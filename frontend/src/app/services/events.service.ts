import { Injectable, signal, inject } from '@angular/core';
import { Event, EventSummary, RateEventRequest, EventRating, RegistrationStatus } from '../models/event.model';
import { resolveImageUrl, getApiUrl } from '../utils/image.utils';
import { TokenService } from './auth/token';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private readonly apiUrl = getApiUrl();
  private readonly tokenService = inject(TokenService);

  events = signal<EventSummary[]>([]);
  trendingEvents = signal<EventSummary[]>([]);
  selectedEvent = signal<Event | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  private getAuthHeaders(): HeadersInit {
    const token = this.tokenService.getAccessToken();
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    }
    return { 'Content-Type': 'application/json' };
  }

  private resolveEventImages(event: any): EventSummary {
    return {
      ...event,
      photoUrl: resolveImageUrl(event.photoUrl),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      club: event.club ? {
        ...event.club,
        logoUrl: resolveImageUrl(event.club.logoUrl),
      } : null,
      stats: event.stats || {
        interestedCount: 0,
        confirmedCount: 0,
        attendedCount: 0,
        averageRating: 0,
        ratingCount: 0,
      },
      userInteraction: event.userInteraction,
    };
  }

  private resolveFullEventImages(event: any): Event {
    return {
      ...event,
      photoUrl: resolveImageUrl(event.photoUrl),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
      sections: event.sections?.map((section: any) => ({
        ...section,
        imageUrl: resolveImageUrl(section.imageUrl),
      })),
      club: event.club ? {
        ...event.club,
        logoUrl: resolveImageUrl(event.club.logoUrl),
      } : null,
      stats: event.stats || {
        interestedCount: 0,
        confirmedCount: 0,
        attendedCount: 0,
        averageRating: 0,
        ratingCount: 0,
      },
      userInteraction: event.userInteraction,
    };
  }

  async getAllEvents(): Promise<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/events`, {
        headers: this.getAuthHeaders(),
      });
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
      const response = await fetch(`${this.apiUrl}/events/upcoming`, {
        headers: this.getAuthHeaders(),
      });
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

  async getTrendingEvents(limit: number = 10): Promise<EventSummary[]> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch(`${this.apiUrl}/events/trending?limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch trending events');
      const data = await response.json();
      const resolved = data.map((event: any) => this.resolveEventImages(event));
      this.trendingEvents.set(resolved);
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
      const response = await fetch(`${this.apiUrl}/events/${id}`, {
        headers: this.getAuthHeaders(),
      });
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

  async rateEvent(eventId: number, request: RateEventRequest): Promise<EventRating | null> {
    try {
      const response = await fetch(`${this.apiUrl}/events/${eventId}/rate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Failed to rate event');
      return await response.json();
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return null;
    }
  }

  async getEventRatings(eventId: number): Promise<EventRating[]> {
    try {
      const response = await fetch(`${this.apiUrl}/events/${eventId}/ratings`);
      if (!response.ok) throw new Error('Failed to fetch ratings');
      return await response.json();
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return [];
    }
  }

  // Register for an event with a specific status
  async registerForEvent(eventId: number, status: RegistrationStatus): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/events/${eventId}/register`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to register for event');

      this.updateEventInteraction(eventId, status);
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  // Cancel registration for an event
  async cancelRegistration(eventId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/events/${eventId}/register`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok && response.status !== 204) throw new Error('Failed to cancel registration');

      this.updateEventInteraction(eventId, RegistrationStatus.CANCELLED);
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Unknown error');
      return false;
    }
  }

  private updateEventInteraction(eventId: number, status: RegistrationStatus | null) {
    // Update in events list
    const currentEvents = this.events();
    const updatedEvents = currentEvents.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          userInteraction: {
            ...event.userInteraction,
            status,
            hasRated: event.userInteraction?.hasRated || false,
          },
          stats: {
            ...event.stats,
            interestedCount: status === RegistrationStatus.INTERESTED
              ? event.stats.interestedCount + 1
              : Math.max(0, event.stats.interestedCount - 1),
          },
        };
      }
      return event;
    });
    this.events.set(updatedEvents);

    // Update in trending events
    const currentTrending = this.trendingEvents();
    const updatedTrending = currentTrending.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          userInteraction: {
            ...event.userInteraction,
            status,
            hasRated: event.userInteraction?.hasRated || false,
          },
          stats: {
            ...event.stats,
            interestedCount: status === RegistrationStatus.INTERESTED
              ? event.stats.interestedCount + 1
              : Math.max(0, event.stats.interestedCount - 1),
          },
        };
      }
      return event;
    });
    this.trendingEvents.set(updatedTrending);

    // Update selected event if it matches
    const selectedEvent = this.selectedEvent();
    if (selectedEvent && selectedEvent.id === eventId) {
      this.selectedEvent.set({
        ...selectedEvent,
        userInteraction: {
          ...selectedEvent.userInteraction,
          status,
          hasRated: selectedEvent.userInteraction?.hasRated || false,
        },
        stats: {
          ...selectedEvent.stats,
          interestedCount: status === RegistrationStatus.INTERESTED
            ? selectedEvent.stats.interestedCount + 1
            : Math.max(0, selectedEvent.stats.interestedCount - 1),
        },
      });
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

  // Format rating for display
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }
}
