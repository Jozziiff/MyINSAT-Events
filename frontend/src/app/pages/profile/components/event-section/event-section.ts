import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileEvent } from '../../../../models/profile.models';

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
}
