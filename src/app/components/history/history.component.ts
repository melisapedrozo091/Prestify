import { Component, inject, computed } from '@angular/core';
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

  public readonly myHistoryTransactions = computed(() => {
    const user = this.prestifyService.currentUser();
    if (!user) return [];
    if (user.role === 'admin') {
      return this.prestifyService.transactions();
    }
    return this.prestifyService.transactions().filter(tx => 
      tx.borrowerOrBuyer.toLowerCase() === user.name.toLowerCase() ||
      tx.owner.toLowerCase() === user.name.toLowerCase()
    );
  });

  public openTicket(tx: Transaction): void {
    this.prestifyService.openTicketModal(tx);
  }
}
