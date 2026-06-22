import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PrestifyService } from '../../services/prestify.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  public readonly prestifyService = inject(PrestifyService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      // Re-initialize map markers when items change in the service database
      const items = this.prestifyService.items();
      if (this.mapInstance) {
        this.initMapDeferred();
      }
    });
  }

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  private mapInstance: any = null;

  ngAfterViewInit(): void {
    this.initMapDeferred();
  }

  ngOnDestroy(): void {
    this.destroyMap();
    if (typeof window !== 'undefined' && (window as any).landingComponentRef) {
      delete (window as any).landingComponentRef;
    }
  }

  private initMapDeferred(): void {
    setTimeout(() => {
      this.initLeafletMap();
    }, 150);
  }

  private destroyMap(): void {
    if (this.mapInstance) {
      try {
        this.mapInstance.remove();
      } catch (e) {
        console.warn('Map cleanup error:', e);
      }
      this.mapInstance = null;
    }
  }

  private initLeafletMap(): void {
    if (typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L || !this.mapContainer) return;

    try {
      this.destroyMap();

      this.mapInstance = L.map(this.mapContainer.nativeElement).setView([-34.6037, -58.3816], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.mapInstance);

      // Create global callback bridge for popup buttons
      (window as any).landingComponentRef = {
        selectItemFromMap: (id: string) => this.selectItemFromMap(id)
      };

      // Add markers for all items
      this.prestifyService.items().forEach(item => {
        if (item.status !== 'vendido') {
          const marker = L.marker([item.lat, item.lng]).addTo(this.mapInstance);
          
          const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 180px; padding: 4px;">
              <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: #6366f1;">${item.category}</span>
              <h4 style="margin: 2px 0 6px 0; font-size: 0.95rem; font-family: 'Outfit', sans-serif; font-weight: 700; color: #0f172a;">${item.title}</h4>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="background-color: ${item.status === 'disponible' ? '#e1fbf2' : '#fef3c7'}; color: ${item.status === 'disponible' ? '#10b981' : '#f59e0b'}; padding: 2px 6px; font-size: 0.65rem; border-radius: 20px; font-weight: 700;">
                  ${item.status === 'disponible' ? 'Disponible' : 'Prestado'}
                </span>
                <strong style="color: #6366f1; font-size: 0.85rem;">${this.prestifyService.formatPrice(item.price)}</strong>
              </div>
              <button 
                style="width: 100%; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;"
                onclick="window.landingComponentRef.selectItemFromMap('${item.id}')">
                Ver Ficha
              </button>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
      });

      setTimeout(() => {
        if (this.mapInstance) {
          this.mapInstance.invalidateSize();
        }
      }, 200);
    } catch (e) {
      console.error('Error initializing Leaflet map on landing:', e);
    }
  }

  public selectItemFromMap(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (item && item.sku) {
      this.router.navigate(['/catalog/sku', item.sku.toLowerCase()]);
    } else {
      this.router.navigate(['/catalog'], { queryParams: { itemId } });
    }
  }

  public joinNetwork(): void {
    this.prestifyService.openAuthModal('register');
  }

  public goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  public exploreCatalog(): void {
    this.router.navigate(['/catalog']);
  }
}
