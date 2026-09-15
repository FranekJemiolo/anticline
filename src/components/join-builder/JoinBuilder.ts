import { WorkerBridge } from '../../bridge/worker-bridge.js';
import { Table } from 'apache-arrow';

export interface JoinBuilderOptions {
  onJoinExecuted: (table: Table, sql: string) => void;
  workerBridge: WorkerBridge;
}

export class VisualJoinBuilder {
  private container: HTMLElement;
  private bridge: WorkerBridge;
  private onJoinExecuted: (table: Table, sql: string) => void;

  private primaryTable = 'intraday_trades';
  private macroTable = 'macro_us_treasury';
  private toleranceSeconds = 86400; // 24 hours tolerance for daily macro join

  constructor(container: HTMLElement, options: JoinBuilderOptions) {
    this.container = container;
    this.bridge = options.workerBridge;
    this.onJoinExecuted = options.onJoinExecuted;

    this.render();
  }

  render(): void {
    this.container.innerHTML = `
      <div class="join-builder-panel">
        <div class="join-header">
          <div class="join-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v18M3 12h18M5 5l14 14M5 19L19 5"/>
            </svg>
            <span>Visual ASOF Join Builder</span>
          </div>
          <span class="badge-asof">DuckDB OLAP</span>
        </div>

        <div class="join-dropzones">
          <div class="drop-card primary-card" id="primary-dropzone">
            <span class="label">Primary Intraday Time Series</span>
            <div class="dataset-chip">
              <span class="dot green"></span>
              <strong>BTC-USDT (1-Minute Trades)</strong>
            </div>
          </div>

          <div class="join-operator">
            <span class="op-pill">ASOF JOIN &ge;</span>
            <span class="tolerance-label">Window: &plusmn;${Math.round(this.toleranceSeconds / 3600)}h</span>
          </div>

          <div class="drop-card macro-card" id="macro-dropzone" draggable="true">
            <span class="label">Dragged Macro Dataset</span>
            <div class="dataset-chip active-macro">
              <span class="dot yellow"></span>
              <strong>FRED US 10Y Treasury (DGS10)</strong>
            </div>
          </div>
        </div>

        <div class="sql-preview-box">
          <div class="sql-label">Generated Vectorized SQL</div>
          <pre id="generated-sql"><code>${this.generateSQL()}</code></pre>
        </div>

        <div class="join-actions">
          <button id="btn-execute-join" class="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Execute ASOF Join
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  generateSQL(): string {
    return `SELECT 
    t.timestamp,
    t.price,
    m.rate AS macro_rate,
    (t.price - LAG(t.price) OVER (ORDER BY t.timestamp)) AS price_delta
FROM ${this.primaryTable} t
ASOF JOIN ${this.macroTable} m
    ON t.timestamp >= m.timestamp
ORDER BY t.timestamp ASC;`;
  }

  private attachEvents(): void {
    const btnExecute = this.container.querySelector('#btn-execute-join');
    const macroCard = this.container.querySelector('#macro-dropzone');
    const primaryCard = this.container.querySelector('#primary-dropzone');

    if (macroCard && primaryCard) {
      macroCard.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', this.macroTable);
      });

      primaryCard.addEventListener('dragover', (e: any) => {
        e.preventDefault();
        primaryCard.classList.add('drag-hover');
      });

      primaryCard.addEventListener('dragleave', () => {
        primaryCard.classList.remove('drag-hover');
      });

      primaryCard.addEventListener('drop', (e: any) => {
        e.preventDefault();
        primaryCard.classList.remove('drag-hover');
        this.executeJoin();
      });
    }

    if (btnExecute) {
      btnExecute.addEventListener('click', () => this.executeJoin());
    }
  }

  async executeJoin(): Promise<void> {
    const sql = this.generateSQL();
    try {
      const table = await this.bridge.executeQuery(sql);
      this.onJoinExecuted(table, sql);
    } catch (e) {
      console.warn('ASOF Join execution failed:', e);
    }
  }
}
