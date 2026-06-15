import { Injectable, signal, computed } from '@angular/core';

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
  lat: number;   // Geolocation latitude
  lng: number;   // Geolocation longitude
  borrower?: string;
  loanDate?: string;
  dueDate?: string;
  notes?: string;
  paymentStatus?: 'Gratuito' | 'Pendiente' | 'Pagado';
  sku?: string;
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
    mpAlias: 'admin.prestify'
  },
  {
    name: 'Carlos Perez (Vecino)',
    email: 'carlos@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 4.8,
    reputationCount: 5,
    mpAlias: 'carlos.perez.mp'
  },
  {
    name: 'Ferretería Central',
    email: 'ventas@ferreteria.com',
    password: 'user123',
    role: 'usuario',
    type: 'empresa',
    reputation: 4.5,
    reputationCount: 4,
    mpAlias: 'ferreteria.central.mp'
  },
  {
    name: 'Cruz Roja Filial',
    email: 'cruzroja@ong.org',
    password: 'user123',
    role: 'usuario',
    type: 'institucion',
    reputation: 5,
    reputationCount: 10,
    mpAlias: 'cruz.roja.mp'
  },
  {
    name: 'Luz Blanca',
    email: 'luz.blanca.0091@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 5.0,
    reputationCount: 1,
    mpAlias: 'luz.blanca.mp'
  },
  {
    name: 'Beso de tu Boca',
    email: 'soyunbesodetuboca@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 5.0,
    reputationCount: 1,
    mpAlias: 'beso.boca.mp'
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
    sku: 'SKU-HERR-8812'
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
    sku: 'SKU-LIBR-1029'
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
  private readonly _users = signal<User[]>([]);
  private readonly _currentUser = signal<User | null>(null);

  // Read-only signals
  public readonly items = computed(() => this._items());
  public readonly transactions = computed(() => this._transactions());
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
      const sessionData = window.localStorage.getItem(STORAGE_SESSION_KEY);

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
 
      // Load Transactions
      if (transactionData) {
        let loadedTxs = JSON.parse(transactionData);
        let migratedTx = false;
        loadedTxs = loadedTxs.map((tx: any) => {
          if (tx.itemId === '2' && tx.itemTitle === 'Escalera Telescópica de Aluminio (4.4m)') {
            migratedTx = true;
            return {
              ...tx,
              itemTitle: 'Taladro Percutor Inalámbrico Dewalt 20V'
            };
          }
          
          // Update transaction prices to match new realistic seed prices
          const matchingTxSeed = SEED_TRANSACTIONS.find(st => st.id === tx.id);
          if (matchingTxSeed && tx.price !== matchingTxSeed.price) {
            tx.price = matchingTxSeed.price;
            migratedTx = true;
          }
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
            if (updatedSession) {
              this.saveToStorage(STORAGE_SESSION_KEY, session);
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

  private removeFromStorage(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
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
      this.saveToStorage(STORAGE_SESSION_KEY, this._currentUser());
    } else {
      this.removeFromStorage(STORAGE_SESSION_KEY);
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
    this._currentUser.set({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      type: newUser.type,
      reputation: newUser.reputation,
      reputationCount: newUser.reputationCount,
      mpAlias: newUser.mpAlias
    });
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
        this._currentUser.set({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          type: updatedUser.type,
          reputation: updatedUser.reputation,
          reputationCount: updatedUser.reputationCount,
          mpAlias: updatedUser.mpAlias
        });
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
    this._currentUser.set({
      name: user.name,
      email: user.email,
      role: user.role,
      type: user.type,
      reputation: user.reputation,
      reputationCount: user.reputationCount,
      mpAlias: user.mpAlias
    });
    this.persistSession();

    return { success: true };
  }


  public logout(): void {
    this._currentUser.set(null);
    this.removeFromStorage(STORAGE_SESSION_KEY);
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
        this._currentUser.set({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          type: updatedUser.type,
          reputation: updatedUser.reputation,
          reputationCount: updatedUser.reputationCount
        });
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
    paymentMethod?: 'efectivo' | 'mercadopago'
  ): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item) return;

    // Create a random ticket number
    const ticketNumber = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const itemSku = item.sku || `SKU-${item.category.substring(0,4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate duration
    const startDate = new Date();
    const endDate = new Date(dueDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Create pending Transaction
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
      price,
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
  }

  // Buy Item Direct Sale - enters pending approval
  public buyItem(
    itemId: string, 
    buyer: string, 
    price: number, 
    checklist: string[],
    paymentMethod?: 'efectivo' | 'mercadopago'
  ): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item) return;

    // Create a random ticket number
    const ticketNumber = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const itemSku = item.sku || `SKU-${item.category.substring(0,4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create pending Transaction
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
      price,
      status: 'Pendiente',
      handoverChecklist: checklist,
      ticketNumber,
      sku: itemSku,
      approvalStatus: 'pendiente',
      paymentMethod: paymentMethod || 'efectivo'
    };

    this._transactions.update(txs => [newTx, ...txs]);
    this.persistTransactions();
  }

  // Accept a pending transaction (Called by the owner of the item)
  public acceptTransaction(txId: string): void {
    const tx = this._transactions().find(t => t.id === txId);
    if (!tx || tx.approvalStatus !== 'pendiente') return;

    // 1. Update the item's status and details
    this._items.update(items => items.map(item => {
      if (item.id === tx.itemId) {
        if (tx.type === 'prestamo') {
          return {
            ...item,
            status: 'prestado',
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
            status: 'vendido',
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
  public returnItem(itemId: string, checklist: string[], rating?: number): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item || item.status !== 'prestado') return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Find active transaction for this item and update it
    this._transactions.update(txs => txs.map(tx => {
      if (tx.itemId === itemId && (tx.status === 'Activo' || tx.status === 'Caducado')) {
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

    // Update item status back to disponible
    this._items.update(items => items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
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
    this._transactions.update(txs => txs.map(tx => {
      if (tx.id === transactionId && tx.type === 'prestamo') {
        // Find corresponding item to update its payment status too
        this._items.update(items => items.map(item => {
          if (item.id === tx.itemId) {
            return { ...item, paymentStatus: 'Pagado' };
          }
          return item;
        }));
        this.persistItems();
      }
      return tx;
    }));
    this.persistTransactions();
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

  // Admin delete transaction
  public deleteTransaction(txId: string): { success: boolean; error?: string } {
    const tx = this._transactions().find(t => t.id === txId);
    if (!tx) {
      return { success: false, error: 'Transacción no encontrada.' };
    }

    this._items.update(items => items.map(item => {
      if (item.id === tx.itemId) {
        return {
          ...item,
          status: 'disponible',
          borrower: undefined,
          dueDate: undefined,
          paymentStatus: undefined
        };
      }
      return item;
    }));
    this.persistItems();

    this._transactions.update(txs => txs.filter(t => t.id !== txId));
    this.persistTransactions();
    return { success: true };
  }
}
