# Anticline Release v1.0.0

## Release Notes: v1.0.0 — The Visual Quant Terminal

Anticline is an offline-first, institutional-grade Progressive Web Application (PWA) delivering visual financial analytics, multi-dataset temporal joins, real-time tick streaming, and serverless P2P collaboration on top of the Orogen lakehouse.

### Key Capabilities & Features

#### 1. Cross-Origin Isolation on Static Hosts
- Bundles `coi-serviceworker.js` to dynamically inject `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on GitHub Pages and static web hosts.
- Unlocks browser `SharedArrayBuffer` and WebAssembly multithreading without requiring backend infrastructure.

#### 2. Zero-Copy IPC Data Bridge
- Implements transferable `ArrayBuffer` and `SharedArrayBuffer` memory pipelines between background DuckDB workers and the UI main thread.
- Deserializes Apache Arrow columnar batches in sub-millisecond times, maintaining responsive 60 FPS rendering on multi-million row datasets.

#### 3. Delta-Append Dual-Store Architecture
- Unifies historical immutable Parquet blocks (Cold Storage in OPFS) with in-memory Arrow `RecordBatch` buffers (Hot Buffer ingesting real-time WebSocket ticks).
- Renders continuous real-time candlestick charts with micro-animations.
- Auto-flushes hot buffer to OPFS as an immutable Parquet partition upon reaching 50,000 records.

#### 4. Visual ASOF Join Builder
- Interactive drag-and-drop workbench allowing quantitative analysts to correlate disparate financial time-series (e.g. macro yield curves with intraday order books).
- Synthesizes and executes vectorized DuckDB `ASOF JOIN` queries with user-defined temporal tolerance windows.

#### 5. Serverless CRDT Multiplayer
- Integrates Yjs CRDTs to synchronize chart trendlines, annotations, and analyst viewports across the WebRTC P2P mesh.
- Requires zero central server coordination; operates entirely over decentralized relays.

#### 6. NAT Traversal Diagnostics & TURN Fallback
- Proactively monitors WebRTC ICE connection states.
- If ICE checking state exceeds 5 seconds due to symmetric corporate firewalls, prompts the user with an alert and settings dialog to configure Twilio or Metered TURN relays.

#### 7. Automated Testing & Verification
- Playwright E2E test suites with Chromium flags: `--enable-features=FileSystemAccessAPI --disable-web-security`.
- Automated two-instance browser test simulating Browser A hosting a dataset and Browser B fetching, verifying, and rendering it.
- Lighthouse CI performance assertion exceeding 90.

### Checksums & Artifacts
- Source code: [https://github.com/FranekJemiolo/anticline](https://github.com/FranekJemiolo/anticline)
- License: Apache-2.0
