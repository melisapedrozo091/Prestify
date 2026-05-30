import { Component, signal, computed, inject, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestifyService, Item, Transaction, User } from './services/prestify.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit {
  public readonly prestifyService = inject(PrestifyService);

  // Map reference
  private mapInstance: any = null;

  // App Navigation & UI State
  public readonly currentTab = signal<'landing' | 'catalog' | 'dashboard' | 'history'>('landing');
  public readonly theme = signal<'light' | 'dark'>('dark');
  public readonly searchQuery = signal<string>('');
  public readonly selectedCategory = signal<string>('Todos');

  // Unified Auth Modal State
  public readonly showAuthModal = signal<boolean>(false);
  public readonly authMode = signal<'login' | 'register' | 'recover'>('login');
  
  // Auth Form Fields
  public loginEmail = '';
  public loginPassword = '';
  public registerName = '';
  public registerEmail = '';
  public registerPassword = '';
  public registerRole: 'usuario' | 'admin' = 'usuario';
  public registerType: 'vecino' | 'institucion' | 'empresa' = 'vecino';
  public recoveryEmail = '';

  // Add Item Modal Form State
  public readonly showAddModal = signal<boolean>(false);
  public newItemTitle = '';
  public newItemDesc = '';
  public newItemCategory: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Otros' = 'Electrónica';
  public newItemOwner = '';
  public newItemPhoto = '';
  public newItemCondition: 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Aceptable' = 'Bueno';
  public newItemMode: 'prestamo' | 'venta' = 'prestamo';
  public newItemPrice = 0; // 0 if free, >0 if paid
  public newItemLat = -34.6037;
  public newItemLng = -58.3816;

  // Checklist Dialog Modals State
  public readonly showChecklistModal = signal<boolean>(false);
  public checklistAction: 'borrow' | 'return' | 'buy' = 'borrow';
  public checklistItem: Item | null = null;

  // Checklist checklist properties (mandatory verification)
  public checkLimpio = false;
  public checkEstructura = false;
  public checkMecanico = false;
  public checkAccesorios = false;
  
  // Return rating review
  public returnRating = 5;

  // Borrow Modal Form State
  public borrowerName = '';
  public dueDate = '';
  public borrowNotes = '';

  // Notification Toasts State
  public readonly toasts = signal<{ message: string; type: 'success' | 'info' | 'warning' }[]>([]);

  // Computed Values for Layout & Filters
  public readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
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
        (item.borrower && item.borrower.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  // Items currently borrowed or purchased by active user
  public readonly myBorrowedItems = computed(() => {
    const currentUser = this.prestifyService.currentUser();
    if (!currentUser) return [];
    
    return this.prestifyService.items().filter(item => 
      item.status === 'prestado' && 
      item.borrower?.toLowerCase() === currentUser.name.toLowerCase()
    );
  });

  ngOnInit(): void {
    // Load theme from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = window.localStorage.getItem('prestify_theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        this.theme.set(savedTheme);
      }
    }
    this.applyTheme();

    // Map Global callback bridge
    if (typeof window !== 'undefined') {
      (window as any).angularComponentRef = {
        selectItemFromMap: (id: string) => this.selectItemFromMap(id)
      };
    }

    // Default redirect to dashboard if logged in
    if (this.prestifyService.currentUser()) {
      this.currentTab.set('dashboard');
    }
  }

  ngAfterViewInit(): void {
    this.initMapDeferred();
  }

  // --- Map Initialization ---
  private initMapDeferred(): void {
    setTimeout(() => {
      this.initLeafletMap();
    }, 300);
  }

  private initLeafletMap(): void {
    if (typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    // Look for map element in the DOM
    const mapElement = document.getElementById('map-container');
    if (!mapElement) return;

    try {
      if (this.mapInstance) {
        this.mapInstance.remove();
        this.mapInstance = null;
      }

      this.mapInstance = L.map('map-container').setView([-34.6037, -58.3816], 13); // Buenos Aires Center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.mapInstance);

      // Add markers
      this.filteredItems().forEach(item => {
        if (item.status !== 'vendido') {
          // Style markers based on category and status
          const marker = L.marker([item.lat, item.lng]).addTo(this.mapInstance);
          
          const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 180px; padding: 4px;">
              <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: #8b5cf6;">${item.category}</span>
              <h4 style="margin: 2px 0 6px 0; font-size: 0.95rem; font-family: 'Outfit', sans-serif; font-weight: 700; color: #0f172a;">${item.title}</h4>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="badge" style="background-color: ${item.status === 'disponible' ? '#e1fbf2' : '#fef3c7'}; color: ${item.status === 'disponible' ? '#10b981' : '#f59e0b'}; padding: 2px 6px; font-size: 0.65rem; border-radius: 20px; font-weight: 700;">
                  ${item.status === 'disponible' ? 'Disponible' : 'Prestado'}
                </span>
                <strong style="color: #6366f1; font-size: 0.85rem;">${item.price > 0 ? '$' + item.price : 'Gratis'}</strong>
              </div>
              <button 
                style="width: 100%; border: none; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;"
                onclick="window.angularComponentRef.selectItemFromMap('${item.id}')">
                Ver Ficha
              </button>
            </div>
          `;
          marker.bindPopup(popupContent);
        }
      });
    } catch (e) {
      console.error('Error initializing Leaflet map:', e);
    }
  }

  public selectItemFromMap(itemId: string): void {
    // Focus search on this item or navigate directly
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (item) {
      this.searchQuery.set(item.title);
      this.showToast(`Filtro aplicado: ${item.title}`, 'info');
      // If in landing tab, route to catalog to interact
      if (this.currentTab() === 'landing') {
        this.currentTab.set('catalog');
      }
    }
  }

  public setTab(tab: 'landing' | 'catalog' | 'dashboard' | 'history'): void {
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.selectedCategory.set('Todos');
    
    // Refresh map if landing or catalog
    if (tab === 'landing' || tab === 'catalog') {
      this.initMapDeferred();
    }
  }

  public selectCategory(category: string): void {
    this.selectedCategory.set(category);
    // Refresh map markers by reinitializing
    this.initMapDeferred();
  }

  public toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('prestify_theme', nextTheme);
    }
    this.applyTheme();
    this.showToast(`Modo ${nextTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
  }

  private applyTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme());
    }
  }

  // Toast Notification Manager
  public showToast(message: string, type: 'success' | 'info' | 'warning' = 'success'): void {
    const toast = { message, type };
    this.toasts.update(current => [...current, toast]);
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t !== toast));
    }, 4500);
  }

  // --- Auth Actions ---
  public openAuthModal(mode: 'login' | 'register' | 'recover' = 'login'): void {
    this.authMode.set(mode);
    this.showAuthModal.set(true);
  }

  public closeAuthModal(): void {
    this.showAuthModal.set(false);
    this.resetAuthForms();
  }

  public setAuthMode(mode: 'login' | 'register' | 'recover'): void {
    this.authMode.set(mode);
  }

  public handleLogin(): void {
    if (!this.loginEmail.trim() || !this.loginPassword.trim()) {
      this.showToast('Por favor completa todos los campos.', 'warning');
      return;
    }

    const result = this.prestifyService.login(this.loginEmail, this.loginPassword);
    if (result.success) {
      const user = this.prestifyService.currentUser();
      this.showToast(`¡Sesión iniciada! Bienvenido, ${user?.name}.`, 'success');
      this.closeAuthModal();
      this.currentTab.set('dashboard');
    } else {
      this.showToast(result.error || 'Error de credenciales.', 'warning');
    }
  }

  public handleRegister(): void {
    if (!this.registerName.trim() || !this.registerEmail.trim() || !this.registerPassword.trim()) {
      this.showToast('Por favor completa todos los campos.', 'warning');
      return;
    }

    const result = this.prestifyService.register({
      name: this.registerName,
      email: this.registerEmail,
      password: this.registerPassword,
      role: this.registerRole,
      type: this.registerType,
      reputation: 5,
      reputationCount: 1
    });

    if (result.success) {
      const user = this.prestifyService.currentUser();
      this.showToast(`¡Registro exitoso! Cuenta creada como ${user?.type}.`, 'success');
      this.closeAuthModal();
      this.currentTab.set('dashboard');
    } else {
      this.showToast(result.error || 'Error al registrar.', 'warning');
    }
  }

  public handleRecovery(): void {
    if (!this.recoveryEmail.trim()) {
      this.showToast('Por favor introduce tu correo electrónico.', 'warning');
      return;
    }

    const result = this.prestifyService.recoverPassword(this.recoveryEmail);
    if (result.success) {
      this.showToast(result.message || 'Contraseña restablecida.', 'success');
      this.authMode.set('login');
    } else {
      this.showToast(result.message || 'El correo no está registrado.', 'warning');
    }
  }

  public handleLogout(): void {
    this.prestifyService.logout();
    this.showToast('Sesión cerrada.', 'info');
    this.currentTab.set('landing');
    this.initMapDeferred();
  }

  // --- Checklist Handover & Return Actions ---
  public openChecklistModal(action: 'borrow' | 'return' | 'buy', item: Item): void {
    const user = this.prestifyService.currentUser();
    if (!user) {
      this.showToast('Debes iniciar sesión para realizar transacciones.', 'info');
      this.openAuthModal('login');
      return;
    }

    this.checklistAction = action;
    this.checklistItem = item;
    
    // Reset checks
    this.checkLimpio = false;
    this.checkEstructura = false;
    this.checkMecanico = false;
    this.checkAccesorios = false;
    this.returnRating = 5;

    // Set default borrow values
    this.borrowerName = user.name;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.dueDate = nextWeek.toISOString().split('T')[0];
    this.borrowNotes = '';

    this.showChecklistModal.set(true);
  }

  public closeChecklistModal(): void {
    this.showChecklistModal.set(false);
    this.checklistItem = null;
  }

  public handleChecklistSubmit(): void {
    const item = this.checklistItem;
    if (!item) return;

    // All checklist boxes must be checked
    if (!this.checkLimpio || !this.checkEstructura || !this.checkMecanico || !this.checkAccesorios) {
      this.showToast('Es obligatorio verificar todos los puntos del Checklist para garantizar las condiciones óptimas.', 'warning');
      return;
    }

    const verificationLog = [
      'Limpio y desinfectado',
      'Sin daños estructurales',
      'Funcionamiento verificado',
      'Accesorios completos'
    ];

    if (this.checklistAction === 'borrow') {
      this.prestifyService.borrowItem(
        item.id,
        this.borrowerName,
        this.dueDate,
        item.price, // Same price configured
        verificationLog,
        this.borrowNotes
      );
      this.showToast(`Préstamo iniciado para "${item.title}".`, 'success');
      this.currentTab.set('dashboard');
    } else if (this.checklistAction === 'buy') {
      this.prestifyService.buyItem(
        item.id,
        this.borrowerName,
        item.price,
        verificationLog
      );
      this.showToast(`¡Compra finalizada de "${item.title}"! Pago pendiente en entrega presencial.`, 'success');
      this.currentTab.set('dashboard');
    } else if (this.checklistAction === 'return') {
      this.prestifyService.returnItem(
        item.id,
        verificationLog,
        this.returnRating
      );
      this.showToast(`Devolución procesada y calificación registrada exitosamente.`, 'success');
      this.currentTab.set('dashboard');
    }

    this.closeChecklistModal();
    this.initMapDeferred();
  }

  // --- Add Item ---
  public openAddModal(): void {
    const user = this.prestifyService.currentUser();
    if (!user) {
      this.showToast('Inicia sesión para registrar objetos.', 'info');
      this.openAuthModal('login');
      return;
    }
    
    this.newItemOwner = user.name;
    
    // Spread coordinates around Buenos Aires center slightly for map diversity
    this.newItemLat = -34.6037 + (Math.random() - 0.5) * 0.04;
    this.newItemLng = -58.3816 + (Math.random() - 0.5) * 0.04;
    
    this.showAddModal.set(true);
  }

  public closeAddModal(): void {
    this.showAddModal.set(false);
    this.resetAddForm();
  }

  public handleAddItem(): void {
    if (!this.newItemTitle.trim() || !this.newItemOwner.trim()) {
      this.showToast('Por favor rellena los campos requeridos.', 'warning');
      return;
    }

    let photo = this.newItemPhoto.trim();
    if (!photo) {
      const categoryImages: { [key: string]: string } = {
        'Electrónica': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=80',
        'Deportes': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop&q=80',
        'Herramientas': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop&q=80',
        'Juegos': 'https://images.unsplash.com/photo-1585504198199-20277593b94f?w=500&auto=format&fit=crop&q=80',
        'Salud': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=80',
        'Indumentaria': 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=500&auto=format&fit=crop&q=80',
        'Otros': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
      };
      photo = categoryImages[this.newItemCategory] || categoryImages['Otros'];
    }

    this.prestifyService.addItem({
      title: this.newItemTitle,
      description: this.newItemDesc,
      category: this.newItemCategory,
      owner: this.newItemOwner,
      photoUrl: photo,
      condition: this.newItemCondition,
      mode: this.newItemMode,
      price: this.newItemPrice,
      lat: this.newItemLat,
      lng: this.newItemLng
    });

    this.showToast(`¡Objeto "${this.newItemTitle}" registrado para ${this.newItemMode === 'prestamo' ? 'Préstamo' : 'Venta'}!`, 'success');
    this.closeAddModal();
    this.currentTab.set('catalog');
    this.initMapDeferred();
  }

  public handleDeleteItem(itemId: string): void {
    const item = this.prestifyService.items().find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`¿Estás seguro de que quieres eliminar "${item.title}"?`)) {
      this.prestifyService.deleteItem(itemId);
      this.showToast(`Objeto eliminado del catálogo.`, 'info');
      this.initMapDeferred();
    }
  }

  public handleConfirmPayment(txId: string): void {
    this.prestifyService.confirmPayment(txId);
    this.showToast('Pago presencial registrado y confirmado.', 'success');
  }

  private resetAuthForms(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.registerName = '';
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerRole = 'usuario';
    this.registerType = 'vecino';
    this.recoveryEmail = '';
  }

  private resetAddForm(): void {
    this.newItemTitle = '';
    this.newItemDesc = '';
    this.newItemCategory = 'Electrónica';
    this.newItemOwner = '';
    this.newItemPhoto = '';
    this.newItemCondition = 'Bueno';
    this.newItemMode = 'prestamo';
    this.newItemPrice = 0;
  }
}
