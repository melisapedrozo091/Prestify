import { Injectable, signal, computed } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Libros' | 'Otros';
  owner: string;
  photoUrl: string;
  condition: 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Aceptable';
  status: 'disponible' | 'prestado' | 'vendido';
  mode: 'prestamo' | 'venta';
  price: number; // 0 if free loan, >0 if paid loan or sale
  stock?: number; // Number of units available (default 1)
  lat: number;   // Geolocation latitude
  lng: number;   // Geolocation longitude
  borrower?: string;
  loanDate?: string;
  dueDate?: string;
  notes?: string;
  paymentStatus?: 'Gratuito' | 'Pendiente' | 'Pagado';
  sku?: string;
  reviews?: Review[];
  activeTxId?: string;
}

export interface User {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'usuario';
  type: 'vecino' | 'institucion' | 'empresa';
  reputation: number;       // Star rating (1-5)
  reputationCount: number;  // Number of ratings received
  mpAlias?: string;         // Mercado Pago payment alias
  phone?: string;           // Cell phone number
  photoUrl?: string;        // Profile photo (base64 data URL or external URL)
}

export interface Transaction {
  id: string;
  itemId: string;
  itemTitle: string;
  category: string;
  type: 'prestamo' | 'venta';
  borrowerOrBuyer: string;
  owner: string;
  dateStarted: string;
  dateEndedOrDue: string;
  returnDate?: string;
  price: number;
  quantity: number;             // Number of units requested in this transaction
  status: 'Activo' | 'Caducado' | 'Pago Pendiente' | 'Vendido' | 'Devuelto' | 'Pendiente' | 'Rechazado';
  handoverChecklist: string[]; // State verification at handover
  returnChecklist?: string[];   // State verification at return
  ratingGiven?: number;         // Rating given for this transaction
  ticketNumber: string;
  sku: string;
  approvalStatus: 'pendiente' | 'aprobado' | 'rechazado';
  paymentMethod?: 'efectivo' | 'mercadopago';
  durationDays?: number;
  notes?: string;
  itemRated?: boolean;
  deletedAt?: string;           // Soft-delete timestamp — record is preserved for audit
}

const STORAGE_ITEMS_KEY = 'prestify_items_circular';
const STORAGE_HISTORY_KEY = 'prestify_transactions_circular';
const STORAGE_USERS_KEY = 'prestify_users_circular';
const STORAGE_SESSION_KEY = 'prestify_session_circular';

// Buenos Aires central area seed coordinates
const SEED_USERS: User[] = [
  {
    name: 'Administrador',
    email: 'admin@prestify.com',
    password: 'admin123',
    role: 'admin',
    type: 'institucion',
    reputation: 5,
    reputationCount: 2,
    mpAlias: 'admin.prestify',
    phone: '11 9999-8888'
  },
  {
    name: 'Carlos Perez (Vecino)',
    email: 'carlos@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 4.8,
    reputationCount: 5,
    mpAlias: 'carlos.perez.mp',
    phone: '11 1234-5678'
  },
  {
    name: 'Ferretería Central',
    email: 'ventas@ferreteria.com',
    password: 'user123',
    role: 'usuario',
    type: 'empresa',
    reputation: 4.5,
    reputationCount: 4,
    mpAlias: 'ferreteria.central.mp',
    phone: '11 9876-5432'
  },
  {
    name: 'Cruz Roja Filial',
    email: 'cruzroja@ong.org',
    password: 'user123',
    role: 'usuario',
    type: 'institucion',
    reputation: 5,
    reputationCount: 10,
    mpAlias: 'cruz.roja.mp',
    phone: '11 5555-4444'
  },
  {
    name: 'Luz Blanca',
    email: 'luz.blanca.0091@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 5.0,
    reputationCount: 1,
    mpAlias: 'luz.blanca.mp',
    phone: '11 2222-3333'
  },
  {
    name: 'Beso de tu Boca',
    email: 'soyunbesodetuboca@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 5.0,
    reputationCount: 1,
    mpAlias: 'beso.boca.mp',
    phone: '11 4444-5555'
  }
];


const SEED_ITEMS: Item[] = [
  {
    id: '1',
    title: 'Muletas Ortopédicas Ajustables (Par)',
    description: 'Muletas de aluminio ligeras y regulables en altura. Ideales para lesiones temporales de tobillo o pierna.',
    category: 'Salud',
    owner: 'Cruz Roja Filial',
    photoUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=80',
    condition: 'Bueno',
    status: 'disponible',
    mode: 'prestamo',
    price: 0.00,
    lat: -34.605,
    lng: -58.385,
    sku: 'SKU-SALU-4821'
  },
  {
    id: '2',
    title: 'Taladro Percutor Inalámbrico Dewalt 20V',
    description: 'Taladro potente de uso profesional con 2 baterías de litio y maletín de transporte.',
    category: 'Herramientas',
    owner: 'Carlos Perez (Vecino)',
    photoUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop&q=80',
    condition: 'Como nuevo',
    status: 'prestado',
    mode: 'prestamo',
    price: 79000.00,
    lat: -34.615,
    lng: -58.375,
    borrower: 'Ferretería Central',
    loanDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentStatus: 'Pendiente',
    sku: 'SKU-HERR-8812',
    reviews: [
      {
        id: 'r1',
        reviewerName: 'Ferretería Central',
        rating: 5,
        comment: 'Excelente potencia y durabilidad de las baterías. Muy recomendado.',
        date: '2026-06-10'
      }
    ]
  },
  {
    id: '3',
    title: 'Juego de Brocas y Accesorios para Taladro',
    description: 'Maletín completo con puntas de destornillador y brocas de alta precisión para metal, madera y concreto.',
    category: 'Herramientas',
    owner: 'Ferretería Central',
    photoUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&auto=format&fit=crop&q=80',
    condition: 'Nuevo',
    status: 'disponible',
    mode: 'venta',
    price: 42500.00,
    lat: -34.595,
    lng: -58.395,
    sku: 'SKU-HERR-9041'
  },
  {
    id: '4',
    title: 'Tienda de Campaña Térmica (4 personas)',
    description: 'Tienda de campaña impermeable de alta montaña. Mantiene el calor a bajas temperaturas, ideal para trekking de invierno.',
    category: 'Deportes',
    owner: 'Carlos Perez (Vecino)',
    photoUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=500&auto=format&fit=crop&q=80',
    condition: 'Como nuevo',
    status: 'disponible',
    mode: 'prestamo',
    price: 18500.00,
    lat: -34.602,
    lng: -58.405,
    sku: 'SKU-DEPO-3329'
  },
  {
    id: '5',
    title: 'Parka Térmica de Nieve Impermeable',
    description: 'Indumentaria técnica para esquí o nieve. Talle L, impermeable, excelente protección contra el frío.',
    category: 'Indumentaria',
    owner: 'Carlos Perez (Vecino)',
    photoUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=500&auto=format&fit=crop&q=80',
    condition: 'Bueno',
    status: 'disponible',
    mode: 'venta',
    price: 245000.00,
    lat: -34.610,
    lng: -58.365,
    sku: 'SKU-INDU-1125'
  },
  {
    id: '6',
    title: 'Proyector Portátil Epson Full HD 3000lm',
    description: 'Proyector ideal para presentaciones o noches de cine en el patio. Conectores HDMI y USB, parlante integrado.',
    category: 'Electrónica',
    owner: 'Luz Blanca',
    photoUrl: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&auto=format&fit=crop&q=80',
    condition: 'Como nuevo',
    status: 'disponible',
    mode: 'prestamo',
    price: 32000.00,
    lat: -34.607,
    lng: -58.390,
    sku: 'SKU-ELEC-7012'
  },
  {
    id: '7',
    title: 'Juego de Mesa Catan (Edición Colonos)',
    description: 'El clásico juego de mesa de estrategia y negociación de recursos. Completo con todas sus piezas y manual original.',
    category: 'Juegos',
    owner: 'Beso de tu Boca',
    photoUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500&auto=format&fit=crop&q=80',
    condition: 'Bueno',
    status: 'disponible',
    mode: 'prestamo',
    price: 4200.00,
    lat: -34.598,
    lng: -58.380,
    sku: 'SKU-JUEG-5510'
  },
  {
    id: '8',
    title: 'Conservadora Portátil Coleman 34L',
    description: 'Conservadora de gran capacidad con aislamiento térmico reforzado. Mantiene hielo hasta por 3 días. Manija articulada.',
    category: 'Otros',
    owner: 'Ferretería Central',
    photoUrl: 'https://images.unsplash.com/photo-1596250470547-2da2f170381f?w=500&auto=format&fit=crop&q=80',
    condition: 'Bueno',
    status: 'disponible',
    mode: 'prestamo',
    price: 3200.00,
    lat: -34.612,
    lng: -58.398,
    sku: 'SKU-OTRO-6629'
  },
  {
    id: '9',
    title: 'El Principito (Edición de Bolsillo)',
    description: 'Libro clásico de Antoine de Saint-Exupéry. En excelente estado, ideal para lectura escolar o disfrute personal.',
    category: 'Libros',
    owner: 'Carlos Perez (Vecino)',
    photoUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=80',
    condition: 'Como nuevo',
    status: 'disponible',
    mode: 'prestamo',
    price: 0.00,
    lat: -34.609,
    lng: -58.382,
    sku: 'SKU-LIBR-1029',
    reviews: [
      {
        id: 'r2',
        reviewerName: 'Luz Blanca',
        rating: 5,
        comment: 'Una hermosa edición, el libro está impecable.',
        date: '2026-06-12'
      }
    ]
  }
];

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    itemId: '2',
    itemTitle: 'Taladro Percutor Inalámbrico Dewalt 20V',
    category: 'Herramientas',
    type: 'prestamo',
    borrowerOrBuyer: 'Ferretería Central',
    owner: 'Carlos Perez (Vecino)',
    dateStarted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateEndedOrDue: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    price: 79000.00,
    quantity: 1,
    status: 'Caducado',
    handoverChecklist: ['Limpio y desinfectado', 'Sin daños estructurales', 'Funcionamiento mecánico verificado'],
    sku: 'SKU-HERR-8812',
    ticketNumber: 'TK-100293',
    approvalStatus: 'aprobado',
    paymentMethod: 'efectivo',
    durationDays: 4
  },
  {
    id: 't2',
    itemId: '5',
    itemTitle: 'Parka Térmica de Nieve Impermeable',
    category: 'Indumentaria',
    type: 'venta',
    borrowerOrBuyer: 'Ferretería Central',
    owner: 'Carlos Perez (Vecino)',
    dateStarted: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateEndedOrDue: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    returnDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    price: 245000.00,
    quantity: 1,
    status: 'Vendido',
    handoverChecklist: ['Limpio y desinfectado', 'Sin roturas ni costuras dañadas'],
    ratingGiven: 5,
    sku: 'SKU-INDU-1125',
    ticketNumber: 'TK-203941',
    approvalStatus: 'aprobado',
    paymentMethod: 'mercadopago'
  }
];

@Injectable({
  providedIn: 'root'
})
export class PrestifyService {
  // Internal signals representing state
  private readonly _items = signal<Item[]>([]);
  private readonly _transactions = signal<Transaction[]>([]);

  /** All transactions including soft-deleted ones — for admin audit trail */
  public readonly allTransactions = computed(() => this._transactions());
  private readonly _users = signal<User[]>([]);
  private readonly _currentUser = signal<User | null>(null);

  // Read-only signals
  public readonly items = computed(() => this._items());
  /** Active transactions — excludes soft-deleted records */
  public readonly transactions = computed(() => this._transactions().filter(t => !t.deletedAt));
  public readonly users = computed(() => this._users());
  public readonly currentUser = computed(() => this._currentUser());

  // Global Auth Modal State managed by Service
  public readonly showAuthModal = signal<boolean>(false);
  public readonly authMode = signal<'login' | 'register' | 'recover'>('login');

  public openAuthModal(mode: 'login' | 'register' | 'recover' = 'login'): void {
    if (this.currentUser()) {
      return;
    }
    this.authMode.set(mode);
    this.showAuthModal.set(true);
  }

  public closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  public formatPrice(price: number | undefined | null, freeLabel: string = 'Gratis'): string {
    const val = price ?? 0;
    if (val === 0) return freeLabel;
    return '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Global Add Item Modal State
  public readonly showAddModal = signal<boolean>(false);

  // Global search query shared between header and Catalog
  public readonly searchQuery = signal<string>('');

  // Global Toast Notifications State managed by Service
  public readonly toasts = signal<{ message: string; type: 'success' | 'info' | 'warning' }[]>([]);

  public showToast(message: string, type: 'success' | 'info' | 'warning' = 'success'): void {
    const toast = { message, type };
    this.toasts.update(current => [...current, toast]);
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t !== toast));
    }, 4500);
  }

  // Global Checklist Modal State
  public readonly showChecklistModal = signal<boolean>(false);
  public checklistAction = signal<'borrow' | 'return' | 'buy'>('borrow');
  public checklistItem = signal<Item | null>(null);

  public openChecklistModal(action: 'borrow' | 'return' | 'buy', item: Item): void {
    this.checklistAction.set(action);
    this.checklistItem.set(item);
    this.showChecklistModal.set(true);
  }

  public closeChecklistModal(): void {
    this.showChecklistModal.set(false);
    this.checklistItem.set(null);
  }

  // Global Checkout Modal State
  public readonly showCheckoutModal = signal<boolean>(false);
  public readonly checkoutItem = signal<Item | null>(null);
  public readonly checkoutAction = signal<'borrow' | 'buy'>('borrow');

  public openCheckout(action: 'borrow' | 'buy', item: Item): void {
    this.checkoutAction.set(action);
    this.checkoutItem.set(item);
    this.showCheckoutModal.set(true);
  }

  public closeCheckout(): void {
    this.showCheckoutModal.set(false);
    this.checkoutItem.set(null);
  }

  // Global Ticket Modal State
  public readonly showTicketModal = signal<boolean>(false);
  public readonly activeTicketTransaction = signal<Transaction | null>(null);

  public openTicketModal(tx: Transaction): void {
    this.activeTicketTransaction.set(tx);
    this.showTicketModal.set(true);
  }

  public closeTicketModal(): void {
    this.showTicketModal.set(false);
    this.activeTicketTransaction.set(null);
  }

  // Global Review Modal State
  public readonly showReviewModal = signal<boolean>(false);
  public readonly reviewTargetItemId = signal<string>('');
  public readonly reviewTargetTxId = signal<string>('');
  public readonly reviewItemTitle = signal<string>('');

  public openReviewModal(itemId: string, txId: string, itemTitle: string): void {
    this.reviewTargetItemId.set(itemId);
    this.reviewTargetTxId.set(txId);
    this.reviewItemTitle.set(itemTitle);
    this.showReviewModal.set(true);
  }

  public closeReviewModal(): void {
    this.showReviewModal.set(false);
    this.reviewTargetItemId.set('');
    this.reviewTargetTxId.set('');
    this.reviewItemTitle.set('');
  }

  public addProductReview(itemId: string, transactionId: string, reviewerName: string, rating: number, comment: string): void {
    const newReview: Review = {
      id: Math.random().toString(36).substr(2, 9),
      reviewerName,
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    };

    // 1. Add review to item
    this._items.update(items => items.map(item => {
      if (item.id === itemId) {
        const reviews = item.reviews || [];
        return {
          ...item,
          reviews: [...reviews, newReview]
        };
      }
      return item;
    }));
    this.persistItems();

    // 2. Mark transaction as rated
    this._transactions.update(txs => txs.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          itemRated: true
        };
      }
      return tx;
    }));
    this.persistTransactions();
  }

  public getAverageRating(item: Item | undefined | null): number {
    if (!item || !item.reviews || item.reviews.length === 0) return 0;
    const sum = item.reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / item.reviews.length).toFixed(1));
  }

  // General Platform Stats
  public readonly totalItems = computed(() => this._items().length);
  public readonly availableItemsCount = computed(() => this._items().filter(i => i.status === 'disponible').length);
  public readonly activeLoansCount = computed(() => this._items().filter(i => i.status === 'prestado').length);
  public readonly totalRegisteredUsers = computed(() => this._users().length);
  
  public readonly loanRate = computed(() => {
    const total = this._items().length;
    if (total === 0) return 0;
    return Math.round((this._items().filter(i => i.status === 'prestado').length / total) * 100);
  });

  constructor() {
    this.loadFromStorage();
    this.refreshOverdueStatus();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const itemsData = window.localStorage.getItem(STORAGE_ITEMS_KEY);
      const transactionData = window.localStorage.getItem(STORAGE_HISTORY_KEY);
      const usersData = window.localStorage.getItem(STORAGE_USERS_KEY);
      // Session is stored in sessionStorage (tab-specific) so each tab can have a different logged-in user.
      // Migration: if a session exists in the old localStorage, move it to sessionStorage for this tab.
      let sessionData = window.sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (!sessionData) {
        const legacySession = window.localStorage.getItem(STORAGE_SESSION_KEY);
        if (legacySession) {
          window.sessionStorage.setItem(STORAGE_SESSION_KEY, legacySession);
          window.localStorage.removeItem(STORAGE_SESSION_KEY); // Clean up old key
          sessionData = legacySession;
        }
      }

      // Load Items
      if (itemsData) {
        let loadedItems = JSON.parse(itemsData);
        let migrated = false;
        loadedItems = loadedItems.map((item: any) => {
          if (item.id === '2' && item.title === 'Escalera Telescópica de Aluminio (4.4m)') {
            migrated = true;
            return {
              ...item,
              title: 'Taladro Percutor Inalámbrico Dewalt 20V',
              description: 'Taladro potente de uso profesional con 2 baterías de litio y maletín de transporte.',
            };
          }
          if (item.id === '3' && item.title === 'Taladro Percutor Inalámbrico Dewalt 20V') {
            migrated = true;
            return {
              ...item,
              title: 'Juego de Brocas y Accesorios para Taladro',
              description: 'Maletín completo con puntas de destornillador y brocas de alta precisión para metal, madera y concreto.',
            };
          }
          
          // Apply new realistic prices to seed items
          const matchingSeed = SEED_ITEMS.find(si => si.id === item.id);
          if (matchingSeed && item.price !== matchingSeed.price) {
            item.price = matchingSeed.price;
            migrated = true;
          }
          // Migrate reviews if not present
          if (matchingSeed && !item.reviews && matchingSeed.reviews) {
            item.reviews = matchingSeed.reviews;
            migrated = true;
          }
          return item;
        });

        // Append missing seed items
        const loadedIds = new Set(loadedItems.map((i: any) => i.id));
        const missingSeeds = SEED_ITEMS.filter(si => !loadedIds.has(si.id));
        if (missingSeeds.length > 0) {
          loadedItems = [...loadedItems, ...missingSeeds];
          migrated = true;
        }

        this._items.set(loadedItems);
        if (migrated) {
          this.saveToStorage(STORAGE_ITEMS_KEY, loadedItems);
        }
      } else {
        this._items.set(SEED_ITEMS);
        this.saveToStorage(STORAGE_ITEMS_KEY, SEED_ITEMS);
      }
 
      // Load Transactions — NOTE: We NEVER override user-created transaction prices.
      // Only safe title/label migrations are allowed.
      if (transactionData) {
        let loadedTxs = JSON.parse(transactionData);
        let migratedTx = false;
        loadedTxs = loadedTxs.map((tx: any) => {
          // Safe migration: fix a renamed item title (no data loss)
          if (tx.itemId === '2' && tx.itemTitle === 'Escalera Telescópica de Aluminio (4.4m)') {
            migratedTx = true;
            return {
              ...tx,
              itemTitle: 'Taladro Percutor Inalámbrico Dewalt 20V'
            };
          }
          // IMPORTANT: Never override stored transaction prices — user transactions are immutable.
          return tx;
        });
        this._transactions.set(loadedTxs);
        if (migratedTx) {
          this.saveToStorage(STORAGE_HISTORY_KEY, loadedTxs);
        }
      } else {
        this._transactions.set(SEED_TRANSACTIONS);
        this.saveToStorage(STORAGE_HISTORY_KEY, SEED_TRANSACTIONS);
      }

      // Load Users with migration support
      if (usersData) {
        try {
          let loadedUsers = JSON.parse(usersData);

          if (Array.isArray(loadedUsers)) {
            let migratedUsers = false;
            
            loadedUsers = loadedUsers.map((u: any) => {
              if (!u || typeof u !== 'object') return u;
              
              let updated = false;
              let newUser = { ...u };
              
              if (newUser.email === 'contacto@municipio.org') {
                newUser.email = 'admin@prestify.com';
                updated = true;
              }
              if (newUser.name === 'Municipalidad Local') {
                newUser.name = 'Administrador';
                newUser.mpAlias = 'admin.prestify';
                updated = true;
              }
              if (!newUser.mpAlias) {
                const nameStr = newUser.name || 'usuario';
                const seedUser = SEED_USERS.find(su => su.name.toLowerCase() === nameStr.toLowerCase());
                newUser.mpAlias = seedUser?.mpAlias || nameStr.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
                updated = true;
              }
              if (!newUser.phone) {
                const nameStr = newUser.name || 'usuario';
                const seedUser = SEED_USERS.find(su => su.name.toLowerCase() === nameStr.toLowerCase());
                if (seedUser?.phone) {
                  newUser.phone = seedUser.phone;
                  updated = true;
                }
              }
              
              if (updated) {
                migratedUsers = true;
              }
              return newUser;
            });

            this._users.set(loadedUsers);
            if (migratedUsers) {
              this.saveToStorage(STORAGE_USERS_KEY, loadedUsers);
            }
          } else {
            this._users.set(SEED_USERS);
            this.saveToStorage(STORAGE_USERS_KEY, SEED_USERS);
          }
        } catch (err) {
          console.error('Error parsing stored users:', err);
          this._users.set(SEED_USERS);
        }

      } else {
        this._users.set(SEED_USERS);
        this.saveToStorage(STORAGE_USERS_KEY, SEED_USERS);
      }

      // Load Session with migration support
      if (sessionData) {
        try {
          let session = JSON.parse(sessionData);
          if (session && typeof session === 'object') {
            let updatedSession = false;
            if (session.email === 'contacto@municipio.org') {
              session.email = 'admin@prestify.com';
              updatedSession = true;
            }
            if (session.name === 'Municipalidad Local') {
              session.name = 'Administrador';
              session.mpAlias = 'admin.prestify';
              updatedSession = true;
            }
            if (!session.mpAlias && session.name) {
              const seedUser = SEED_USERS.find(su => su.name.toLowerCase() === session.name.toLowerCase());
              session.mpAlias = seedUser?.mpAlias || session.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
              updatedSession = true;
            }

            // Sync session phone and mpAlias from the persistent user record
            const matchingUser = this._users().find(u => u.email.toLowerCase() === session.email.toLowerCase());
            if (matchingUser) {
              if (matchingUser.phone && session.phone !== matchingUser.phone) {
                session.phone = matchingUser.phone;
                updatedSession = true;
              }
              if (matchingUser.mpAlias && session.mpAlias !== matchingUser.mpAlias) {
                session.mpAlias = matchingUser.mpAlias;
                updatedSession = true;
              }
            }

            if (updatedSession) {
              this.saveToSessionStorage(STORAGE_SESSION_KEY, session);
            }
            this._currentUser.set(session);
          }
        } catch (err) {
          console.error('Error parsing session:', err);
        }
      }
    }
  }



  private saveToStorage(key: string, data: any): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /** Saves session data to sessionStorage (tab-isolated — each tab can have its own user) */
  private saveToSessionStorage(key: string, data: any): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, JSON.stringify(data));
    }
  }

  private removeFromStorage(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }

  /** Removes session data from sessionStorage */
  private removeFromSessionStorage(key: string): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  }

  private persistItems(): void {
    this.saveToStorage(STORAGE_ITEMS_KEY, this._items());
  }

  private persistTransactions(): void {
    this.saveToStorage(STORAGE_HISTORY_KEY, this._transactions());
  }

  private persistUsers(): void {
    this.saveToStorage(STORAGE_USERS_KEY, this._users());
  }

  private persistSession(): void {
    if (this._currentUser()) {
      // Use sessionStorage so each browser tab can maintain its own independent session
      this.saveToSessionStorage(STORAGE_SESSION_KEY, this._currentUser());
    } else {
      this.removeFromSessionStorage(STORAGE_SESSION_KEY);
    }
  }

  // --- Overdue calculation algorithm ---
  public refreshOverdueStatus(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    let changed = false;

    // Update active transactions status if past due date
    this._transactions.update(txs => txs.map(tx => {
      if (tx.type === 'prestamo' && tx.status === 'Activo' && tx.dateEndedOrDue < todayStr) {
        changed = true;
        return { ...tx, status: 'Caducado' };
      }
      return tx;
    }));

    if (changed) {
      this.persistTransactions();
    }
  }

  // --- Auth Actions ---
  public register(user: User): { success: boolean; error?: string } {
    const emailLower = user.email.toLowerCase().trim();
    
    // Check if user exists
    const exists = this._users().some(u => u.email.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }

    const newUser: User = {
      ...user,
      email: emailLower,
      reputation: 5.0, // Initial default reputation
      reputationCount: 1,
      mpAlias: user.mpAlias || user.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.') + '.mp'
    };

    this._users.update(users => [...users, newUser]);
    this.persistUsers();

    // Log in automatically after registration
    const { password: _, ...sessionUser } = newUser;
    this._currentUser.set(sessionUser);
    this.persistSession();

    return { success: true };
  }

  public adminAddUser(user: User): { success: boolean; error?: string } {
    const emailLower = user.email.toLowerCase().trim();
    const exists = this._users().some(u => u.email.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }

    const newUser: User = {
      ...user,
      email: emailLower,
      reputation: user.reputation || 5.0,
      reputationCount: user.reputationCount || 1,
      mpAlias: user.mpAlias || user.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.') + '.mp'
    };

    this._users.update(users => [...users, newUser]);
    this.persistUsers();
    return { success: true };
  }


  public updateUser(email: string, updatedData: Partial<User>): { success: boolean; error?: string } {
    const emailLower = email.toLowerCase().trim();
    const index = this._users().findIndex(u => u.email.toLowerCase() === emailLower);
    if (index === -1) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    this._users.update(users => users.map(u => {
      if (u.email.toLowerCase() === emailLower) {
        return {
          ...u,
          ...updatedData,
          // Do not allow email to be changed easily to avoid key collisions
          email: u.email
        };
      }
      return u;
    }));
    this.persistUsers();

    // Update active user session if they edited themselves
    const current = this._currentUser();
    if (current && current.email.toLowerCase() === emailLower) {
      const updatedUser = this._users().find(u => u.email.toLowerCase() === emailLower);
      if (updatedUser) {
        const { password: _, ...sessUser } = updatedUser;
        this._currentUser.set(sessUser);
        this.persistSession();
      }
    }

    return { success: true };
  }

  public deleteUser(email: string): { success: boolean; error?: string } {
    const emailLower = email.toLowerCase().trim();
    if (emailLower === 'admin@prestify.com') {
      return { success: false, error: 'No se puede eliminar la cuenta del Administrador principal.' };
    }

    const exists = this._users().some(u => u.email.toLowerCase() === emailLower);
    if (!exists) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    this._users.update(users => users.filter(u => u.email.toLowerCase() !== emailLower));
    this.persistUsers();

    // Log out if the deleted user is the current session
    const current = this._currentUser();
    if (current && current.email.toLowerCase() === emailLower) {
      this.logout();
    }

    return { success: true };
  }

  public login(email: string, password: string): { success: boolean; error?: string } {
    const emailLower = email.toLowerCase().trim();
    const user = this._users().find(u => u.email.toLowerCase() === emailLower && u.password === password);
    
    if (!user) {
      return { success: false, error: 'Credenciales inválidas. Revisa correo y contraseña.' };
    }

    // Set current user (excluding password)
    const { password: _, ...sessionUser } = user;
    this._currentUser.set(sessionUser);
    this.persistSession();

    return { success: true };
  }


  public logout(): void {
    this._currentUser.set(null);
    this.removeFromSessionStorage(STORAGE_SESSION_KEY);
  }

  public recoverPassword(email: string): { success: boolean; message?: string } {
    const emailLower = email.toLowerCase().trim();
    const user = this._users().find(u => u.email.toLowerCase() === emailLower);
    
    if (!user) {
      return { success: false, message: 'El correo electrónico no está registrado.' };
    }

    return { 
      success: true, 
      message: `Simulación: Se envió un correo de recuperación. Tu contraseña actual es: "${user.password}"` 
    };
  }

  // --- Reputation Rating Action ---
  public rateUser(username: string, score: number): void {
    this._users.update(users => users.map(user => {
      if (user.name.toLowerCase() === username.toLowerCase()) {
        const totalRating = user.reputation * user.reputationCount + score;
        const newCount = user.reputationCount + 1;
        return {
          ...user,
          reputationCount: newCount,
          reputation: Math.round((totalRating / newCount) * 10) / 10 // Round to 1 decimal place
        };
      }
      return user;
    }));
    this.persistUsers();

    // If rated user is active user, update active session
    const current = this._currentUser();
    if (current && current.name.toLowerCase() === username.toLowerCase()) {
      const updatedUser = this._users().find(u => u.name.toLowerCase() === current.name.toLowerCase());
      if (updatedUser) {
        const { password: _, ...sessUser } = updatedUser;
        this._currentUser.set(sessUser);
        this.persistSession();
      }
    }
  }

  // --- Item CRUD Actions ---
  public addItem(item: Omit<Item, 'id' | 'status' | 'sku'> & { sku?: string }): void {
    const generatedSku = item.sku || `SKU-${item.category.substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newItem: Item = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      status: 'disponible',
      sku: generatedSku
    };

    this._items.update(items => [newItem, ...items]);
    this.persistItems();
  }

  public deleteItem(itemId: string): void {
    this._items.update(items => items.filter(i => i.id !== itemId));
    this.persistItems();
  }

  public updateItemDetails(itemId: string, updatedData: Partial<Item>): { success: boolean; error?: string } {
    const exists = this._items().some(i => i.id === itemId);
    if (!exists) {
      return { success: false, error: 'Artículo no encontrado.' };
    }

    this._items.update(items => items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          ...updatedData
        };
      }
      return i;
    }));
    this.persistItems();
    return { success: true };
  }

  // --- Transaction Actions ---
  
  // Handover Checklist - request loan (enters pending approval)
  public borrowItem(
    itemId: string, 
    borrower: string, 
    dueDate: string, 
    price: number, 
    checklist: string[], 
    notes?: string,
    paymentMethod?: 'efectivo' | 'mercadopago',
    quantity: number = 1
  ): Transaction | undefined {
    const item = this._items().find(i => i.id === itemId);
    const availableStock = item?.stock ?? 1;
    if (!item || availableStock <= 0) return undefined;

    // Clamp quantity to available stock
    const qty = Math.min(Math.max(1, quantity), availableStock);

    // Create a random ticket number
    const ticketNumber = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const itemSku = item.sku || `SKU-${item.category.substring(0,4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate duration
    const startDate = new Date();
    const endDate = new Date(dueDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Create pending Transaction (price = unit price × quantity)
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemTitle: item.title,
      category: item.category,
      type: 'prestamo',
      borrowerOrBuyer: borrower,
      owner: item.owner,
      dateStarted: new Date().toISOString().split('T')[0],
      dateEndedOrDue: dueDate,
      price: price * qty,
      quantity: qty,
      status: 'Pendiente',
      handoverChecklist: checklist,
      ticketNumber,
      sku: itemSku,
      approvalStatus: 'pendiente',
      paymentMethod: paymentMethod || 'efectivo',
      durationDays,
      notes: notes || ''
    };

    this._transactions.update(txs => [newTx, ...txs]);
    this.persistTransactions();
    return newTx;
  }

  // Buy Item Direct Sale - enters pending approval
  public buyItem(
    itemId: string, 
    buyer: string, 
    price: number, 
    checklist: string[],
    paymentMethod?: 'efectivo' | 'mercadopago',
    quantity: number = 1
  ): Transaction | undefined {
    const item = this._items().find(i => i.id === itemId);
    const availableStock = item?.stock ?? 1;
    if (!item || availableStock <= 0) return undefined;

    // Clamp quantity to available stock
    const qty = Math.min(Math.max(1, quantity), availableStock);

    // Create a random ticket number
    const ticketNumber = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const itemSku = item.sku || `SKU-${item.category.substring(0,4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create pending Transaction (price = unit price × quantity)
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemTitle: item.title,
      category: item.category,
      type: 'venta',
      borrowerOrBuyer: buyer,
      owner: item.owner,
      dateStarted: new Date().toISOString().split('T')[0],
      dateEndedOrDue: new Date().toISOString().split('T')[0],
      price: price * qty,
      quantity: qty,
      status: 'Pendiente',
      handoverChecklist: checklist,
      ticketNumber,
      sku: itemSku,
      approvalStatus: 'pendiente',
      paymentMethod: paymentMethod || 'efectivo'
    };

    this._transactions.update(txs => [newTx, ...txs]);
    this.persistTransactions();
    return newTx;
  }

  // Accept a pending transaction (Called by the owner of the item)
  public acceptTransaction(txId: string): void {
    const tx = this._transactions().find(t => t.id === txId);
    if (!tx || tx.approvalStatus !== 'pendiente') return;

    // 1. Update the item's status and details
    this._items.update(items => items.map(item => {
      if (item.id === tx.itemId) {
        const currentStock = item.stock ?? 1;
        const deducted = tx.quantity ?? 1;
        const newStock = Math.max(0, currentStock - deducted);
        if (tx.type === 'prestamo') {
          return {
            ...item,
            stock: newStock,
            status: newStock === 0 ? 'prestado' : 'disponible',
            borrower: tx.borrowerOrBuyer,
            loanDate: tx.dateStarted,
            dueDate: tx.dateEndedOrDue,
            notes: tx.notes || '',
            paymentStatus: tx.price > 0 ? 'Pendiente' : 'Gratuito'
          };
        } else {
          // Sale
          return {
            ...item,
            stock: newStock,
            status: newStock === 0 ? 'vendido' : 'disponible',
            borrower: tx.borrowerOrBuyer,
            notes: 'Vendido a través de la red.'
          };
        }
      }
      return item;
    }));
    this.persistItems();

    // 2. Update the transaction's status
    this._transactions.update(txs => txs.map(t => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'aprobado',
          status: t.type === 'prestamo' ? 'Activo' : (t.price > 0 ? 'Pago Pendiente' : 'Vendido')
        };
      }
      return t;
    }));
    this.persistTransactions();
  }

  // Reject a pending transaction (Called by the owner of the item)
  public rejectTransaction(txId: string): void {
    const tx = this._transactions().find(t => t.id === txId);
    if (!tx || tx.approvalStatus !== 'pendiente') return;

    // 1. Mark transaction as rejected
    this._transactions.update(txs => txs.map(t => {
      if (t.id === txId) {
        return {
          ...t,
          approvalStatus: 'rechazado',
          status: 'Rechazado'
        };
      }
      return t;
    }));
    this.persistTransactions();

    // Note: Item remains 'disponible' as we did not change its status during reservation
  }

  // Return Checklist - loan ends
  public returnItem(itemId: string, checklist: string[], rating?: number, transactionId?: string): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Find active transaction for this item and update it
    this._transactions.update(txs => txs.map(tx => {
      const isMatch = transactionId ? (tx.id === transactionId) : (tx.itemId === itemId && (tx.status === 'Activo' || tx.status === 'Caducado'));
      if (isMatch) {
        return {
          ...tx,
          status: 'Devuelto',
          returnDate: todayStr,
          returnChecklist: checklist,
          ratingGiven: rating
        };
      }
      return tx;
    }));
    this.persistTransactions();

    // Update user reputation if rating is provided
    if (rating && item.borrower) {
      this.rateUser(item.borrower, rating);
    }

    // Update item status back to disponible and increment stock
    this._items.update(items => items.map(i => {
      if (i.id === itemId) {
        const currentStock = i.stock ?? 1;
        return {
          ...i,
          stock: currentStock + 1,
          status: 'disponible',
          borrower: undefined,
          loanDate: undefined,
          dueDate: undefined,
          notes: undefined,
          paymentStatus: undefined
        };
      }
      return i;
    }));
    this.persistItems();
  }

  // Update payment status (Admin overrides)
  public confirmPayment(transactionId: string): void {
    this.confirmReceivedPayment(transactionId);
  }

  public confirmReceivedPayment(transactionId: string, paymentMethodOverride?: 'efectivo' | 'mercadopago'): void {
    let targetTx: Transaction | undefined;

    this._transactions.update(txs => txs.map(tx => {
      if (tx.id === transactionId) {
        targetTx = {
          ...tx,
          approvalStatus: 'aprobado',
          status: tx.type === 'prestamo' ? 'Activo' : 'Vendido',
          paymentMethod: paymentMethodOverride || tx.paymentMethod || 'efectivo'
        };
        return targetTx;
      }
      return tx;
    }));
    this.persistTransactions();

    if (targetTx) {
      const tx = targetTx;
      this._items.update(items => items.map(item => {
        if (item.id === tx.itemId) {
          const currentStock = item.stock ?? 1;
          if (tx.type === 'prestamo') {
            return {
              ...item,
              status: currentStock === 0 ? 'prestado' : 'disponible',
              borrower: tx.borrowerOrBuyer,
              loanDate: tx.dateStarted,
              dueDate: tx.dateEndedOrDue,
              notes: tx.notes || '',
              paymentStatus: 'Pagado'
            };
          } else {
            return {
              ...item,
              status: currentStock === 0 ? 'vendido' : 'disponible',
              borrower: tx.borrowerOrBuyer,
              notes: 'Vendido a través de la red y cobrado.',
              paymentStatus: 'Pagado'
            };
          }
        }
        return item;
      }));
      this.persistItems();
    }
  }

  public getSellerAlias(tx: Transaction): string {
    const seller = this.users().find(u => u.name.toLowerCase() === tx.owner.toLowerCase());
    return seller?.mpAlias || 'prestify.mp';
  }

  public getPaymentLink(tx: Transaction): string {
    const alias = this.getSellerAlias(tx);
    return `https://link.mercadopago.com.ar/${alias}`;
  }

  public getQrCodeUrl(tx: Transaction): string {
    const paymentUrl = this.getPaymentLink(tx);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(paymentUrl)}`;
  }

  public downloadTicket(tx: Transaction): void {
    const isLoan = tx.type === 'prestamo';
    const seller = this.users().find(u => u.name.toLowerCase() === tx.owner.toLowerCase());
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
    doc.text(this.formatPrice(tx.price, 'Gratuito'), 65, 180);
    
    const barcodeRects = [
      [15, 3], [20, 1], [23, 2], [28, 4], [34, 1], [37, 3], [43, 1], [47, 2], [52, 4], [59, 1],
      [63, 3], [68, 2], [72, 1], [75, 4], [81, 2], [85, 1], [89, 3], [95, 4], [101, 1], [105, 2],
      [109, 3], [115, 1], [121, 2], [125, 1], [129, 3], [135, 4], [141, 1], [144, 2], [148, 3],
      [154, 1], [158, 3], [163, 2], [167, 1], [170, 4], [176, 2], [180, 1], [184, 3], [190, 4],
      [196, 1], [200, 2], [204, 3], [210, 1], [214, 4], [220, 2], [224, 1], [228, 3], [234, 4],
      [240, 1], [244, 3], [250, 2], [254, 1], [258, 4]
    ];

    // Draw box around barcode or footer
    doc.line(20, 184, 190, 184);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('CÓDIGO DE VALIDACIÓN DE RETIRO', 105, 191, { align: 'center' });

    // Draw barcode container box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(55, 194, 100, 24, 2, 2, 'FD');

    // Draw barcode lines
    doc.setFillColor(0, 0, 0); // Pure black
    const startX = 57.91;
    const scale = 0.34;
    barcodeRects.forEach(([x, w]) => {
      doc.rect(startX + x * scale, 196, w * scale, 14, 'F');
    });

    // Draw barcode text label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(tx.sku, 105, 214, { align: 'center' });
    
    // Footer message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('¡Gracias por apoyar el consumo local y colaborativo!', 105, 230, { align: 'center' });
    doc.text('Ayúdanos a cuidar y retornar los bienes a la comunidad.', 105, 236, { align: 'center' });
    
    doc.save(`Comprobante_${tx.ticketNumber}.pdf`);
    this.showToast('¡Comprobante en formato PDF descargado con éxito!', 'success');
  }

  public downloadPaymentReport(monthStr: string, limitToUser?: string): void {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('es-AR');
    
    // Filter transactions
    const paidTxs = this._transactions().filter(tx => {
      const matchesMonth = tx.dateStarted.substring(0, 7) === monthStr;
      const isPaid = tx.price > 0;
      const isApproved = tx.approvalStatus === 'aprobado';
      const userMatches = !limitToUser || 
        tx.owner.toLowerCase() === limitToUser.toLowerCase() ||
        tx.borrowerOrBuyer.toLowerCase() === limitToUser.toLowerCase();
      
      return matchesMonth && isPaid && isApproved && userMatches;
    });

    // Header styling
    doc.setFillColor(99, 102, 241); // var(--primary)
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Prestify - Reporte de Pagos', 20, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${today}`, 150, 20);

    // Month display
    const [year, month] = monthStr.split('-');
    const monthsNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = monthsNames[parseInt(month) - 1] || month;
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Período Mensual: ${monthName} ${year}`, 20, 42);
    if (limitToUser) {
      doc.text(`Usuario: ${limitToUser}`, 20, 48);
    }

    // Summary Card
    const totalCollected = paidTxs.reduce((sum, tx) => {
      if (tx.owner.toLowerCase() === limitToUser?.toLowerCase()) {
        return sum + tx.price;
      }
      return sum;
    }, 0);

    const totalPaid = paidTxs.reduce((sum, tx) => {
      if (tx.borrowerOrBuyer.toLowerCase() === limitToUser?.toLowerCase()) {
        return sum + tx.price;
      }
      return sum;
    }, 0);

    const overallTotal = paidTxs.reduce((sum, tx) => sum + tx.price, 0);

    doc.setFillColor(241, 245, 249); // bg-input
    doc.roundedRect(20, 55, 170, 25, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    
    if (limitToUser) {
      doc.text('Total Cobrado (Ingresos):', 25, 65);
      doc.text('Total Abonado (Egresos):', 105, 65);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // green
      doc.text(this.formatPrice(totalCollected), 25, 73);
      doc.setTextColor(239, 68, 68); // red
      doc.text(this.formatPrice(totalPaid), 105, 73);
    } else {
      doc.text('Total Transaccionado en la Red:', 25, 65);
      doc.text('Transacciones Pagas:', 125, 65);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.text(this.formatPrice(overallTotal), 25, 73);
      doc.text(`${paidTxs.length} operaciones`, 125, 73);
    }

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    
    doc.text('Fecha', 20, 95);
    doc.text('Comprobante', 42, 95);
    doc.text('Artículo', 70, 95);
    doc.text('Medio', 125, 95);
    doc.text('Monto', 155, 95);
    doc.text('Estado', 180, 95);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 98, 190, 98);

    // Table Rows
    let y = 105;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    paidTxs.forEach(tx => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      
      doc.text(tx.dateStarted, 20, y);
      doc.text(tx.ticketNumber, 42, y);
      
      // Limit article title length
      const title = tx.itemTitle.length > 25 ? tx.itemTitle.substring(0, 22) + '...' : tx.itemTitle;
      doc.text(title, 70, y);
      
      const methodStr = tx.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Efectivo';
      doc.text(methodStr, 125, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(this.formatPrice(tx.price), 155, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129);
      doc.text(tx.status, 180, y);
      
      doc.setTextColor(100, 116, 139);
      y += 8;
    });

    if (paidTxs.length === 0) {
      doc.text('No se registraron cobros ni pagos este mes.', 105, 120, { align: 'center' });
    }

    doc.save(`Reporte_Pagos_${monthStr}.pdf`);
    this.showToast('Reporte mensual de pagos descargado con éxito.', 'success');
  }

  // Admin update transaction (Complete override)
  public updateTransactionDetails(txId: string, updatedData: Partial<Transaction>): { success: boolean; error?: string } {
    const exists = this._transactions().some(t => t.id === txId);
    if (!exists) {
      return { success: false, error: 'Transacción no encontrada.' };
    }

    this._transactions.update(txs => txs.map(t => {
      if (t.id === txId) {
        const newTx = { ...t, ...updatedData };
        
        // Synchronize item status if needed
        if (updatedData.approvalStatus || updatedData.status) {
          this._items.update(items => items.map(item => {
            if (item.id === newTx.itemId) {
              if (newTx.approvalStatus === 'aprobado') {
                if (newTx.type === 'prestamo') {
                  const isDevuelto = newTx.status === 'Devuelto';
                  return {
                    ...item,
                    status: isDevuelto ? 'disponible' : 'prestado',
                    borrower: isDevuelto ? undefined : newTx.borrowerOrBuyer,
                    dueDate: isDevuelto ? undefined : newTx.dateEndedOrDue,
                    paymentStatus: isDevuelto ? undefined : (newTx.price > 0 ? (newTx.status === 'Vendido' || newTx.status === 'Devuelto' ? 'Pagado' : 'Pendiente') : 'Gratuito')
                  };
                } else {
                  return {
                    ...item,
                    status: 'vendido',
                    borrower: newTx.borrowerOrBuyer
                  };
                }
              } else if (newTx.approvalStatus === 'rechazado' || newTx.approvalStatus === 'pendiente') {
                return {
                  ...item,
                  status: 'disponible',
                  borrower: undefined,
                  dueDate: undefined,
                  paymentStatus: undefined
                };
              }
            }
            return item;
          }));
          this.persistItems();
        }

        return newTx;
      }
      return t;
    }));

    this.persistTransactions();
    return { success: true };
  }

  // Admin soft-delete transaction — record is PRESERVED in storage for audit purposes.
  // The item's status is restored to 'disponible' but the transaction history is retained.
  public deleteTransaction(txId: string): { success: boolean; error?: string } {
    const tx = this._transactions().find(t => t.id === txId);
    if (!tx) {
      return { success: false, error: 'Transacción no encontrada.' };
    }
    if (tx.deletedAt) {
      return { success: false, error: 'La transacción ya fue eliminada.' };
    }

    // Restore item status to available and increment stock if it was affected by this transaction
    this._items.update(items => items.map(item => {
      if (item.id === tx.itemId && (tx.approvalStatus === 'aprobado')) {
        const currentStock = item.stock ?? 1;
        return {
          ...item,
          stock: currentStock + 1,
          status: 'disponible',
          borrower: undefined,
          dueDate: undefined,
          paymentStatus: undefined
        };
      }
      return item;
    }));
    this.persistItems();

    // Soft-delete: mark with timestamp but DO NOT remove from array
    const deletedAt = new Date().toISOString();
    this._transactions.update(txs => txs.map(t =>
      t.id === txId ? { ...t, deletedAt } : t
    ));
    this.persistTransactions();
    return { success: true };
  }
}
