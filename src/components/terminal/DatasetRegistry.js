export class DatasetRegistry {
    container;
    options;
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
                script: '# Pyodide yfinance zero-copy pipeline\nresult_arrow = None',
            },
        },
        {
            id: 'binance-btc-1m',
            name: 'Binance BTC/USDT 1m K-Lines',
            description: 'High-volume 1-minute candlestick data paginated with 0.5s rate-limit backoffs',
            asset_class: 'alternative',
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
                script: '# Binance 1000-candle paginated batches\nresult_arrow = None',
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
        this.container.innerHTML = `
      <div class="panel-header">
        <span>Dataset Registry</span>
        <span class="badge-macro">${this.availableDatasets.length} Connectors</span>
      </div>
      <div class="dataset-list" id="registry-items">
        ${this.availableDatasets
            .map((d) => `
          <div class="dataset-card" data-id="${d.id}">
            <div class="dataset-card-header">
              <span class="dataset-badge ${d.asset_class === 'macro' ? 'badge-macro' : 'badge-crypto'}">${d.asset_class}</span>
              <span class="status-indicator">
                <span class="status-dot green"></span>
                <span>Verified Connector</span>
              </span>
            </div>
            <div class="dataset-name">${d.name}</div>
            <div class="dataset-meta">${d.schema.map((s) => s.column).join(', ')}</div>
            <div style="margin-top: 0.5rem; display: flex; gap: 0.4rem;">
              <button class="btn-primary btn-etl" data-id="${d.id}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                Run ETL (${d.etl.engine === 'duckdb-sql' ? 'SQL' : 'Pyodide'})
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
                if (ds) {
                    // Resolve runtime variables (CORS proxy & FRED API key)
                    const resolved = this.resolveRuntimeVariables(ds);
                    this.options.onExecuteETL(resolved);
                }
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
     * Optionally polls the live decentralized catalog from GitHub Pages
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
