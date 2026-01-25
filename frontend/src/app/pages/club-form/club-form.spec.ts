import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClubFormComponent } from './club-form';

describe('ClubFormComponent', () => {
  let component: ClubFormComponent;
  let fixture: ComponentFixture<ClubFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
