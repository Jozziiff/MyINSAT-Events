import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileEvent } from '../../../../models/profile.models';
import { RegistrationStatus } from '../../../../models/event.model';
import { getTimeUntilEvent, formatCountdown, isEventLive, getTimeUntilEventEnds, formatRemainingTime, TimeUntil } from '../../../../utils/time.utils';

@Component({
  selector: 'app-event-section',
  templateUrl: './event-section.html',
  styleUrls: ['./event-section.css'],
  imports: [CommonModule, RouterModule],
})
export class EventSection {
  @Input() title!: string;
  @Input() events: ProfileEvent[] = [];
  @Input() emptyMessage = 'No events to display';
  @Input() showClub = true;

  // Expose enum to template
  readonly RegistrationStatus = RegistrationStatus;

  // Time utilities
  getTimeUntil(event: ProfileEvent): TimeUntil | null {
    return getTimeUntilEvent(event.startTime);
  }

  formatCountdown(timeUntil: TimeUntil | null): string {
    return formatCountdown(timeUntil);
  }

  isLive(event: ProfileEvent): boolean {
    return isEventLive(event.startTime, event.endTime);
  }

  getTimeUntilEventEnds(event: ProfileEvent): TimeUntil | null {
    return getTimeUntilEventEnds(event.endTime);
  }

  formatRemainingTime(timeUntil: TimeUntil | null): string {
    return formatRemainingTime(timeUntil);
  }
}
