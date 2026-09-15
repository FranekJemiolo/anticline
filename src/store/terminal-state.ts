import { TurnServerConfig, JoinedQuerySpec } from '../types/index.js';

export interface TerminalConfig {
  activeSymbol: string;
  timeframe: string;
  selectedDatasets: string[];
  activeJoins: JoinedQuerySpec[];
  turnConfig?: TurnServerConfig;
  theme: 'dark' | 'light';
}

export class TerminalStateStore {
  private dbName = 'anticline_terminal_db';
  private storeName = 'config_store';
  private config: TerminalConfig = {
    activeSymbol: 'BTC-USDT',
    timeframe: '1m',
    selectedDatasets: ['macro-us-treasury-yields'],
    activeJoins: [],
    theme: 'dark',
  };

  async init(): Promise<TerminalConfig> {
    if (typeof indexedDB === 'undefined') return this.config;

    return new Promise<TerminalConfig>((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };

        req.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const getReq = store.get('current_config');

          getReq.onsuccess = () => {
            if (getReq.result) {
              this.config = { ...this.config, ...getReq.result };
            }
            resolve(this.config);
          };

          getReq.onerror = () => resolve(this.config);
        };

        req.onerror = () => resolve(this.config);
      } catch {
        resolve(this.config);
      }
    });
  }

  async saveConfig(updates: Partial<TerminalConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };

    if (typeof indexedDB === 'undefined') return;

    try {
      const req = indexedDB.open(this.dbName, 1);
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(this.config, 'current_config');
      };
    } catch (e) {
      console.warn('Failed to save terminal configuration in IndexedDB:', e);
    }
  }

  getConfig(): TerminalConfig {
    return this.config;
  }
}
