import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PrestifyService, Item, User } from '../../services/prestify.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly prestifyService = inject(PrestifyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  private mapInstance: any = null;

  public readonly selectedCategory = signal<string>('Todos');
  public readonly selectedItem = signal<Item | null>(null);

  public readonly filteredItems = computed(() => {
    const query = this.prestifyService.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();
    const items = this.prestifyService.items();

    let filtered = items;

    if (category !== 'Todos') {
      filtered = filtered.filter(item => item.category === category);
    }

    if (query) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.borrower && item.borrower.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  ngOnInit(): void {
    // Listen to route parameters for SKU
    this.route.paramMap.subscribe(params => {
      const sku = params.get('sku');
      if (sku) {
        const item = this.prestifyService.items().find(i => i.sku?.toLowerCase() === sku.toLowerCase());
        if (item) {
          this.selectedItem.set(item);
          this.destroyMap();
        }
      }
    });

    // Listen to query parameters to auto-select an item (backward compatibility)
    this.route.queryParams.subscribe(params => {
      const itemId = params['itemId'];
      if (itemId) {
        const item = this.prestifyService.items().find(i => i.id === itemId);
        if (item) {
          this.selectedItem.set(item);
          this.destroyMap();
        }
      }
    });

    // Bridge for map button callbacks
    if (typeof window !== 'undefined') {
      (window as any).catalogComponentRef = {
        selectItemFromMap: (id: string) => this.selectItemFromMap(id)
      };
    }
  }

  ngAfterViewInit(): void {
    if (!this.selectedItem()) {
      this.initMapDeferred();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
    if (typeof window !== 'undefined' && (window as any).catalogComponentRef) {
      delete (window as any).catalogComponentRef;
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

      this.filteredItems().forEach(item => {
        if (item.status !== 'vendido') {
          const marker = L.marker([item.lat, item.lng]).addTo(this.mapInstance);
          
          const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 180px; padding: 4px;">
              <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: #8b5cf6;">${item.category}</span>
              <h4 style="margin: 2px 0 6px 0; font-size: 0.95rem; font-family: 'Outfit', sans-serif; font-weight: 700; color: #0f172a;">${item.title}</h4>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="background-color: ${item.status === 'disponible' ? '#e1fbf2' : '#fef3c7'}; color: ${item.status === 'disponible' ? '#10b981' : '#f59e0b'}; padding: 2px 6px; font-size: 0.65rem; border-radius: 20px; font-weight: 700;">
                  ${item.status === 'disponible' ? 'Disponible' : 'Prestado'}
                </span>
                <strong style="color: #6366f1; font-size: 0.85rem;">${this.prestifyService.formatPrice(item.price)}</strong>
              </div>
              <button 
                style="width: 100%; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;"
                onclick="window.catalogComponentRef.selectItemFromMap('${item.id}')">
                Ver Ficha
              </button>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
      });
    } catch (e) {
      console.error('Error initializing Leaflet map on catalog:', e);
    }
  }

  public selectItemFromMap(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (item) {
      this.openItemDetail(item);
    }
  }

  public openItemDetail(item: Item): void {
    this.selectedItem.set(item);
    if (item.sku) {
      this.router.navigate(['/catalog/sku', item.sku.toLowerCase()]);
    } else {
      this.router.navigate([], { relativeTo: this.route, queryParams: { itemId: item.id } });
    }
    this.destroyMap();
  }

  public closeItemDetail(): void {
    this.selectedItem.set(null);
    this.router.navigate(['/catalog']);
    this.initMapDeferred();
  }

  public getOwnerDetails(ownerName: string): User | null {
    return this.prestifyService.users().find(u => u.name.toLowerCase() === ownerName.toLowerCase()) || null;
  }

  public selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.initMapDeferred();
  }

  public openChecklist(action: 'borrow' | 'return' | 'buy', item: Item): void {
    const user = this.prestifyService.currentUser();
    if (!user) {
      this.prestifyService.openAuthModal('login');
      return;
    }
    
    if (action === 'borrow' || action === 'buy') {
      this.prestifyService.openCheckout(action, item);
    } else {
      this.prestifyService.openChecklistModal(action, item);
    }
  }

  public deleteItem(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`¿Estás seguro de que quieres eliminar "${item.title}"?`)) {
      this.prestifyService.deleteItem(itemId);
      this.selectedItem.set(null);
      this.initMapDeferred();
    }
  }
}
