import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { fadeSlideIn } from '../../animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { AuthStateService } from '../../services/auth/auth-state';
import { UserService } from '../../services/user.service';
import { EventSummary, RegistrationStatus } from '../../models/event.model';

type FilterType = 'all' | 'my-clubs' | 'live' | 'upcoming' | 'ended';
type SortType = 'date-asc' | 'date-desc' | 'interested' | 'confirmed' | 'rating';

@Component({
  selector: 'app-events',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
  animations: [fadeSlideIn]
})
export class EventsComponent implements OnInit {
  private eventsService = inject(EventsService);
  private authState = inject(AuthStateService);
  private userService = inject(UserService);
  private router = inject(Router);

  searchQuery = signal('');
  selectedFilter = signal<FilterType>('all');
  selectedSort = signal<SortType>('date-asc');
  showSortDropdown = signal(false);
  showFilterDropdown = signal(false);

  // Events from the service
  events = signal<EventSummary[]>([]);
  followedClubIds = signal<number[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Track which events are being processed
  processingEvents = signal<Set<number>>(new Set());
  isAuthenticated = this.authState.isAuthenticated;

  // Filter options
  get filterOptions() {
    const options = [
      { value: 'all' as FilterType, label: 'All Events', icon: '📋' },
      { value: 'live' as FilterType, label: 'Live Now', icon: '🔴' },
      { value: 'upcoming' as FilterType, label: 'Upcoming', icon: '🚀' },
      { value: 'ended' as FilterType, label: 'Ended', icon: '🏁' }
    ];

    if (this.isAuthenticated()) {
      options.splice(1, 0, { value: 'my-clubs' as FilterType, label: 'My Clubs', icon: '👥' });
    }

    return options;
  }

  // Sort options
  sortOptions = [
    { value: 'date-asc' as SortType, label: 'Date: Earliest First', icon: '📅↑' },
    { value: 'date-desc' as SortType, label: 'Date: Latest First', icon: '📅↓' },
    { value: 'interested' as SortType, label: 'Most Interested', icon: '❤️' },
    { value: 'confirmed' as SortType, label: 'Most Confirmed', icon: '✓' },
    { value: 'rating' as SortType, label: 'Highest Rated', icon: '⭐' }
  ];

  async ngOnInit() {
    await this.loadEvents();
    if (this.isAuthenticated()) {
      await this.loadFollowedClubs();
    }
  }

  async loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.eventsService.getAllEvents();
      this.events.set(data);
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load events');
    } finally {
      this.loading.set(false);
    }
  }

  async loadFollowedClubs() {
    try {
      const clubs = await this.userService.getFollowedClubs();
      this.followedClubIds.set(clubs.map(c => c.id));
    } catch (err) {
      console.error('Failed to load followed clubs:', err);
    }
  }

  // Apply filter
  applyFilter(filter: FilterType) {
    this.selectedFilter.set(filter);
    this.showFilterDropdown.set(false);
  }

  // Apply sort
  applySort(sort: SortType) {
    this.selectedSort.set(sort);
    this.showSortDropdown.set(false);
  }

  // Get current filter label
  get currentFilterLabel(): string {
    return this.filterOptions.find(opt => opt.value === this.selectedFilter())?.label || 'Filter';
  }

  // Get current sort label
  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
  }

  // Get filtered and sorted events
  get filteredEvents(): EventSummary[] {
    let filtered = this.events();
    const query = this.searchQuery().toLowerCase();

    // Apply search
    if (query) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.club?.name?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    // Apply filter
    const filter = this.selectedFilter();
    if (filter === 'my-clubs') {
      const clubIds = this.followedClubIds();
      filtered = filtered.filter(event => event.club && clubIds.includes(event.club.id));
    } else if (filter === 'live') {
      filtered = filtered.filter(event => this.isEventLive(event));
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(event => !this.isEventLive(event) && !this.isEventEnded(event));
    } else if (filter === 'ended') {
      filtered = filtered.filter(event => this.isEventEnded(event));
    }

    // Apply sort
    const sort = this.selectedSort();
    if (sort === 'date-asc') {
      filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else if (sort === 'date-desc') {
      filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else if (sort === 'interested') {
      filtered.sort((a, b) => b.stats.interestedCount - a.stats.interestedCount);
    } else if (sort === 'confirmed') {
      filtered.sort((a, b) => b.stats.confirmedCount - a.stats.confirmedCount);
    } else if (sort === 'rating') {
      filtered.sort((a, b) => {
        // Only compare if both have ratings
        if (a.stats.ratingCount === 0 && b.stats.ratingCount === 0) return 0;
        if (a.stats.ratingCount === 0) return 1;
        if (b.stats.ratingCount === 0) return -1;
        return b.stats.averageRating - a.stats.averageRating;
      });
    }

    return filtered;
  }

  // Format date for display
  formatDate(date: Date): string {
    return this.eventsService.formatDate(date);
  }

  // Format price for display
  formatPrice(price?: number): string {
    return this.eventsService.formatPrice(price);
  }

  // Get status label
  getStatusLabel(event: EventSummary): string {
    return this.eventsService.getStatusLabel(event);
  }

  // Format rating
  formatRating(rating: number): string {
    if (rating === 0) return 'New';
    return rating.toFixed(1);
  }

  // Navigate to event details
  navigateToEvent(eventId: number) {
    this.router.navigate(['/events', eventId]);
  }

  // Check if user is interested in event
  isInterested(event: EventSummary): boolean {
    return event.userInteraction?.status === RegistrationStatus.INTERESTED;
  }

  // Check if event is being processed
  isProcessing(eventId: number): boolean {
    return this.processingEvents().has(eventId);
  }

  // Check if event has ended
  isEventEnded(event: EventSummary): boolean {
    const now = new Date();
    const endTime = new Date(event.endTime);
    return endTime < now;
  }

  // Check if event is currently live (started but not ended)
  isEventLive(event: EventSummary): boolean {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    return startTime <= now && endTime >= now;
  }

  // Get days until event starts
  getDaysUntilEvent(event: EventSummary): number | null {
    const now = new Date();
    const startTime = new Date(event.startTime);

    if (startTime < now) {
      return null; // Event has started or passed
    }

    const diffTime = startTime.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Format countdown display
  formatCountdown(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    if (days <= 14) return `${Math.ceil(days / 7)} week${Math.ceil(days / 7) > 1 ? 's' : ''}`;
    return `${days} days`;
  }

  // Toggle interest in event
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
      const wasInterested = this.isInterested(event);

      if (wasInterested) {
        // User is already interested, so cancel/remove the registration
        await this.eventsService.cancelRegistration(event.id);
      } else {
        // User is not interested, so register with INTERESTED status
        await this.eventsService.registerForEvent(event.id, RegistrationStatus.INTERESTED);
      }

      // Update local state without reloading
      const currentEvents = this.events();
      const updatedEvents = currentEvents.map(e => {
        if (e.id === event.id) {
          const updatedEvent = { ...e };

          // Update user interaction
          if (wasInterested) {
            updatedEvent.userInteraction = undefined;
            // Decrement interested count
            updatedEvent.stats = {
              ...updatedEvent.stats,
              interestedCount: Math.max(0, updatedEvent.stats.interestedCount - 1)
            };
          } else {
            updatedEvent.userInteraction = {
              status: RegistrationStatus.INTERESTED,
              hasRated: false
            };
            // Increment interested count
            updatedEvent.stats = {
              ...updatedEvent.stats,
              interestedCount: updatedEvent.stats.interestedCount + 1
            };
          }

          return updatedEvent;
        }
        return e;
      });

      this.events.set(updatedEvents);
    } finally {
      // Remove from processing
      const updated = new Set(this.processingEvents());
      updated.delete(event.id);
      this.processingEvents.set(updated);
    }
  }
}
