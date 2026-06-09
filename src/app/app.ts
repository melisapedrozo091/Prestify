import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PrestifyService, Item, User } from './services/prestify.service';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { TicketModalComponent } from './components/ticket-modal/ticket-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    CheckoutComponent, 
    TicketModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  public readonly prestifyService = inject(PrestifyService);
  private readonly router = inject(Router);

  // App Theme State
  public readonly theme = signal<'light' | 'dark'>('dark');
  
  // Auth Form Fields
  public loginEmail = '';
  public loginPassword = '';
  public registerName = '';
  public registerEmail = '';
  public registerPassword = '';
  public registerType: 'vecino' | 'institucion' | 'empresa' = 'vecino';
  public recoveryEmail = '';

  // Add Item Modal Form State
  public newItemTitle = '';
  public newItemDesc = '';
  public newItemCategory: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Otros' = 'Electrónica';
  public newItemOwner = '';
  public newItemPhoto = '';
  public newItemCondition: 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Aceptable' = 'Bueno';
  public newItemMode: 'prestamo' | 'venta' = 'prestamo';
  public newItemPrice = 0; 
  public newItemLat = -34.6037;
  public newItemLng = -58.3816;

  // Checklist Dialog Form State
  public checkLimpio = false;
  public checkEstructura = false;
  public checkMecanico = false;
  public checkAccesorios = false;
  public returnRating = 5;
  public borrowerName = '';
  public dueDate = '';
  public borrowNotes = '';

  ngOnInit(): void {
    // Load theme from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = window.localStorage.getItem('prestify_theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        this.theme.set(savedTheme);
      }
    }
    this.applyTheme();
  }

  public toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('prestify_theme', nextTheme);
    }
    this.applyTheme();
    this.prestifyService.showToast(`Modo ${nextTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
  }

  private applyTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.theme());
    }
  }

  // --- Auth Actions ---
  public openAuthModal(mode: 'login' | 'register' | 'recover' = 'login'): void {
    this.prestifyService.openAuthModal(mode);
  }

  public closeAuthModal(): void {
    this.prestifyService.closeAuthModal();
    this.resetAuthForms();
  }

  public setAuthMode(mode: 'login' | 'register' | 'recover'): void {
    this.prestifyService.openAuthModal(mode);
  }

  public handleLogin(): void {
    if (!this.loginEmail.trim() || !this.loginPassword.trim()) {
      this.prestifyService.showToast('Por favor completa todos los campos.', 'warning');
      return;
    }

    const result = this.prestifyService.login(this.loginEmail, this.loginPassword);
    if (result.success) {
      const user = this.prestifyService.currentUser();
      this.prestifyService.showToast(`¡Sesión iniciada! Bienvenido, ${user?.name}.`, 'success');
      this.closeAuthModal();
      this.router.navigate(['/dashboard']);
    } else {
      this.prestifyService.showToast(result.error || 'Error de credenciales.', 'warning');
    }
  }

  public handleRegister(): void {
    if (!this.registerName.trim() || !this.registerEmail.trim() || !this.registerPassword.trim()) {
      this.prestifyService.showToast('Por favor completa todos los campos.', 'warning');
      return;
    }

    // Role is strictly 'usuario' for public registrations
    const result = this.prestifyService.register({
      name: this.registerName,
      email: this.registerEmail,
      password: this.registerPassword,
      role: 'usuario', 
      type: this.registerType,
      reputation: 5,
      reputationCount: 1
    });

    if (result.success) {
      const user = this.prestifyService.currentUser();
      this.prestifyService.showToast(`¡Registro exitoso! Cuenta creada como ${user?.type}.`, 'success');
      this.closeAuthModal();
      this.router.navigate(['/dashboard']);
    } else {
      this.prestifyService.showToast(result.error || 'Error al registrar.', 'warning');
    }
  }

  public handleRecovery(): void {
    if (!this.recoveryEmail.trim()) {
      this.prestifyService.showToast('Por favor introduce tu correo electrónico.', 'warning');
      return;
    }

    const result = this.prestifyService.recoverPassword(this.recoveryEmail);
    if (result.success) {
      this.prestifyService.showToast(result.message || 'Contraseña restablecida.', 'success');
      this.prestifyService.openAuthModal('login');
    } else {
      this.prestifyService.showToast(result.message || 'El correo no está registrado.', 'warning');
    }
  }

  public handleLogout(): void {
    this.prestifyService.logout();
    this.prestifyService.showToast('Sesión cerrada.', 'info');
    this.router.navigate(['/landing']);
  }

  // --- Add Item Actions ---
  public openAddModal(): void {
    const user = this.prestifyService.currentUser();
    if (!user) {
      this.prestifyService.showToast('Inicia sesión para registrar objetos.', 'info');
      this.openAuthModal('login');
      return;
    }
    
    this.newItemOwner = user.name;
    this.newItemLat = -34.6037 + (Math.random() - 0.5) * 0.04;
    this.newItemLng = -58.3816 + (Math.random() - 0.5) * 0.04;
    
    this.prestifyService.showAddModal.set(true);
  }

  public closeAddModal(): void {
    this.prestifyService.showAddModal.set(false);
    this.resetAddForm();
  }

  // File selected from PC
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.newItemPhoto = reader.result as string; // Set Base64 DataURL
        this.prestifyService.showToast('Foto cargada correctamente desde la PC.', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  public handleAddItem(): void {
    if (!this.newItemTitle.trim() || !this.newItemOwner.trim()) {
      this.prestifyService.showToast('Por favor rellena los campos requeridos.', 'warning');
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

    this.prestifyService.showToast(`¡Objeto "${this.newItemTitle}" registrado!`, 'success');
    this.closeAddModal();
    this.router.navigate(['/catalog']);
  }

  // --- Checklist Modal Actions ---
  public openChecklistModal(action: 'borrow' | 'return' | 'buy', item: Item): void {
    const user = this.prestifyService.currentUser();
    if (!user) {
      this.prestifyService.showToast('Debes iniciar sesión para realizar transacciones.', 'info');
      this.openAuthModal('login');
      return;
    }

    this.checkLimpio = false;
    this.checkEstructura = false;
    this.checkMecanico = false;
    this.checkAccesorios = false;
    this.returnRating = 5;

    this.borrowerName = user.name;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.dueDate = nextWeek.toISOString().split('T')[0];
    this.borrowNotes = '';

    this.prestifyService.openChecklistModal(action, item);
  }

  public closeChecklistModal(): void {
    this.prestifyService.closeChecklistModal();
  }

  public handleChecklistSubmit(): void {
    const item = this.prestifyService.checklistItem();
    const action = this.prestifyService.checklistAction();
    if (!item) return;

    if (!this.checkLimpio || !this.checkEstructura || !this.checkMecanico || !this.checkAccesorios) {
      this.prestifyService.showToast('Es obligatorio verificar todos los puntos del Checklist.', 'warning');
      return;
    }

    const verificationLog = [
      'Limpio y desinfectado',
      'Sin daños estructurales',
      'Funcionamiento verificado',
      'Accesorios completos'
    ];

    if (action === 'borrow') {
      this.prestifyService.borrowItem(
        item.id,
        this.borrowerName,
        this.dueDate,
        item.price,
        verificationLog,
        this.borrowNotes
      );
      this.prestifyService.showToast(`Préstamo iniciado para "${item.title}".`, 'success');
    } else if (action === 'buy') {
      this.prestifyService.buyItem(
        item.id,
        this.borrowerName,
        item.price,
        verificationLog
      );
      this.prestifyService.showToast(`¡Compra finalizada de "${item.title}"! Pago pendiente en entrega presencial.`, 'success');
    } else if (action === 'return') {
      this.prestifyService.returnItem(
        item.id,
        verificationLog,
        this.returnRating
      );
      this.prestifyService.showToast(`Devolución procesada y calificación registrada.`, 'success');
    }

    this.closeChecklistModal();
    this.router.navigate(['/dashboard']);
  }

  private resetAuthForms(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.registerName = '';
    this.registerEmail = '';
    this.registerPassword = '';
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
