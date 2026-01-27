import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserRating } from '../../../../models/profile.models';

@Component({
  selector: 'app-ratings-section',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ratings-section">
      @if (ratings.length > 0) {
        <div class="ratings-list">
          @for (rating of ratings.slice(0, maxDisplay); track rating.id) {
            <div class="rating-card" [routerLink]="['/events', rating.eventId]">
              <div class="rating-header">
                <span class="event-title">{{ rating.eventTitle }}</span>
                <div class="rating-stars">
                  @for (star of [1,2,3,4,5]; track star) {
                    <svg 
                      class="star-icon" 
                      [class.filled]="star <= rating.rating"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  }
                </div>
              </div>
              @if (rating.comment) {
                <p class="rating-comment">"{{ rating.comment }}"</p>
              }
              <span class="rating-date">{{ rating.createdAt | date:'mediumDate' }}</span>
            </div>
          }
        </div>
        @if (ratings.length > maxDisplay) {
          <button class="show-more-btn" (click)="toggleShowAll()">
            {{ showAll ? 'Show Less' : 'Show All (' + ratings.length + ')' }}
          </button>
        }
      } @else {
        <p class="empty">No ratings yet. Attend events and share your experience!</p>
      }
    </div>
  `,
  styles: [`
    .ratings-section {
      width: 100%;
    }

    .ratings-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .rating-card {
      padding: 1rem 1.25rem;
      background: rgba(30, 41, 59, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .rating-card:hover {
      background: rgba(30, 41, 59, 0.5);
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateX(4px);
    }

    .rating-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .event-title {
      color: var(--color-text-primary);
      font-size: 1rem;
      font-weight: 600;
      flex: 1;
    }

    .rating-stars {
      display: flex;
      gap: 2px;
    }

    .star-icon {
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.2);
      transition: color 0.2s ease;
    }

    .star-icon.filled {
      color: var(--color-warning);
      fill: var(--color-warning);
    }

    .rating-comment {
      color: var(--color-text-body);
      font-size: 0.9rem;
      font-style: italic;
      margin: 0.5rem 0;
      line-height: 1.5;
      opacity: 0.9;
    }

    .rating-date {
      color: var(--color-text-muted);
      font-size: 0.8rem;
    }

    .show-more-btn {
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.75rem;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-primary-light);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .show-more-btn:hover {
      background: rgba(99, 102, 241, 0.2);
    }

    .empty {
      color: var(--color-text-muted);
      text-align: center;
      font-size: 0.95rem;
      padding: 2rem 1rem;
      font-style: italic;
    }
  `]
})
export class RatingsSection {
  @Input() ratings: UserRating[] = [];
  
  showAll = false;
  
  get maxDisplay(): number {
    return this.showAll ? this.ratings.length : 3;
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
  }
}
