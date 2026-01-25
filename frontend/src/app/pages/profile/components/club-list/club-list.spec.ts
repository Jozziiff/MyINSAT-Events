import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClubList } from './club-list';

describe('ClubList', () => {
  let component: ClubList;
  let fixture: ComponentFixture<ClubList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClubList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
