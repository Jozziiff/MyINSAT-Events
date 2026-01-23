import { Component, signal } from '@angular/core';
import { fadeSlideIn } from '../../animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For search input

@Component({
  selector: 'app-events',
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
  animations: [fadeSlideIn]
})
export class EventsComponent {
  searchQuery = signal('');
  selectedCategory = signal('All');

  // For animated filter indicator
  filterTabs = ['All', 'Tech', 'Social'];
  indicatorStyle = signal<{ left: string; width: string }>({ left: '0px', width: '0px' });

  ngAfterViewInit() {
    setTimeout(() => this.updateIndicator(), 0);
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

  // Mock Data (We will replace this with the Backend API later)
  events = signal([
    {
      id: 1,
      title: 'AI Summit 2024',
      club: 'IEEE CS',
      date: 'Oct 20',
      price: '10 TND',
      category: 'Tech',
      status: 'Open'
    },
    {
      id: 2,
      title: 'Charity Run',
      club: 'Lions Club',
      date: 'Oct 22',
      price: 'Free',
      category: 'Social',
      status: 'Limited'
    },
    {
      id: 3,
      title: 'Gaming Night',
      club: 'INSAT Press',
      date: 'Oct 25',
      price: '5 TND',
      category: 'Fun',
      status: 'Sold Out'
    },
    // these are just mock data that will be replaced later with real data from the backend database
  ]);

  // Placeholder for filter logic
  filterEvents(category: string) {
    this.selectedCategory.set(category);
    setTimeout(() => this.updateIndicator(), 0);
  }
}
