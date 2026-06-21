import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PrestifyService, Item, User, Transaction } from '../../services/prestify.service';
import { App } from '../../app';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  public readonly prestifyService = inject(PrestifyService);
  private readonly router = inject(Router);
  private readonly appComponent = inject(App);

  // Active view tab: 'info' (Personal Details) or 'items' (My Items Grid)
  public readonly activeTab = signal<'info' | 'items'>('info');

  // Password visibility toggle
  public readonly showPassword = signal<boolean>(false);

  // User Profile Form State
  public profileName = '';
  public profileType: 'vecino' | 'institucion' | 'empresa' = 'vecino';
  public profileMpAlias = '';
  public profilePhone = '';
  public profilePassword = '';
  public profilePhotoUrl = '';          // Current photo preview (base64 or URL)
  public readonly isUploadingPhoto = signal<boolean>(false);

  // Product Editing Modal & Form State
  public readonly showProductModal = signal<boolean>(false);
  public productFormId = '';
  public productFormTitle = '';
  public productFormDesc = '';
  public productFormCategory: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Libros' | 'Otros' = 'Electrónica';
  public productFormOwner = '';
  public productFormPhoto = '';
  public productFormCondition: 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Aceptable' = 'Bueno';
  public productFormMode: 'prestamo' | 'venta' = 'prestamo';
  public productFormPrice = 0;
  public productFormLat = -34.6037;
  public productFormLng = -58.3816;
  public productFormSku = '';

  // Computed properties
  public readonly myPublishedItems = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return [];
    return this.prestifyService.items().filter(item => 
      item.owner.toLowerCase() === currentUser.name.toLowerCase()
    );
  });

  // Calculate the total transactions where the current user is owner or borrower/buyer
  public readonly totalUserTransactions = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return 0;
    return this.prestifyService.transactions().filter(tx => 
      tx.owner.toLowerCase() === currentUser.name.toLowerCase() ||
      tx.borrowerOrBuyer.toLowerCase() === currentUser.name.toLowerCase()
    ).length;
  });

  ngOnInit(): void {
    // Auth Guard check: redirect to landing if not logged in
    if (!this.prestifyService.currentUser()) {
      this.router.navigate(['/landing']);
      this.prestifyService.showToast('Inicia sesión para acceder a tu perfil.', 'info');
      return;
    }
    
    this.loadUserProfile();
  }

  public loadUserProfile(): void {
    const currentUser = this.prestifyService.currentUser();
    if (currentUser) {
      this.profileName = currentUser.name;
      this.profileType = currentUser.type;
      this.profileMpAlias = currentUser.mpAlias || '';
      this.profilePhone = currentUser.phone || '';
      this.profilePhotoUrl = currentUser.photoUrl || '';

      // Find password from full user array (passwords are omitted in session signal for security)
      const fullUser = this.prestifyService.users().find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
      this.profilePassword = fullUser?.password || '';
    }
  }

  public saveProfile(): void {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return;

    const oldName = currentUser.name;
    const newName = this.profileName.trim();

    if (!newName) {
      this.prestifyService.showToast('El nombre no puede estar vacío.', 'warning');
      return;
    }

    const updatedData: Partial<User> = {
      name: newName,
      type: this.profileType,
      mpAlias: this.profileMpAlias,
      phone: this.profilePhone,
      photoUrl: this.profilePhotoUrl || undefined
    };

    if (this.profilePassword) {
      updatedData.password = this.profilePassword;
    }

    const result = this.prestifyService.updateUser(currentUser.email, updatedData);
    if (result.success) {
      // Sync item and transaction owner/borrower names if the name was modified
      if (oldName.toLowerCase() !== newName.toLowerCase()) {
        // Update items owned or borrowed by this user
        this.prestifyService.items().forEach(item => {
          if (item.owner.toLowerCase() === oldName.toLowerCase()) {
            this.prestifyService.updateItemDetails(item.id, { owner: newName });
          }
          if (item.borrower && item.borrower.toLowerCase() === oldName.toLowerCase()) {
            this.prestifyService.updateItemDetails(item.id, { borrower: newName });
          }
        });

        // Update transactions where this user is owner or borrower/buyer
        this.prestifyService.transactions().forEach(tx => {
          const updatedTx: Partial<Transaction> = {};
          let txChanged = false;
          if (tx.owner.toLowerCase() === oldName.toLowerCase()) {
            updatedTx.owner = newName;
            txChanged = true;
          }
          if (tx.borrowerOrBuyer.toLowerCase() === oldName.toLowerCase()) {
            updatedTx.borrowerOrBuyer = newName;
            txChanged = true;
          }
          if (txChanged) {
            this.prestifyService.updateTransactionDetails(tx.id, updatedTx);
          }
        });
      }

      this.prestifyService.showToast('¡Perfil actualizado con éxito!', 'success');
      this.loadUserProfile();
    } else {
      this.prestifyService.showToast(result.error || 'Error al actualizar el perfil.', 'warning');
    }
  }

  // --- MY ITEMS GRID ACTIONS ---
  public triggerGlobalPublishModal(): void {
    this.appComponent.openAddModal();
  }

  public openEditProductModal(item: Item): void {
    this.productFormId = item.id;
    this.productFormTitle = item.title;
    this.productFormDesc = item.description;
    this.productFormCategory = item.category;
    this.productFormOwner = item.owner;
    this.productFormPhoto = item.photoUrl;
    this.productFormCondition = item.condition;
    this.productFormMode = item.mode;
    this.productFormPrice = item.price;
    this.productFormLat = item.lat;
    this.productFormLng = item.lng;
    this.productFormSku = item.sku || '';

    this.showProductModal.set(true);
  }

  public closeProductModal(): void {
    this.showProductModal.set(false);
  }

  public onProductFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.productFormPhoto = reader.result as string;
        this.prestifyService.showToast('Foto cargada correctamente.', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  /** Handles profile photo file selection — converts to base64 and saves immediately */
  public onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.prestifyService.showToast('La foto no debe superar los 2 MB.', 'warning');
      return;
    }
    this.isUploadingPhoto.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.profilePhotoUrl = reader.result as string;
      this.isUploadingPhoto.set(false);
      // Save immediately to user profile
      const currentUser = this.prestifyService.currentUser();
      if (currentUser) {
        this.prestifyService.updateUser(currentUser.email, { photoUrl: this.profilePhotoUrl });
        this.prestifyService.showToast('¡Foto de perfil actualizada!', 'success');
      }
    };
    reader.onerror = () => {
      this.isUploadingPhoto.set(false);
      this.prestifyService.showToast('Error al cargar la imagen.', 'warning');
    };
    reader.readAsDataURL(file);
  }

  /** Removes the profile photo */
  public removeProfilePhoto(): void {
    this.profilePhotoUrl = '';
    const currentUser = this.prestifyService.currentUser();
    if (currentUser) {
      this.prestifyService.updateUser(currentUser.email, { photoUrl: undefined });
      this.prestifyService.showToast('Foto de perfil eliminada.', 'info');
    }
  }

  public saveProduct(): void {
    if (!this.productFormTitle.trim() || !this.productFormOwner.trim()) {
      this.prestifyService.showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    const result = this.prestifyService.updateItemDetails(this.productFormId, {
      title: this.productFormTitle,
      description: this.productFormDesc,
      category: this.productFormCategory,
      owner: this.productFormOwner,
      photoUrl: this.productFormPhoto,
      condition: this.productFormCondition,
      mode: this.productFormMode,
      price: this.productFormPrice,
      lat: this.productFormLat,
      lng: this.productFormLng,
      sku: this.productFormSku
    });

    if (result.success) {
      this.prestifyService.showToast(`Artículo "${this.productFormTitle}" actualizado con éxito.`, 'success');
      this.closeProductModal();
    } else {
      this.prestifyService.showToast(result.error || 'Error al actualizar el artículo.', 'warning');
    }
  }

  public deleteProduct(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`¿Estás seguro de que quieres eliminar "${item.title}"? Esta acción no se puede deshacer.`)) {
      this.prestifyService.deleteItem(itemId);
      this.prestifyService.showToast('Artículo eliminado con éxito.', 'info');
    }
  }

  public onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const csvContent = reader.result as string;
        this.importItemsFromCsv(csvContent);
        input.value = ''; // Reset input
      };
      reader.readAsText(file);
    }
  }

  public importItemsFromCsv(content: string): void {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return;

    const lines = content.split(/\r?\n/);
    if (lines.length <= 1) {
      this.prestifyService.showToast('El archivo CSV está vacío o no contiene datos.', 'warning');
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    const titleIndex = headers.indexOf('title');
    const descIndex = headers.indexOf('description');
    const categoryIndex = headers.indexOf('category');
    const conditionIndex = headers.indexOf('condition');
    const modeIndex = headers.indexOf('mode');
    const priceIndex = headers.indexOf('price');
    const skuIndex = headers.indexOf('sku');
    const photoIndex = headers.indexOf('photourl');
    const latIndex = headers.indexOf('lat');
    const lngIndex = headers.indexOf('lng');

    if (titleIndex === -1) {
      this.prestifyService.showToast('El CSV debe contener al menos una columna "title".', 'warning');
      return;
    }

    let importCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = this.parseCsvLine(line);

      const title = cells[titleIndex];
      if (!title) continue;

      const description = descIndex !== -1 ? cells[descIndex] || '' : '';
      
      let category = (categoryIndex !== -1 ? cells[categoryIndex] : 'Otros') as any;
      const validCategories = ['Electrónica', 'Deportes', 'Herramientas', 'Juegos', 'Salud', 'Indumentaria', 'Libros', 'Otros'];
      const matchedCat = validCategories.find(c => c.toLowerCase() === String(category).toLowerCase().trim());
      category = matchedCat || 'Otros';

      let condition = (conditionIndex !== -1 ? cells[conditionIndex] : 'Bueno') as any;
      const validConditions = ['Nuevo', 'Como nuevo', 'Bueno', 'Aceptable'];
      const matchedCond = validConditions.find(c => c.toLowerCase() === String(condition).toLowerCase().trim());
      condition = matchedCond || 'Bueno';

      let mode = (modeIndex !== -1 ? cells[modeIndex] : 'prestamo') as any;
      mode = (String(mode).toLowerCase().trim() === 'venta') ? 'venta' : 'prestamo';

      const priceVal = priceIndex !== -1 ? parseFloat(cells[priceIndex]) : 0;
      const price = isNaN(priceVal) ? 0 : priceVal;

      const sku = skuIndex !== -1 ? cells[skuIndex] || undefined : undefined;
      const photoUrl = photoIndex !== -1 ? cells[photoIndex] || 'assets/placeholder.jpg' : 'assets/placeholder.jpg';

      const latVal = latIndex !== -1 ? parseFloat(cells[latIndex]) : -34.6037;
      const lat = isNaN(latVal) ? -34.6037 : latVal;

      const lngVal = lngIndex !== -1 ? parseFloat(cells[lngIndex]) : -58.3816;
      const lng = isNaN(lngVal) ? -58.3816 : lngVal;

      this.prestifyService.addItem({
        title,
        description,
        category,
        condition,
        mode,
        price,
        owner: currentUser.name,
        photoUrl,
        lat,
        lng,
        sku
      });
      importCount++;
    }

    if (importCount > 0) {
      this.prestifyService.showToast(`¡Se importaron ${importCount} objetos con éxito!`, 'success');
      this.loadUserProfile();
    } else {
      this.prestifyService.showToast('No se pudieron importar objetos del CSV.', 'warning');
    }
  }

  public exportToCsv(): void {
    const items = this.myPublishedItems();
    if (items.length === 0) return;

    const headers = ['title', 'description', 'category', 'condition', 'mode', 'price', 'sku', 'photoUrl', 'lat', 'lng'];
    
    const rows = items.map(item => {
      return [
        this.escapeCsvCell(item.title),
        this.escapeCsvCell(item.description),
        this.escapeCsvCell(item.category),
        this.escapeCsvCell(item.condition),
        this.escapeCsvCell(item.mode),
        item.price,
        this.escapeCsvCell(item.sku || ''),
        this.escapeCsvCell(item.photoUrl),
        item.lat,
        item.lng
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mis_Objetos_SKU_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.prestifyService.showToast('¡CSV de objetos exportado con éxito!', 'success');
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  }

  private escapeCsvCell(val: string): string {
    if (!val) return '';
    const clean = val.replace(/"/g, '""');
    if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
      return `"${clean}"`;
    }
    return clean;
  }
}


