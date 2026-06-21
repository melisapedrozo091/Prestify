import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ProfileComponent } from './components/profile/profile.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'landing', redirectTo: '' }])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Prestify');
  });
});

describe('ProfileComponent', () => {
  beforeEach(async () => {
    const mockApp = {
      openAddModal: () => {}
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([{ path: 'landing', redirectTo: '' }]),
        { provide: App, useValue: mockApp }
      ]
    }).compileComponents();
  });

  it('should create the profile component', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
