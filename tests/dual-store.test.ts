import { describe, it, expect, vi } from 'vitest';
import { DualStore } from '../src/store/dual-store.js';
import { OPFSStorageEngine } from '@franekjemiolo/orogen';

describe('Delta-Append DualStore', () => {
  it('aggregates live ticks into continuous candles alongside cold storage', async () => {
    const mockOpfs = {
      writeChunk: vi.fn().mockResolvedValue({}),
    } as unknown as OPFSStorageEngine;

    const dualStore = new DualStore('test-series', mockOpfs);

    // Initial cold storage
    dualStore.setColdData([
      { time: 1000, open: 100, high: 105, low: 99, close: 102, volume: 10 },
      { time: 1060, open: 102, high: 104, low: 101, close: 103, volume: 15 },
    ]);

    // Ingest streaming ticks into hot buffer within same 60s interval (bucket 1080)
    await dualStore.ingestTick({ time: 1090, price: 103.5, volume: 1 });
    await dualStore.ingestTick({ time: 1100, price: 104.0, volume: 2 });
    await dualStore.ingestTick({ time: 1110, price: 103.0, volume: 1.5 });

    const unified = dualStore.getUnifiedCandles();
    expect(unified.length).toBe(3); // 2 cold + 1 hot aggregate candle
    expect(unified[2]!.open).toBe(103.5);
    expect(unified[2]!.high).toBe(104.0);
    expect(unified[2]!.low).toBe(103.0);
    expect(unified[2]!.close).toBe(103.0);
    expect(unified[2]!.volume).toBe(4.5);
  });

  it('triggers flush to OPFS when reaching threshold or manually invoked', async () => {
    let flushedCount = 0;
    const mockOpfs = {
      writeChunk: vi.fn().mockResolvedValue({}),
    } as unknown as OPFSStorageEngine;

    const dualStore = new DualStore('test-series', mockOpfs, {
      onFlushTriggered: (count) => {
        flushedCount = count;
      },
    });

    await dualStore.ingestTick({ time: 1000, price: 50, volume: 1 });
    await dualStore.ingestTick({ time: 1001, price: 51, volume: 1 });

    await dualStore.flushHotBufferToOPFS();

    expect(flushedCount).toBe(2);
    expect(mockOpfs.writeChunk).toHaveBeenCalledTimes(1);
    expect(dualStore.getStatus().hotRowCount).toBe(0);
    expect(dualStore.getStatus().coldRowCount).toBe(1); // Merged into cold
  });
});
