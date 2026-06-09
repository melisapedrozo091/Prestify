import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PrestifyService, Item, User, Transaction } from '../../services/prestify.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  public readonly prestifyService = inject(PrestifyService);
  private readonly router = inject(Router);

  // Active Admin Sub-tab
  public readonly adminTab = signal<'users' | 'catalog' | 'transactions'>('users');

  // User ABM Modal & Form State
  public readonly showUserModal = signal<boolean>(false);
  public readonly userModalMode = signal<'create' | 'edit'>('create');
  
  public userFormEmail = '';
  public userFormName = '';
  public userFormPassword = '';
  public userFormType: 'vecino' | 'institucion' | 'empresa' = 'vecino';
  public userFormReputation = 5;

  // Product Catalog ABM Modal & Form State (Admin)
  public readonly showProductModal = signal<boolean>(false);
  
  public productFormId = '';
  public productFormTitle = '';
  public productFormDesc = '';
  public productFormCategory: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Otros' = 'Electrónica';
  public productFormOwner = '';
  public productFormPhoto = '';
  public productFormCondition: 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Aceptable' = 'Bueno';
  public productFormMode: 'prestamo' | 'venta' = 'prestamo';
  public productFormPrice = 0;
  public productFormLat = -34.6037;
  public productFormLng = -58.3816;
  public productFormSku = '';

  // Filter out the primary Admin from the User ABM listing for a cleaner look
  public readonly regularUsers = computed(() => {
    return this.prestifyService.users().filter(u => u.email !== 'contacto@municipio.org');
  });

  // Computed Values for Regular Users
  public readonly myBorrowedItems = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return [];
    
    return this.prestifyService.items().filter(item => 
      item.status === 'prestado' && 
      item.borrower?.toLowerCase() === currentUser.name.toLowerCase()
    );
  });

  // Transactions requested by me (rentals or purchases)
  public readonly myRequestedTransactions = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return [];
    
    return this.prestifyService.transactions().filter(tx => 
      tx.borrowerOrBuyer.toLowerCase() === currentUser.name.toLowerCase()
    );
  });

  // Pending requests received for items I own (Approval flow)
  public readonly myReceivedRequests = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return [];

    return this.prestifyService.transactions().filter(tx => 
      tx.owner.toLowerCase() === currentUser.name.toLowerCase() &&
      tx.approvalStatus === 'pendiente'
    );
  });

  ngOnInit(): void {
    // Auth Guard check: redirect to landing if not logged in
    if (!this.prestifyService.currentUser()) {
      this.router.navigate(['/landing']);
      this.prestifyService.showToast('Inicia sesión para acceder al panel.', 'info');
    }
  }

  public handleConfirmPayment(txId: string): void {
    this.prestifyService.confirmPayment(txId);
    this.prestifyService.showToast('Pago presencial registrado y verificado.', 'success');
  }

  public openChecklist(action: 'borrow' | 'return' | 'buy', item: Item): void {
    this.prestifyService.openChecklistModal(action, item);
  }

  public navigateToCatalog(): void {
    this.router.navigate(['/catalog']);
  }

  // --- Transaction Approval Actions ---
  public handleAcceptRequest(txId: string): void {
    this.prestifyService.acceptTransaction(txId);
    this.prestifyService.showToast('Solicitud aprobada con éxito.', 'success');
  }

  public handleRejectRequest(txId: string): void {
    this.prestifyService.rejectTransaction(txId);
    this.prestifyService.showToast('Solicitud rechazada.', 'info');
  }

  public openTicket(tx: Transaction): void {
    this.prestifyService.openTicketModal(tx);
  }

  // --- USER ABM Methods ---
  public openCreateUserModal(): void {
    this.userFormEmail = '';
    this.userFormName = '';
    this.userFormPassword = '';
    this.userFormType = 'vecino';
    this.userFormReputation = 5.0;
    this.userModalMode.set('create');
    this.showUserModal.set(true);
  }

  public openEditUserModal(user: User): void {
    this.userFormEmail = user.email;
    this.userFormName = user.name;
    this.userFormPassword = user.password || 'user123';
    this.userFormType = user.type;
    this.userFormReputation = user.reputation;
    this.userModalMode.set('edit');
    this.showUserModal.set(true);
  }

  public closeUserModal(): void {
    this.showUserModal.set(false);
  }

  public saveUser(): void {
    if (!this.userFormName.trim() || !this.userFormEmail.trim() || !this.userFormPassword.trim()) {
      this.prestifyService.showToast('Por favor completa los campos obligatorios.', 'warning');
      return;
    }

    if (this.userModalMode() === 'create') {
      const result = this.prestifyService.adminAddUser({
        name: this.userFormName,
        email: this.userFormEmail,
        password: this.userFormPassword,
        role: 'usuario', 
        type: this.userFormType,
        reputation: this.userFormReputation,
        reputationCount: 1
      });

      if (result.success) {
        this.prestifyService.showToast(`Usuario ${this.userFormName} creado exitosamente.`, 'success');
        this.closeUserModal();
      } else {
        this.prestifyService.showToast(result.error || 'Error al crear usuario.', 'warning');
      }
    } else {
      const result = this.prestifyService.updateUser(this.userFormEmail, {
        name: this.userFormName,
        password: this.userFormPassword,
        type: this.userFormType,
        reputation: this.userFormReputation
      });

      if (result.success) {
        this.prestifyService.showToast(`Usuario ${this.userFormName} actualizado correctamente.`, 'success');
        this.closeUserModal();
      } else {
        this.prestifyService.showToast(result.error || 'Error al actualizar usuario.', 'warning');
      }
    }
  }

  public deleteUser(user: User): void {
    if (user.email === 'contacto@municipio.org') {
      this.prestifyService.showToast('No se puede eliminar la cuenta del Administrador principal.', 'warning');
      return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.name}"?`)) {
      const result = this.prestifyService.deleteUser(user.email);
      if (result.success) {
        this.prestifyService.showToast(`Usuario "${user.name}" eliminado de la base de datos.`, 'info');
      } else {
        this.prestifyService.showToast(result.error || 'Error al eliminar usuario.', 'warning');
      }
    }
  }

  // --- CATALOG ABM Methods (Admin) ---
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
        this.prestifyService.showToast('Foto de catálogo cargada correctamente.', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  public saveProduct(): void {
    if (!this.productFormTitle.trim() || !this.productFormOwner.trim()) {
      this.prestifyService.showToast('Por favor rellena los campos requeridos.', 'warning');
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
      this.prestifyService.showToast(`Artículo "${this.productFormTitle}" actualizado en catálogo.`, 'success');
      this.closeProductModal();
    } else {
      this.prestifyService.showToast(result.error || 'Error al actualizar artículo.', 'warning');
    }
  }

  public deleteProduct(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`¿Estás seguro de que quieres eliminar "${item.title}" del catálogo general?`)) {
      this.prestifyService.deleteItem(itemId);
      this.prestifyService.showToast('Artículo eliminado del catálogo.', 'info');
    }
  }
}
