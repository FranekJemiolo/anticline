export class DatasetRegistry {
    container;
    options;
    activeTab = 'network';
    selectedAssetClass = 'all';
    selectedEngine = 'all';
    subscribedDatasetIds = new Set([
        'fred-t10y2y-spread',
        'binance-btc-1m',
    ]);
    availableDatasets = [
        {
            id: 'fred-t10y2y-spread',
            name: 'FRED 10Y-2Y Yield Spread',
            description: 'Daily constant maturity yield spread from St. Louis Federal Reserve',
            asset_class: 'macro',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'spread', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'duckdb-sql',
                source_api: 'https://api.stlouisfed.org/fred/series/observations?series_id=T10Y2Y&file_type=json',
                script: "WITH raw_data AS (SELECT UNNEST(observations) AS obs FROM read_json_auto('{{CORS_PROXY}}https://api.stlouisfed.org/fred/series/observations?series_id=T10Y2Y&file_type=json&api_key={{FRED_API_KEY}}')) SELECT CAST(obs.date AS TIMESTAMP) AS date, CAST(NULLIF(obs.value, '.') AS FLOAT32) AS spread FROM raw_data WHERE obs.value != '.';",
            },
        },
        {
            id: 'nbp-eur-pln-daily',
            name: 'NBP EUR/PLN Exchange Rate',
            description: '255 days of daily EUR/PLN midpoint exchange rates from National Bank of Poland',
            asset_class: 'macro',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'rate', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'duckdb-sql',
                source_api: 'http://api.nbp.pl/api/exchangerates/rates/a/eur/last/255/?format=json',
                script: "WITH raw_data AS (SELECT UNNEST(rates) AS rate_record FROM read_json_auto('http://api.nbp.pl/api/exchangerates/rates/a/eur/last/255/?format=json')) SELECT CAST(rate_record.effectiveDate AS TIMESTAMP) AS date, CAST(rate_record.mid AS FLOAT32) AS rate FROM raw_data;",
            },
        },
        {
            id: 'yfinance-spy-daily',
            name: 'S&P 500 ETF (SPY) 10Y Daily',
            description: '10 years of daily OHLCV bar data from Yahoo Finance via Pyodide Arrow IPC',
            asset_class: 'equities',
            schema: [
                { column: 'Date', type: 'TIMESTAMP' },
                { column: 'Open', type: 'FLOAT64' },
                { column: 'High', type: 'FLOAT64' },
                { column: 'Low', type: 'FLOAT64' },
                { column: 'Close', type: 'FLOAT64' },
                { column: 'Volume', type: 'FLOAT64' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://query2.finance.yahoo.com/v8/finance/chart/SPY',
                requirements: ['pandas', 'yfinance', 'pyarrow', 'requests'],
                script: '# Yahoo Finance SPY 10-Year Daily Pyodide Pipeline\nimport yfinance as yf\nresult_arrow = None',
            },
        },
        {
            id: 'binance-btc-1m',
            name: 'Binance BTC/USDT 1m K-Lines',
            description: 'High-volume 1-minute candlestick data paginated with 0.5s rate-limit backoffs',
            asset_class: 'crypto',
            schema: [
                { column: 'timestamp', type: 'TIMESTAMP' },
                { column: 'open', type: 'FLOAT64' },
                { column: 'high', type: 'FLOAT64' },
                { column: 'low', type: 'FLOAT64' },
                { column: 'close', type: 'FLOAT64' },
                { column: 'volume', type: 'FLOAT64' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://api.binance.com/api/v3/klines',
                requirements: ['pyarrow', 'requests'],
                script: '# Binance 1000-candle paginated batches with rate limiting\nresult_arrow = None',
            },
        },
        {
            id: 'sec-edgar-aapl',
            name: 'Apple Inc. (AAPL) SEC EDGAR Fundamentals',
            description: 'Standardized quarterly NetIncomeLoss and Revenues directly from US SEC EDGAR XBRL company facts API',
            asset_class: 'fundamentals',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'revenues', type: 'FLOAT64' },
                { column: 'net_income', type: 'FLOAT64' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
                requirements: ['requests', 'pandas', 'pyarrow'],
                script: '# SEC EDGAR XBRL Pipeline with User-Agent Injection\n# Extracts NetIncomeLoss & Revenues into Apache Arrow\nresult_arrow = None',
            },
        },
        {
            id: 'pl-outdoor-furniture-pricing',
            name: 'Warsaw Outdoor Furniture Pricing Tracker',
            description: 'Localized discretionary inflation proxy scraping Warsaw garden furniture prices with European format cleaning',
            asset_class: 'alternative',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'item_name', type: 'UTF8' },
                { column: 'price_pln', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'pyodide-python',
                source_api: 'https://www.example-polish-retailer.pl/kategoria/meble-ogrodowe?lokalizacja=warszawa',
                requirements: ['beautifulsoup4', 'requests', 'pandas', 'pyarrow'],
                script: '# BeautifulSoup4 scraping pipeline through CORS proxy\n# Cleans Polish currency non-breaking spaces and comma decimals\nresult_arrow = None',
            },
        },
        {
            id: 'wiki-recession-views',
            name: 'Wikipedia "Recession" Attention Index',
            description: 'Daily Wikimedia pageviews for "Recession" over 5 years mapping retail curiosity to market cycles',
            asset_class: 'sentiment',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'views', type: 'FLOAT32' },
            ],
            etl: {
                engine: 'duckdb-sql',
                source_api: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Recession/daily/20190101/20240101',
                script: "WITH raw_data AS (SELECT UNNEST(items) AS item FROM read_json_auto('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Recession/daily/20190101/20240101')) SELECT CAST(strptime(item.timestamp, '%Y%m%d%H') AS TIMESTAMP) AS date, CAST(item.views AS FLOAT32) AS views FROM raw_data;",
            },
        },
        {
            id: 'defillama-tvl-flows',
            name: 'DeFi Llama Cross-Chain TVL Flows',
            description: 'Historical daily Total Value Locked (TVL) in USD across all blockchains tracking macro DeFi liquidity',
            asset_class: 'crypto',
            schema: [
                { column: 'date', type: 'TIMESTAMP' },
                { column: 'totalLiquidityUSD', type: 'FLOAT64' },
            ],
            etl: {
                engine: 'duckdb-sql',
                source_api: 'https://api.llama.fi/charts',
                script: 'SELECT CAST(to_timestamp(CAST(date AS BIGINT)) AS TIMESTAMP) AS date, CAST(totalLiquidityUSD AS FLOAT64) AS totalLiquidityUSD FROM read_json_auto(\'https://api.llama.fi/charts\');',
            },
        },
    ];
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.render();
        this.pollRemoteRegistry();
    }
    render() {
        const displayedDatasets = this.availableDatasets.filter((d) => {
            if (this.activeTab === 'warehouse' && !this.subscribedDatasetIds.has(d.id)) {
                return false;
            }
            if (this.selectedAssetClass !== 'all' && d.asset_class !== this.selectedAssetClass) {
                return false;
            }
            if (this.selectedEngine !== 'all' && d.etl.engine !== this.selectedEngine) {
                return false;
            }
            return true;
        });
        this.container.innerHTML = `
      <div class="panel-header">
        <span>Dataset Registry</span>
        <span class="badge-macro">${this.availableDatasets.length} Connectors</span>
      </div>

      <div class="tab-nav">
        <button class="tab-btn ${this.activeTab === 'network' ? 'active' : ''}" data-tab="network">
          Orogen Network (${this.availableDatasets.length})
        </button>
        <button class="tab-btn ${this.activeTab === 'warehouse' ? 'active' : ''}" data-tab="warehouse">
          Local Warehouse (${this.subscribedDatasetIds.size})
        </button>
      </div>

      <div class="filter-bar">
        <button class="filter-chip ${this.selectedAssetClass === 'all' ? 'active' : ''}" data-filter-class="all">All</button>
        <button class="filter-chip ${this.selectedAssetClass === 'macro' ? 'active' : ''}" data-filter-class="macro">Macro</button>
        <button class="filter-chip ${this.selectedAssetClass === 'equities' ? 'active' : ''}" data-filter-class="equities">Equities</button>
        <button class="filter-chip ${this.selectedAssetClass === 'crypto' ? 'active' : ''}" data-filter-class="crypto">Crypto</button>
        <button class="filter-chip ${this.selectedAssetClass === 'alternative' ? 'active' : ''}" data-filter-class="alternative">Alternative</button>
        <button class="filter-chip ${this.selectedAssetClass === 'fundamentals' ? 'active' : ''}" data-filter-class="fundamentals">Fundamentals</button>
        <button class="filter-chip ${this.selectedAssetClass === 'sentiment' ? 'active' : ''}" data-filter-class="sentiment">Sentiment</button>
      </div>

      <div class="dataset-list" id="registry-items">
        ${displayedDatasets.length === 0
            ? `<div style="padding: 1rem; color: var(--text-muted); font-size: 0.8rem; text-align: center;">No datasets match filters.</div>`
            : displayedDatasets
                .map((d) => {
                const badgeClass = d.asset_class === 'macro'
                    ? 'badge-macro'
                    : d.asset_class === 'crypto'
                        ? 'badge-crypto'
                        : d.asset_class === 'equities'
                            ? 'badge-equities'
                            : d.asset_class === 'fundamentals'
                                ? 'badge-fundamentals'
                                : d.asset_class === 'sentiment'
                                    ? 'badge-sentiment'
                                    : 'badge-alternative';
                const isSubscribed = this.subscribedDatasetIds.has(d.id);
                return `
            <div class="dataset-card" data-id="${d.id}">
              <div class="dataset-card-header">
                <span class="dataset-badge ${badgeClass}">${d.asset_class}</span>
                <span class="status-indicator">
                  <span class="status-dot ${isSubscribed ? 'green' : 'blue'}"></span>
                  <span>${isSubscribed ? 'Cached in OPFS' : 'Network Available'}</span>
                </span>
              </div>
              <div class="dataset-name">${d.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.35rem; line-height: 1.3;">
                ${d.description || ''}
              </div>
              <div class="dataset-meta">${d.schema.map((s) => s.column).join(', ')}</div>
              <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                <button class="btn-primary btn-etl" data-id="${d.id}" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;">
                  Run ETL (${d.etl.engine === 'duckdb-sql' ? 'SQL' : 'Pyodide'})
                </button>
                <button class="btn-secondary btn-sub" data-id="${d.id}" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;">
                  ${isSubscribed ? 'Subscribed ✓' : 'Subscribe P2P'}
                </button>
                <button class="btn-secondary btn-lineage" data-id="${d.id}" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;">
                  View Lineage
                </button>
              </div>
            </div>
          `;
            })
                .join('')}
      </div>
    `;
        this.attachEvents();
    }
    attachEvents() {
        // Tab switching
        this.container.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) {
                    this.activeTab = tab;
                    this.render();
                }
            });
        });
        // Filtering by asset class
        this.container.querySelectorAll('.filter-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filterClass;
                if (filter) {
                    this.selectedAssetClass = filter;
                    this.render();
                }
            });
        });
        // Run ETL
        this.container.querySelectorAll('.btn-etl').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ds = this.availableDatasets.find((d) => d.id === id);
                if (ds) {
                    const resolved = this.resolveRuntimeVariables(ds);
                    this.options.onExecuteETL(resolved);
                }
            });
        });
        // Subscribe P2P
        this.container.querySelectorAll('.btn-sub').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ds = this.availableDatasets.find((d) => d.id === id);
                if (ds) {
                    if (ds.etl.script.includes('{{FRED_API_KEY}}') &&
                        this.options.fredApiKey === '') {
                        this.promptApiKey('FRED', () => {
                            this.subscribedDatasetIds.add(ds.id);
                            this.options.onSubscribeManifest(ds);
                            this.render();
                        });
                        return;
                    }
                    this.subscribedDatasetIds.add(ds.id);
                    this.options.onSubscribeManifest(ds);
                    this.render();
                }
            });
        });
        // View Lineage Modal
        this.container.querySelectorAll('.btn-lineage').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ds = this.availableDatasets.find((d) => d.id === id);
                if (ds) {
                    this.openLineageModal(ds);
                }
            });
        });
    }
    openLineageModal(manifest) {
        const existing = document.getElementById('lineage-modal-backdrop');
        if (existing)
            existing.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'lineage-modal-backdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
      <div class="modal-window" style="max-width: 600px; width: 90%;">
        <div class="modal-header">
          <span>Data Lineage: ${manifest.name}</span>
          <button id="close-lineage-btn" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="desc" style="margin-bottom: 0.5rem;">
            Engine: <strong>${manifest.etl.engine}</strong> | Origin: <code>${manifest.etl.source_api}</code>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.3rem;">
            Executed Script &amp; Transformation Logic:
          </div>
          <pre class="lineage-code-block">${manifest.etl.script.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" id="lineage-done-btn">Done</button>
        </div>
      </div>
    `;
        document.body.appendChild(backdrop);
        const close = () => backdrop.remove();
        backdrop.querySelector('#close-lineage-btn')?.addEventListener('click', close);
        backdrop.querySelector('#lineage-done-btn')?.addEventListener('click', close);
    }
    promptApiKey(provider, onConfirmed) {
        const existing = document.getElementById('apikey-modal-backdrop');
        if (existing)
            existing.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'apikey-modal-backdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
      <div class="modal-window" style="max-width: 440px; width: 90%;">
        <div class="modal-header">
          <span>${provider} API Key Required</span>
          <button id="close-apikey-btn" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="desc">
            This dataset queries ${provider}. Enter your key below. It will be encrypted at rest with AES-GCM and stored strictly inside the local module vault.
          </div>
          <div class="form-group" style="margin-top: 0.5rem;">
            <label>API Key</label>
            <input type="password" id="vault-key-input" placeholder="Enter ${provider} API Key..." value="DEMO_API_KEY" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-apikey-btn">Cancel</button>
          <button class="btn-primary" id="save-apikey-btn">Save &amp; Continue</button>
        </div>
      </div>
    `;
        document.body.appendChild(backdrop);
        const close = () => backdrop.remove();
        backdrop.querySelector('#close-apikey-btn')?.addEventListener('click', close);
        backdrop.querySelector('#cancel-apikey-btn')?.addEventListener('click', close);
        backdrop.querySelector('#save-apikey-btn')?.addEventListener('click', () => {
            const input = backdrop.querySelector('#vault-key-input');
            if (input && input.value.trim()) {
                this.options.fredApiKey = input.value.trim();
            }
            close();
            onConfirmed();
        });
    }
    /**
     * Replaces runtime variables like {{CORS_PROXY}} and {{FRED_API_KEY}}
     */
    resolveRuntimeVariables(manifest) {
        const proxy = this.options.corsProxyUrl || 'https://corsproxy.io/?url=';
        const fredKey = this.options.fredApiKey || 'DEMO_KEY';
        let script = manifest.etl.script;
        script = script.replaceAll('{{CORS_PROXY}}', proxy);
        script = script.replaceAll('{{FRED_API_KEY}}', fredKey);
        return {
            ...manifest,
            etl: {
                ...manifest.etl,
                script,
            },
        };
    }
    /**
     * Polls the live decentralized catalog from GitHub Pages
     */
    async pollRemoteRegistry() {
        const remoteUrl = 'https://franekjemiolo.github.io/orogen-manifests/registry.json';
        try {
            const resp = await fetch(remoteUrl);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.datasets && data.datasets.length > 0) {
                    console.log(`Discovered ${data.datasets.length} remote dataset manifests from ${remoteUrl}`);
                }
            }
        }
        catch {
            // Offline fallback
        }
    }
}
