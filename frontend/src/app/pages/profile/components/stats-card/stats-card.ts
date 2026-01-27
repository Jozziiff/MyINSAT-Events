import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  imports: [CommonModule],
  template: `
    <div class="stats-card" [ngClass]="'stats-card--' + color">
      <div class="stats-icon-wrapper">
        <svg *ngIf="icon === 'calendar-check'" class="stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <polyline points="9 16 11 18 15 14"></polyline>
        </svg>
        <svg *ngIf="icon === 'calendar-clock'" class="stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <circle cx="12" cy="15" r="3"></circle>
          <path d="M12 14v1.5l1 .5"></path>
        </svg>
        <svg *ngIf="icon === 'users'" class="stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <svg *ngIf="icon === 'star'" class="stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
      <div class="stats-content">
        <span class="stats-value">{{ value }}</span>
        <span class="stats-label">{{ label }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      transition: all 0.3s ease;
    }

    .stats-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .stats-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .stats-icon {
      width: 24px;
      height: 24px;
    }

    .stats-card--success .stats-icon-wrapper {
      background: rgba(16, 185, 129, 0.15);
    }
    .stats-card--success .stats-icon {
      color: var(--color-success);
    }

    .stats-card--primary .stats-icon-wrapper {
      background: rgba(99, 102, 241, 0.15);
    }
    .stats-card--primary .stats-icon {
      color: var(--color-primary);
    }

    .stats-card--accent .stats-icon-wrapper {
      background: rgba(139, 92, 246, 0.15);
    }
    .stats-card--accent .stats-icon {
      color: var(--color-accent);
    }

    .stats-card--warning .stats-icon-wrapper {
      background: rgba(245, 158, 11, 0.15);
    }
    .stats-card--warning .stats-icon {
      color: var(--color-warning);
    }

    .stats-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stats-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stats-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    @media (max-width: 500px) {
      .stats-card {
        padding: 1rem 1.25rem;
      }

      .stats-icon-wrapper {
        width: 40px;
        height: 40px;
      }

      .stats-icon {
        width: 20px;
        height: 20px;
      }

      .stats-value {
        font-size: 1.5rem;
      }
    }
  `]
})
export class StatsCard {
  @Input() icon: string = 'calendar-check';
  @Input() label: string = '';
  @Input() value: number = 0;
  @Input() color: 'success' | 'primary' | 'accent' | 'warning' = 'primary';
}
