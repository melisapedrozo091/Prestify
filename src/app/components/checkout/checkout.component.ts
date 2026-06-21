import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrestifyService, Item, Transaction } from '../../services/prestify.service';

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
  
  // Handover Checklist boxes (not used for validation now, only Terms)
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
    return item.price; 
  }

  public getSellerAlias(): string {
    const item = this.prestifyService.checkoutItem();
    if (!item) return '';
    const seller = this.prestifyService.users().find(u => u.name.toLowerCase() === item.owner.toLowerCase());
    return seller?.mpAlias || item.owner.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  }

  public getSellerPhone(): string {
    const item = this.prestifyService.checkoutItem();
    if (!item) return '';
    const seller = this.prestifyService.users().find(u => u.name.toLowerCase() === item.owner.toLowerCase());
    return seller?.phone || 'No especificado';
  }

  public handleConfirm(): void {
    const item = this.prestifyService.checkoutItem();
    if (!item) return;

    if (!this.name.trim()) {
      this.prestifyService.showToast('Por favor introduce tu nombre.', 'warning');
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

    let createdTx: Transaction | undefined;

    if (this.prestifyService.checkoutAction() === 'borrow') {
      createdTx = this.prestifyService.borrowItem(
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
      createdTx = this.prestifyService.buyItem(
        item.id,
        this.name,
        item.price,
        verificationLog,
        this.paymentMethod
      );
      this.prestifyService.showToast(`Solicitud de compra registrada para "${item.title}". Pendiente de aprobación por el dueño.`, 'success');
    }

    // If cash payment, download PDF ticket directly
    if (createdTx && this.paymentMethod === 'efectivo') {
      this.prestifyService.downloadTicket(createdTx);
    }

    this.prestifyService.closeCheckout();
  }

  public handleCancel(): void {
    this.prestifyService.closeCheckout();
  }
}
