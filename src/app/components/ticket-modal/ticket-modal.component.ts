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
    this.prestifyService.downloadTicket(tx);
  }

  public getPaymentLink(tx: Transaction): string {
    return this.prestifyService.getPaymentLink(tx);
  }

  public getQrCodeUrl(tx: Transaction): string {
    return this.prestifyService.getQrCodeUrl(tx);
  }

  public getSellerAlias(tx: Transaction): string {
    return this.prestifyService.getSellerAlias(tx);
  }

  public handleClose(): void {
    this.prestifyService.closeTicketModal();
  }
}
