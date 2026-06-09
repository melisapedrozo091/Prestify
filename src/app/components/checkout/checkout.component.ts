import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrestifyService, Item } from '../../services/prestify.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  public readonly prestifyService = inject(PrestifyService);

  // Form Fields
  public name = '';
  public dueDate = '';
  public notes = '';
  public paymentMethod: 'efectivo' | 'mercadopago' = 'efectivo';
  
  // Handover Checklist boxes (mandatory)
  public checkLimpio = false;
  public checkEstructura = false;
  public checkMecanico = false;
  public checkAccesorios = false;
  public checkTerms = false;

  ngOnInit(): void {
    const user = this.prestifyService.currentUser();
    if (user) {
      this.name = user.name;
    }

    // Default due date: 7 days from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.dueDate = nextWeek.toISOString().split('T')[0];
  }

  // Compute estimate days for loan
  public get loanDurationDays(): number {
    if (!this.dueDate) return 1;
    const start = new Date();
    const end = new Date(this.dueDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }

  public get totalCost(): number {
    const item = this.prestifyService.checkoutItem();
    if (!item) return 0;
    if (item.mode === 'venta') return item.price;
    // Loan cost (either flat or per day. Let's make it flat or daily. Let's make it flat price, or display it clearly as total cost)
    return item.price; 
  }

  public handleConfirm(): void {
    const item = this.prestifyService.checkoutItem();
    if (!item) return;

    if (!this.name.trim()) {
      this.prestifyService.showToast('Por favor introduce tu nombre.', 'warning');
      return;
    }

    // Verify checklist
    if (!this.checkLimpio || !this.checkEstructura || !this.checkMecanico || !this.checkAccesorios) {
      this.prestifyService.showToast('Es obligatorio verificar todos los puntos del Checklist de entrega.', 'warning');
      return;
    }

    // Verify terms
    if (!this.checkTerms) {
      this.prestifyService.showToast('Debes aceptar los términos y condiciones de la plataforma.', 'warning');
      return;
    }

    const verificationLog = [
      'Limpio y desinfectado',
      'Sin daños estructurales',
      'Funcionamiento verificado',
      'Accesorios completos'
    ];

    if (this.prestifyService.checkoutAction() === 'borrow') {
      this.prestifyService.borrowItem(
        item.id,
        this.name,
        this.dueDate,
        item.price,
        verificationLog,
        this.notes,
        this.paymentMethod
      );
      this.prestifyService.showToast(`Solicitud de préstamo registrada para "${item.title}". Pendiente de aprobación por el dueño.`, 'success');
    } else {
      this.prestifyService.buyItem(
        item.id,
        this.name,
        item.price,
        verificationLog,
        this.paymentMethod
      );
      this.prestifyService.showToast(`Solicitud de compra registrada para "${item.title}". Pendiente de aprobación por el dueño.`, 'success');
    }

    this.prestifyService.closeCheckout();
  }

  public handleCancel(): void {
    this.prestifyService.closeCheckout();
  }
}
