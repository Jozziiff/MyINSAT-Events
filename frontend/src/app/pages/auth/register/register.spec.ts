import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    //The test file only contains a basic 'should create' test but lacks coverage for the component's main functionality: form validation, password matching, registration flow, and error handling. These behaviors introduced in register.ts lines 45-63 should be tested.
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
