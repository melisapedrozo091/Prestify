import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrestifyService, Transaction } from '../../services/prestify.service';

@Component({
  selector: 'app-ticket-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-modal.component.html',
  styleUrl: './ticket-modal.component.css'
})
export class TicketModalComponent {
  public readonly prestifyService = inject(PrestifyService);

  public downloadTicket(tx: Transaction): void {
    const isLoan = tx.type === 'prestamo';
    const seller = this.prestifyService.users().find(u => u.name.toLowerCase() === tx.owner.toLowerCase());
    const alias = seller?.mpAlias || 'prestify.mp';
    
    // Generate styled plain text ticket
    const ticketText = `
=========================================================
          PRESTIFY - RED DE ECONOMIA CIRCULAR
                  TICKET DE TRANSACCION
=========================================================
Comprobante N°      : ${tx.ticketNumber}
Fecha de Emisión    : ${tx.dateStarted}
Código SKU          : ${tx.sku}
---------------------------------------------------------
DETALLES DEL PRODUCTO
Título              : ${tx.itemTitle}
Categoría           : ${tx.category}
Propietario         : ${tx.owner}
---------------------------------------------------------
DETALLES DE LA TRANSACCIÓN
Tipo de Operación   : ${isLoan ? 'Préstamo temporal' : 'Compra directa / Adquisición'}
Remitente (Dueño)   : ${tx.owner}
Adquirente (Usuario): ${tx.borrowerOrBuyer}
Duración            : ${isLoan ? (tx.durationDays + ' días (Hasta: ' + tx.dateEndedOrDue + ')') : 'Adquisición definitiva'}
---------------------------------------------------------
DETALLES DE PAGO
Medio de Pago       : ${tx.paymentMethod === 'mercadopago' ? `Mercado Pago (Alias: ${alias})` : 'Efectivo / Entrega Presencial'}
Monto a Transferir  : ${tx.price > 0 ? ('$' + tx.price) : 'Gratuito'}
Estado del Pago     : Pendiente de Cobro Físico / Digital
---------------------------------------------------------
CÓDIGO DE BARRAS DE VALIDACIÓN:
||| | ||| || |||| ||| || ||| | ||| || |||| ||| || |||
---------------------------------------------------------
           ¡Gracias por apoyar el consumo local!
           Ayúdanos a cuidar y retornar los bienes.
=========================================================
`;

    // Trigger file download
    const blob = new Blob([ticketText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante_${tx.ticketNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.prestifyService.showToast('¡Comprobante de transacción descargado con éxito!', 'success');
  }

  public getPaymentLink(tx: Transaction): string {
    const seller = this.prestifyService.users().find(u => u.name.toLowerCase() === tx.owner.toLowerCase());
    const alias = seller?.mpAlias || 'prestify.mp';
    return `https://link.mercadopago.com.ar/${alias}`;
  }

  public getQrCodeUrl(tx: Transaction): string {
    const paymentUrl = this.getPaymentLink(tx);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(paymentUrl)}`;
  }

  public getSellerAlias(tx: Transaction): string {
    const seller = this.prestifyService.users().find(u => u.name.toLowerCase() === tx.owner.toLowerCase());
    return seller?.mpAlias || 'prestify.mp';
  }

  public handleClose(): void {
    this.prestifyService.closeTicketModal();
  }

}
