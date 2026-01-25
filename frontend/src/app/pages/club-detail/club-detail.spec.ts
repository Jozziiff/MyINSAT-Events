import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClubDetailComponent } from './club-detail';

describe('ClubDetailComponent', () => {
  let component: ClubDetailComponent;
  let fixture: ComponentFixture<ClubDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
