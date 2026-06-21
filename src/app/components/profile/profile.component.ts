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
      phone: this.profilePhone
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
}
