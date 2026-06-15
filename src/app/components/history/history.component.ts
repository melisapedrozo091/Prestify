import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrestifyService, Transaction } from '../../services/prestify.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
  public readonly prestifyService = inject(PrestifyService);

  public openTicket(tx: Transaction): void {
    this.prestifyService.openTicketModal(tx);
  }
}
