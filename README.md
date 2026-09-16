# Anticline (The Client)

[![Anticline CI](https://github.com/FranekJemiolo/anticline/actions/workflows/ci.yml/badge.svg)](https://github.com/FranekJemiolo/anticline/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](package.json)
[![Lighthouse Performance](https://img.shields.io/badge/lighthouse-90%2B-brightgreen.svg)](lighthouserc.json)

> **Offline-first visual quant terminal and visual workbench for the Orogen lakehouse.**

Anticline provides institutional-grade visual analytics, multi-dataset temporal joins, real-time tick streaming, and serverless P2P collaboration natively inside the browser.

---

## Architectural Highlights

- **Zero-Copy Performance:** Passes Apache Arrow columnar tables across Web Workers via `SharedArrayBuffer` for 60 FPS rendering of multi-million row datasets.
- **Delta-Append Dual-Store:** Combines cold historical Parquet queries with hot streaming tick buffers, auto-flushing to OPFS at 50,000 records.
- **Visual ASOF Join Builder:** Drag-and-drop workbench to visually align intraday equities/crypto trades with macroeconomic benchmarks.
- **P2P Multiplayer Collaboration:** Serverless synchronization of chart annotations, trendlines, and viewport anchors via Yjs CRDTs.
- **NAT Traversal Diagnostics:** Integrated STUN/TURN fallback configuration alerting users when symmetric NAT blocks direct P2P swarming.
- **Cross-Origin Isolation:** GitHub Pages ready with automatic COOP/COEP header injection via `coi-serviceworker`.

---

## Directory Structure

```
anticline/
├── .github/workflows/       # CI verification & GitHub Pages docs workflow
├── docs/assets/             # Headless verification screenshots & specs
├── public/                  # PWA icons, manifest.json, coi-serviceworker.js
├── src/
│   ├── bridge/              # Zero-copy WebWorker IPC data bridge
│   ├── components/
│   │   ├── chart/           # TradingView Lightweight Charts & Arrow ingestion
│   │   ├── join-builder/    # Visual drag-and-drop ASOF JOIN interface
│   │   ├── settings/        # STUN/TURN configuration & ICE diagnostics
│   │   └── terminal/        # Dark quant workspace dock and layout
│   ├── multiplayer/         # Yjs CRDT mesh synchronization
│   ├── store/               # Delta-append dual store & IndexedDB state
│   └── types/               # TypeScript declarations
├── tests/e2e/               # Playwright E2E & WebRTC multi-peer test suites
├── playwright.config.ts     # Chromium OPFS & WebRTC test runner config
└── lighthouserc.json        # Lighthouse CI >90 performance assertions
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Launch development server
npm run dev

# Run unit tests
npm test

# Run Playwright E2E test suite
npm run test:e2e

# Run Lighthouse performance audit
npm run lighthouse
```

## Data Sources & Secret Vault

Anticline connects to the decentralized Orogen catalog with 18 multi-asset production connectors (Macro, Equities, Fixed Income, FX, Commodities, Crypto, Fundamentals, Sentiment, Alternative, Satellite, and News feeds).

- **Encrypted Local Vault**: API keys (e.g. FRED) are protected at rest via **AES-GCM (256-bit)** with keys derived via **PBKDF2 (100,000 rounds)** and stored strictly in IndexedDB (`orogen_vault`).
- **Zero Plaintext Leaks**: Keys exist only in ephemeral execution memory when running queries.
- **Configurable Proxies**: Built-in support for CORS proxies and custom endpoint proxies.

📖 For complete instructions on managing secrets, configuring sources, and adding new feeds, see the [Anticline Data Sources Guide](docs/DATA_SOURCES.md).

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
