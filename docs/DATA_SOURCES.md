# Data Sources, Configuration & Secret Vault in Anticline

This guide explains how **Anticline** discovers, ingests, and manages data sources, handles secrets and API tokens via its client-side encrypted vault, and configures runtime parameters like CORS proxies.

---

## 1. Discovering & Ingesting Datasets

Anticline features a built-in **Dataset Registry Terminal** with 18 multi-asset connectors covering:
- **Macro**: FRED Treasury Yield Curves, NBP Central Bank Rates, World Bank Global GDP.
- **Equities**: Yahoo Finance SPY ETF 10-Year Daily Bars.
- **Fixed Income**: ICE BofA US High Yield OAS.
- **FX**: European Central Bank EUR/USD Reference Rates.
- **Commodities**: World Bank Monthly Benchmark Pink Sheets.
- **Crypto**: Binance 1m BTC/USDT Klines, DeFi Llama Multi-Chain TVL.
- **Fundamentals**: SEC EDGAR Apple 10-Q/10-K Disclosures.
- **Sentiment**: Wikipedia "Recession" Attention Index.
- **Alternative**: Open-Meteo Brazil Coffee Rainfall Archive, Polish Retail Tracker.
- **Satellite**: Sentinel-2 STAC Multispectral Earth Search, NASA Earth Observatory.
- **News**: Federal Reserve Press Releases, SEC EDGAR 8-K Atom Stream, Algolia News Stream.

### Live Catalog Synchronization
On startup, Anticline automatically polls the decentralized catalog published at:
`https://franekjemiolo.github.io/orogen-manifests/registry.json`

If offline, it falls back to its bundled, high-performance connectors.

---

## 2. Managing Secrets, Tokens & The Module Vault

Certain data sources (such as Federal Reserve FRED feeds) require an API key. Anticline implements an institutional-grade, **zero-knowledge local vault** to ensure sensitive keys are never transmitted to any central server or stored unencrypted.

### How the Vault Works ([src/storage/vault.ts](../src/storage/vault.ts)):
1. **Web Crypto AES-GCM 256-bit Encryption**:
   - Master key is derived using `PBKDF2` with `SHA-256` over **100,000 iterations** with a unique cryptographic salt.
   - Data payloads are encrypted using `AES-GCM` with a cryptographically secure 12-byte initialization vector (`iv`).
2. **Encrypted at Rest**:
   - The resulting ciphertext and IV are stored in the browser's local IndexedDB (`orogen_vault` database, `api_keys` object store).
   - Keys are never saved to plain `localStorage` or `sessionStorage`.
3. **Ephemeral In-Memory Execution**:
   - When the user runs an ETL pipeline that references `{{FRED_API_KEY}}`, the key is decrypted in-memory only for the duration of the query.
   - Calling `lockVault()` wipes the master crypto key from memory.

### Providing Keys via the UI:
When you click **"Ingest (ETL)"** or **"Subscribe P2P"** on a dataset requiring credentials:
1. Anticline detects the `{{KEY_NAME}}` variable.
2. A secure modal prompts you for your API key.
3. The key is encrypted into the local vault and substituted into the execution template.

---

## 3. Configuring Existing Sources & Runtime Variables

### 1. Custom CORS Proxy URL
By default, browser-restricted APIs are routed via a configurable CORS proxy (e.g. `https://corsproxy.io/?url=`).
To configure a self-hosted or alternative proxy:
```typescript
const registry = new DatasetRegistry(container, {
  corsProxyUrl: 'https://my-proxy.company.internal/?url=',
  onExecuteETL: (manifest) => { ... },
  onSubscribeManifest: (manifest) => { ... },
});
```

### 2. Inspecting Pipeline Lineage Before Ingestion
Every dataset card in the terminal provides a **"Lineage"** button:
- Clicking **Lineage** displays the full JSON manifest, engine type (`duckdb-sql` or `pyodide-python`), target API URL, and full SQL/Python transformation script.
- Analysts can inspect and verify the query logic before granting network and execution permissions.

---

## 4. Adding New Sources to Anticline

To add new sources:
1. Follow the [Orogen Manifests Sources Guide](https://github.com/FranekJemiolo/orogen-manifests/blob/main/docs/SOURCES_GUIDE.md) to author and validate your JSON manifest.
2. Once merged into `FranekJemiolo/orogen-manifests`, Anticline's live catalog synchronization will automatically discover and display it.
3. For local or private datasets, register the manifest directly in `src/components/terminal/DatasetRegistry.ts`:
   ```typescript
   this.availableDatasets.push({
     id: 'my-custom-indicator',
     name: 'My Custom Indicator',
     description: 'Proprietary intraday spread calculation.',
     asset_class: 'alternative',
     schema: [
       { column: 'timestamp', type: 'TIMESTAMP' },
       { column: 'value', type: 'FLOAT32' }
     ],
     etl: {
       engine: 'duckdb-sql',
       source_api: 'https://api.internal/data.json',
       script: 'SELECT ...'
     }
   });
   ```

---

## 5. Security Best Practices
- **Never hardcode secrets** in manifest JSON files or Git repositories.
- Use the `{{KEY_NAME}}` template placeholder for all sensitive tokens.
- Keep your vault unlocked only when active ingestion is occurring.
