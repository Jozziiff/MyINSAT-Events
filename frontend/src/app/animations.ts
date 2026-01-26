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
export const fadeInRight = trigger('fadeInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(40px)' }),
    animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 0, transform: 'translateX(40px)' }))
  ])
]);