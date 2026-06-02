import { Injectable, signal, computed } from '@angular/core';

export interface Item {
  id: string;
  title: string;
  description: string;
  category: 'Electrónica' | 'Deportes' | 'Herramientas' | 'Juegos' | 'Salud' | 'Indumentaria' | 'Otros';
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
}

export interface User {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'usuario';
  type: 'vecino' | 'institucion' | 'empresa';
  reputation: number;       // Star rating (1-5)
  reputationCount: number;  // Number of ratings received
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
  status: 'Activo' | 'Caducado' | 'Pago Pendiente' | 'Vendido' | 'Devuelto';
  handoverChecklist: string[]; // State verification at handover
  returnChecklist?: string[];   // State verification at return
  ratingGiven?: number;         // Rating given for this transaction
}

const STORAGE_ITEMS_KEY = 'prestify_items_circular';
const STORAGE_HISTORY_KEY = 'prestify_transactions_circular';
const STORAGE_USERS_KEY = 'prestify_users_circular';
const STORAGE_SESSION_KEY = 'prestify_session_circular';

// Buenos Aires central area seed coordinates
const SEED_USERS: User[] = [
  {
    name: 'Municipalidad Local',
    email: 'contacto@municipio.org',
    password: 'admin123',
    role: 'admin',
    type: 'institucion',
    reputation: 5,
    reputationCount: 2
  },
  {
    name: 'Carlos Perez (Vecino)',
    email: 'carlos@gmail.com',
    password: 'user123',
    role: 'usuario',
    type: 'vecino',
    reputation: 4.8,
    reputationCount: 5
  },
  {
    name: 'Ferretería Central',
    email: 'ventas@ferreteria.com',
    password: 'user123',
    role: 'usuario',
    type: 'empresa',
    reputation: 4.5,
    reputationCount: 4
  },
  {
    name: 'Cruz Roja Filial',
    email: 'cruzroja@ong.org',
    password: 'user123',
    role: 'usuario',
    type: 'institucion',
    reputation: 5,
    reputationCount: 10
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
    price: 0, // Free loan
    lat: -34.605,
    lng: -58.385
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
    price: 1500, // Paid loan (presencial)
    lat: -34.615,
    lng: -58.375,
    borrower: 'Ferretería Central',
    loanDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  // Expired 1 day ago (should trigger Caducado)
    paymentStatus: 'Pendiente'
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
    price: 45000, // Direct sale
    lat: -34.595,
    lng: -58.395
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
    price: 0,
    lat: -34.602,
    lng: -58.405
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
    price: 25000,
    lat: -34.610,
    lng: -58.365
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
    price: 1500,
    status: 'Caducado', // Calculated as past due date
    handoverChecklist: ['Limpio y desinfectado', 'Sin daños estructurales', 'Funcionamiento mecánico verificado']
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
    price: 25000,
    status: 'Vendido',
    handoverChecklist: ['Limpio y desinfectado', 'Sin roturas ni costuras dañadas'],
    ratingGiven: 5
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
          return item;
        });
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

      // Load Users
      if (usersData) {
        this._users.set(JSON.parse(usersData));
      } else {
        this._users.set(SEED_USERS);
        this.saveToStorage(STORAGE_USERS_KEY, SEED_USERS);
      }

      // Load Session
      if (sessionData) {
        this._currentUser.set(JSON.parse(sessionData));
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
      reputationCount: 1
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
      reputationCount: newUser.reputationCount
    });
    this.persistSession();

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
      reputationCount: user.reputationCount
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
  public addItem(item: Omit<Item, 'id' | 'status'>): void {
    const newItem: Item = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      status: 'disponible'
    };

    this._items.update(items => [newItem, ...items]);
    this.persistItems();
  }

  public deleteItem(itemId: string): void {
    this._items.update(items => items.filter(i => i.id !== itemId));
    this.persistItems();
  }

  // --- Transaction Actions ---
  
  // Handover Checklist - loan start
  public borrowItem(
    itemId: string, 
    borrower: string, 
    dueDate: string, 
    price: number, 
    checklist: string[], 
    notes?: string
  ): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item) return;

    // Update Item status
    this._items.update(items => items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          status: 'prestado',
          borrower,
          loanDate: new Date().toISOString().split('T')[0],
          dueDate,
          notes: notes || '',
          paymentStatus: price > 0 ? 'Pendiente' : 'Gratuito'
        };
      }
      return i;
    }));
    this.persistItems();

    // Create active Transaction
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
      status: 'Activo',
      handoverChecklist: checklist
    };

    this._transactions.update(txs => [newTx, ...txs]);
    this.persistTransactions();
  }

  // Buy Item Direct Sale - instantly sets transaction to Sold
  public buyItem(
    itemId: string, 
    buyer: string, 
    price: number, 
    checklist: string[]
  ): void {
    const item = this._items().find(i => i.id === itemId);
    if (!item) return;

    // Update Item status to sold
    this._items.update(items => items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          status: 'vendido',
          borrower: buyer, // Stored borrower for records
          notes: 'Vendido de forma directa.'
        };
      }
      return i;
    }));
    this.persistItems();

    // Create transaction log
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
      returnDate: new Date().toISOString().split('T')[0],
      price,
      status: 'Vendido',
      handoverChecklist: checklist
    };

    this._transactions.update(txs => [newTx, ...txs]);
    this.persistTransactions();
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
}
