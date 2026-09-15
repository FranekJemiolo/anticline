# Anticline Architecture Specification

Anticline is a desktop-class Progressive Web Application (PWA) serving as the visual quant terminal and collaborative workbench for the Orogen decentralized lakehouse.

## 1. System Architecture

```mermaid
graph TD
    subgraph Browser_Main_Thread ["Anticline UI (Main Thread)"]
        UI[Terminal Dashboard]
        VJB[Visual Join Builder]
        Chart[TradingView Lightweight Charts]
        HotBuf[Hot Buffer: Live Tick Ingestion]
        CRDT[Yjs Multiplayer CRDT]
        Store[IndexedDB Persistent State]
    end

    subgraph Workers_and_Storage ["Background Subsystems"]
        COI[coi-serviceworker (COOP/COEP)]
        Bridge[Zero-Copy IPC Bridge]
        DuckDB[Orogen DuckDB-Wasm Engine]
        OPFS[(Cold Storage: OPFS Parquet)]
    end

    UI --> VJB
    VJB -->|Dispatch ASOF Join| Bridge
    Bridge -->|Zero-Copy Arrow Vectors| DuckDB
    DuckDB -->|Stream Parquet Range| OPFS
    Bridge -->|Transferable RecordBatches| Chart
    HotBuf -->|Flush @ 50k rows| OPFS
    HotBuf -->|Continuous Append| Chart
    CRDT <-->|Sync Annotations| UI
    UI <--> Store
```

## 2. Cross-Origin Isolation (COOP / COEP)
To unlock WebAssembly multithreading and `SharedArrayBuffer` on static hosts (e.g. GitHub Pages), Anticline boots through `coi-serviceworker.js`. The service worker intercepts navigation and resource requests, injecting:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## 3. Zero-Copy IPC Data Bridge
Transferring millions of financial rows via JSON serialization causes unacceptable frame drops. Anticline passes Apache Arrow IPC buffers or `SharedArrayBuffer` memory addresses between the Orogen DuckDB worker and the UI main thread.

## 4. Delta-Append Dual-Store Architecture
Financial analytics requires querying decades of historical tick/bar data alongside microsecond live streaming updates:
- **Cold Storage:** Immutable Parquet files queried by DuckDB-Wasm via OPFS.
- **Hot Buffer:** An in-memory Apache Arrow `RecordBatch` ingesting live tick WebSockets.
- **Unified Visual Layer:** The charting canvas renders the continuous union of cold history and hot buffer.
- **Auto-Flush Threshold:** Once hot memory reaches 50,000 records (or end-of-day close), the buffer flushes to OPFS as a new Parquet partition and registers in the Iceberg catalog.

## 5. Visual ASOF Join Builder
Allows analysts to drag-and-drop disparate time-series (e.g. high-frequency tick data + daily treasury yield macro curves). Anticline dynamically compiles and dispatches DuckDB `ASOF JOIN` queries with user-specified temporal tolerance windows.

## 6. Serverless Multiplayer via Yjs
Drawings, trendlines, and viewport coordinates are synchronized across a Nostr/WebRTC mesh via Yjs CRDTs without central server coordination.
