import { Component, signal, inject, OnInit } from '@angular/core';
import { fadeSlideIn } from '../../animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { EventSummary } from '../../models/event.model';

@Component({
  selector: 'app-events',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
  animations: [fadeSlideIn]
})
export class EventsComponent implements OnInit {
  private eventsService = inject(EventsService);

  searchQuery = signal('');
  selectedCategory = signal('All');

  // For animated filter indicator
  filterTabs = ['All', 'Upcoming'];
  indicatorStyle = signal<{ left: string; width: string }>({ left: '0px', width: '0px' });

  // Events from the service
  events = signal<EventSummary[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.loadEvents();
  }

  ngAfterViewInit() {
    setTimeout(() => this.updateIndicator(), 0);
  }

  async loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.selectedCategory() === 'Upcoming') {
        const data = await this.eventsService.getUpcomingEvents();
        this.events.set(data);
      } else {
        const data = await this.eventsService.getAllEvents();
        this.events.set(data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load events');
    } finally {
      this.loading.set(false);
    }
  }

  updateIndicator() {
    const idx = this.filterTabs.indexOf(this.selectedCategory());
    const tabs = document.querySelectorAll('.filter-tabs button');
    if (tabs[idx]) {
      const el = tabs[idx] as HTMLElement;
      this.indicatorStyle.set({
        left: el.offsetLeft + 'px',
        width: el.offsetWidth + 'px'
      });
    }
  }

  // Filter events by category
  async filterEvents(category: string) {
    this.selectedCategory.set(category);
    setTimeout(() => this.updateIndicator(), 0);
    await this.loadEvents();
  }

  // Get filtered events based on search query
  get filteredEvents(): EventSummary[] {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.events();
    return this.events().filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.club?.name?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query)
    );
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
}
