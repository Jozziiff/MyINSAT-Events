import { Component } from '@angular/core';
import { fadeSlideIn } from '../../animations';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
  animations: [fadeSlideIn]
})
export class HomeComponent {

}
