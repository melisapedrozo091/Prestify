import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { CatalogComponent } from './components/catalog/catalog.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HistoryComponent } from './components/history/history.component';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  { path: 'landing', component: LandingComponent },
  { path: 'catalog', component: CatalogComponent },
  { path: 'catalog/sku/:sku', component: CatalogComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: '**', redirectTo: 'landing' }
];
