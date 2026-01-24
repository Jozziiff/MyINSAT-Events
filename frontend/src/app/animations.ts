import { trigger, transition, style, animate } from '@angular/animations';

export const fadeSlideIn = trigger('fadeSlideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(30px)' }),
    animate('500ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'none' }))
  ]),
  transition(':leave', [
    animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 0, transform: 'translateY(30px)' }))
  ])
]);
