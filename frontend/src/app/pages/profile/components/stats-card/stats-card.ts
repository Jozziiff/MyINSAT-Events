import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stats-card',
    imports: [CommonModule],
    templateUrl: './stats-card.html',
    styleUrl: './stats-card.css'
})
export class StatsCard {
    @Input() icon: string = 'calendar-check';
    @Input() label: string = '';
    @Input() value: number = 0;
    @Input() color: 'success' | 'primary' | 'accent' | 'warning' = 'primary';
}
