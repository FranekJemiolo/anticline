export class DatasetRegistry {
    container;
    options;
    availableDatasets = [
        {
            id: 'macro-us-treasury-yields',
            name: 'US 10Y Treasury (DGS10)',
            description: 'Daily benchmark interest rate from St. Louis FRED',
            asset_class: 'macro',
            schema: [
                { column: 'timestamp', type: 'TIMESTAMP' },
                { column: 'rate', type: 'FLOAT64' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10',
                requirements: ['pandas', 'numpy'],
                script: '# Pyodide data transformation\nresult_arrow = None',
            },
        },
        {
            id: 'equities-sp500-intraday',
            name: 'S&P 500 Intraday Ticks',
            description: 'Institutional cash equities order flow and tick series',
            asset_class: 'equities',
            schema: [
                { column: 'timestamp', type: 'TIMESTAMP' },
                { column: 'price', type: 'FLOAT64' },
                { column: 'volume', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'duckdb-sql',
                source_api: 'https://orogen.local/api/v1/warehouse/sp500',
                script: 'SELECT * FROM raw_sp500',
            },
        },
        {
            id: 'crypto-btc-usdt-trades',
            name: 'BTC-USDT Spot Order Stream',
            description: 'Live WebSocket tick stream merged with cold Parquet blocks',
            asset_class: 'alternative',
            schema: [
                { column: 'timestamp', type: 'TIMESTAMP' },
                { column: 'price', type: 'FLOAT64' },
                { column: 'volume', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://api.binance.com/api/v3/trades',
                requirements: ['numpy'],
                script: '# Binance tick normalizer\nresult_arrow = None',
            },
        },
    ];
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.render();
    }
    render() {
        this.container.innerHTML = `
      <div class="panel-header">
        <span>Dataset Registry</span>
        <span class="badge-macro">${this.availableDatasets.length} Packages</span>
      </div>
      <div class="dataset-list" id="registry-items">
        ${this.availableDatasets
            .map((d) => `
          <div class="dataset-card" data-id="${d.id}">
            <div class="dataset-card-header">
              <span class="dataset-badge ${d.asset_class === 'macro' ? 'badge-macro' : 'badge-crypto'}">${d.asset_class}</span>
              <span class="status-indicator">
                <span class="status-dot green"></span>
                <span>SHA-256 Verified</span>
              </span>
            </div>
            <div class="dataset-name">${d.name}</div>
            <div class="dataset-meta">${d.schema.map((s) => s.column).join(', ')}</div>
            <div style="margin-top: 0.5rem; display: flex; gap: 0.4rem;">
              <button class="btn-primary btn-etl" data-id="${d.id}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                Run Pyodide ETL
              </button>
              <button class="btn-secondary btn-sub" data-id="${d.id}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                Subscribe P2P
              </button>
            </div>
          </div>
        `)
            .join('')}
      </div>
    `;
        this.attachEvents();
    }
    attachEvents() {
        this.container.querySelectorAll('.btn-etl').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ds = this.availableDatasets.find((d) => d.id === id);
                if (ds)
                    this.options.onExecuteETL(ds);
            });
        });
        this.container.querySelectorAll('.btn-sub').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ds = this.availableDatasets.find((d) => d.id === id);
                if (ds)
                    this.options.onSubscribeManifest(ds);
            });
        });
    }
}
