import './style.css';
import { WorkerBridge } from './bridge/worker-bridge.js';
import { DualStore } from './store/dual-store.js';
import { TerminalStateStore } from './store/terminal-state.js';
import { ChartContainer } from './components/chart/ChartContainer.js';
import { VisualJoinBuilder } from './components/join-builder/JoinBuilder.js';
import { DatasetRegistry } from './components/terminal/DatasetRegistry.js';
import { CRDTRoom } from './multiplayer/crdt-room.js';
import { TurnSettingsModal } from './components/settings/TurnSettingsModal.js';
import { OPFSStorageEngine, PyodideETLRunner } from '@franekjemiolo/orogen';
async function bootstrap() {
    const appEl = document.getElementById('app');
    if (!appEl)
        return;
    // Initialize UI Shell
    appEl.innerHTML = `
    <header class="top-nav">
      <div class="brand">
        <div class="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="brand-title">ANTICLINE <span>TERMINAL</span></div>
      </div>
      <div class="status-bar">
        <div class="status-indicator" id="coop-status">
          <span class="status-dot ${window.crossOriginIsolated ? 'green' : 'yellow'}"></span>
          <span>COOP/COEP: ${window.crossOriginIsolated ? 'ISOLATED' : 'STANDARD'}</span>
        </div>
        <div class="status-indicator" id="opfs-status">
          <span class="status-dot green"></span>
          <span id="opfs-text">OPFS: 12.4 MB</span>
        </div>
        <div class="status-indicator" id="hot-buffer-status">
          <span class="status-dot blue"></span>
          <span id="hot-buffer-text">Hot Buffer: 0 rows</span>
        </div>
        <div class="status-indicator" id="p2p-status">
          <span class="status-dot green"></span>
          <span id="p2p-text">Swarm: 4 Peers</span>
        </div>
        <button id="btn-turn-config" class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
          TURN Settings
        </button>
      </div>
    </header>

    <div class="workspace-grid">
      <!-- Left Panel: Dataset Registry -->
      <aside class="sidebar-panel" id="registry-panel"></aside>

      <!-- Center Stage: Financial Charts & Visual Join Builder -->
      <main class="stage-panel">
        <div class="chart-toolbar">
          <div class="tool-group">
            <div class="symbol-selector">
              <span>BTC-USDT / USD (Spot Intraday)</span>
            </div>
          </div>
          <div class="tool-group">
            <span class="status-indicator">
              <span class="status-dot green"></span>
              <span>Live Tick Stream</span>
            </span>
            <button id="btn-add-annotation" class="btn-secondary" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">
              + Trendline (CRDT)
            </button>
          </div>
        </div>

        <div class="chart-viewport" id="chart-container"></div>
        <div class="join-builder-dock" id="join-builder-dock"></div>
      </main>

      <!-- Right Panel: Collaboration & Swarm Metrics -->
      <aside class="sidebar-panel right">
        <div class="panel-header">
          <span>Swarm &amp; Collaboration</span>
          <span class="badge-crypto">Nostr Mesh</span>
        </div>
        <div style="padding: 1rem; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.8rem;">
          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 0.3rem;">Serverless P2P Swarm</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">
              Connected via Kind 29333 ephemeral Nostr relay mesh. Chunks transferred with 64KB SCTP flow control and SHA-256 Merkle root verification.
            </div>
          </div>

          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 0.3rem;">Delta-Append Pipeline</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">
              Cold: Parquet partitions in OPFS<br/>
              Hot: In-memory Arrow RecordBatch<br/>
              Auto-flush: At 50,000 live ticks
            </div>
          </div>

          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 0.3rem;">CRDT Multiplayer Room</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary);" id="crdt-peers-count">
              Active Analysts: 2
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;
    // Mount UI Components synchronously
    const chartEl = document.getElementById('chart-container');
    const chartContainer = new ChartContainer(chartEl);
    const workerBridge = new WorkerBridge();
    const joinDock = document.getElementById('join-builder-dock');
    new VisualJoinBuilder(joinDock, {
        workerBridge,
        onJoinExecuted: (joinedTable) => {
            chartContainer.ingestArrowTable(joinedTable);
        },
    });
    const pyodideRunner = new PyodideETLRunner();
    const registryPanel = document.getElementById('registry-panel');
    new DatasetRegistry(registryPanel, {
        onSubscribeManifest: async (manifest) => {
            console.log(`Subscribed to P2P swarm for dataset: ${manifest.name}`);
        },
        onExecuteETL: async (manifest) => {
            console.log(`Starting Pyodide sandboxed ETL for ${manifest.id}...`);
            const res = await pyodideRunner.executeManifest(manifest);
            console.log(`ETL complete: ${res.rowCount} rows. Deterministic SHA-256: ${res.deterministicSha256}`);
            if (opfs) {
                await opfs.writeChunk(manifest.id, 0, res.arrowBuffer, res.deterministicSha256);
            }
        },
    });
    // Initialize Core Subsystems
    const opfs = new OPFSStorageEngine();
    try {
        await opfs.init();
    }
    catch (e) {
        console.warn('OPFS init warning:', e);
    }
    const stateStore = new TerminalStateStore();
    let config = {};
    try {
        config = await stateStore.init();
    }
    catch { }
    // Initialize DualStore
    const hotBufferText = document.getElementById('hot-buffer-text');
    const dualStore = new DualStore('btc-usdt-intraday', opfs, {
        onStatusChange: (status) => {
            if (hotBufferText) {
                hotBufferText.textContent = `Hot Buffer: ${status.hotRowCount} rows (${status.coldRowCount} cold)`;
            }
        },
        onFlushTriggered: (count) => {
            console.log(`Auto-flushed ${count} hot ticks into OPFS Parquet partition.`);
        },
    });
    // Query baseline data via WorkerBridge and feed chart
    try {
        const initialTable = await workerBridge.executeQuery('SELECT * FROM btc_usdt_candles');
        chartContainer.ingestArrowTable(initialTable);
    }
    catch (err) {
        console.warn('Initial chart query error:', err);
    }
    // Initialize CRDT Multiplayer
    const crdtRoom = new CRDTRoom({
        roomId: 'quant-desk-alpha',
        userPubkey: `analyst_${Math.random().toString(36).slice(2, 6)}`,
        onAnnotationsChanged: (anns) => {
            const screenAnns = anns.map((a, i) => ({
                x1: 50 + i * 80,
                y1: 100 + (i % 3) * 40,
                x2: 250 + i * 80,
                y2: 120 + (i % 3) * 40,
                color: a.color || '#38bdf8',
                label: a.text || 'Trendline',
            }));
            chartContainer.renderAnnotations(screenAnns);
        },
        onPresenceChanged: (peers) => {
            const pEl = document.getElementById('crdt-peers-count');
            if (pEl)
                pEl.textContent = `Active Analysts: ${peers.length}`;
        },
    });
    document.getElementById('btn-add-annotation')?.addEventListener('click', () => {
        crdtRoom.addAnnotation({
            id: `ann_${Date.now()}`,
            type: 'trendline',
            p1: { time: Date.now(), price: 64200 },
            p2: { time: Date.now() + 3600, price: 65100 },
            color: '#38bdf8',
            authorPubkey: 'local_user',
            text: 'Support Line',
        });
    });
    // Initialize TURN settings modal & ICE monitor
    const turnModal = new TurnSettingsModal(document.body, {
        initialConfig: config.turnConfig,
        onSave: async (newConfig) => {
            await stateStore.saveConfig({ turnConfig: newConfig });
            console.log('Saved custom TURN credentials:', newConfig);
        },
    });
    document.getElementById('btn-turn-config')?.addEventListener('click', () => {
        turnModal.openModal();
    });
    // Start live tick ingestion simulation (Delta-Append dual store)
    let currentPrice = 64150.0;
    setInterval(async () => {
        currentPrice += (Math.random() - 0.49) * 1.5;
        await dualStore.ingestTick({
            time: Math.floor(Date.now() / 1000),
            price: currentPrice,
            volume: Math.random() * 2.5,
        });
    }, 1000);
}
// Boot application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
}
else {
    bootstrap();
}
