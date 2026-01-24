import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClubsComponent } from './clubs';

describe('ClubsComponent', () => {
  let component: ClubsComponent;
  let fixture: ComponentFixture<ClubsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClubsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
