import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrestifyService, Transaction } from '../../services/prestify.service';
import { jsPDF } from 'jspdf';

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
    
    let duration = tx.durationDays;
    if (isLoan && !duration) {
      const start = new Date(tx.dateStarted);
      const end = new Date(tx.dateEndedOrDue);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    
    const doc = new jsPDF();
    
    // Title & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // indigo primary color
    doc.text('PRESTIFY', 105, 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Consumo Colaborativo & Economía Circular Vecinal', 105, 26, { align: 'center' });
    
    // Draw decorative line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);
    
    // Ticket Meta Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('COMPROBANTE DE OPERACIÓN', 20, 42);
    
    // Ticket details block (left side)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('N° Comprobante:', 20, 52);
    doc.text('Fecha de Emisión:', 20, 58);
    doc.text('Código SKU:', 20, 64);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(tx.ticketNumber, 60, 52);
    doc.text(tx.dateStarted, 60, 58);
    doc.text(tx.sku, 60, 64);
    
    // Draw horizontal separator
    doc.line(20, 70, 190, 70);
    
    // Section: Detalles del Insumo / Producto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.text('DETALLES DEL ARTÍCULO', 20, 80);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Título:', 20, 90);
    doc.text('Categoría:', 20, 96);
    doc.text('Propietario (Remitente):', 20, 102);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(tx.itemTitle, 65, 90);
    doc.text(tx.category, 65, 96);
    doc.text(tx.owner, 65, 102);
    
    // Draw horizontal separator
    doc.line(20, 108, 190, 108);
    
    // Section: Detalles de la Operación
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.text('DETALLES DE LA TRANSACCIÓN', 20, 118);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Modalidad:', 20, 128);
    doc.text('Adquirente (Solicitante):', 20, 134);
    doc.text('Plazo / Duración:', 20, 140);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isLoan ? 'Préstamo temporal' : 'Compra directa / Adquisición', 65, 128);
    doc.text(tx.borrowerOrBuyer, 65, 134);
    doc.text(isLoan ? `${duration} días (Hasta: ${tx.dateEndedOrDue})` : 'Adquisición definitiva', 65, 140);
    
    // Draw horizontal separator
    doc.line(20, 146, 190, 146);
    
    // Section: Detalles del Pago
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.text('INFORMACIÓN DE PAGO', 20, 156);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Medio de Pago:', 20, 166);
    doc.text('Estado del Pago:', 20, 172);
    doc.text('Monto a Transferir:', 20, 180);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(tx.paymentMethod === 'mercadopago' ? `Mercado Pago (Alias: ${alias})` : 'Efectivo / Entrega Presencial', 65, 166);
    doc.text('Pendiente de Cobro Físico / Digital', 65, 172);
    
    // Highlighted Price
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text(this.prestifyService.formatPrice(tx.price, 'Gratuito'), 65, 180);
    
    // Draw box around barcode or footer
    doc.line(20, 190, 190, 190);
    
    // Barcode Simulation
    doc.setFont('courier', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('||| | ||| || |||| ||| || ||| | ||| || |||| ||| || |||', 105, 205, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`CÓDIGO DE VALIDACIÓN: ${tx.sku}`, 105, 212, { align: 'center' });
    
    // Footer message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('¡Gracias por apoyar el consumo local y colaborativo!', 105, 230, { align: 'center' });
    doc.text('Ayúdanos a cuidar y retornar los bienes a la comunidad.', 105, 236, { align: 'center' });
    
    if (tx.paymentMethod === 'mercadopago' && tx.price > 0) {
      // Load and embed the QR Code image
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctxImg = canvas.getContext('2d');
        if (ctxImg) {
          ctxImg.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text('Escanear para pagar:', 140, 156);
          doc.addImage(dataURL, 'PNG', 140, 160, 30, 30);
        }
        doc.save(`Comprobante_${tx.ticketNumber}.pdf`);
        this.prestifyService.showToast('¡Comprobante en formato PDF descargado con éxito!', 'success');
      };
      img.onerror = (err) => {
        console.error('Failed to load QR image for PDF, exporting without QR', err);
        doc.save(`Comprobante_${tx.ticketNumber}.pdf`);
        this.prestifyService.showToast('¡Comprobante en formato PDF descargado con éxito!', 'success');
      };
      img.src = this.getQrCodeUrl(tx);
    } else {
      doc.save(`Comprobante_${tx.ticketNumber}.pdf`);
      this.prestifyService.showToast('¡Comprobante en formato PDF descargado con éxito!', 'success');
    }
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
