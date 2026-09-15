import { tableFromArrays, tableToIPC } from 'apache-arrow';
export const FLUSH_THRESHOLD_ROWS = 50000;
export class DualStore {
    opfs;
    datasetId;
    coldRows = [];
    hotTicks = [];
    flushCount = 0;
    lastFlushTime = Date.now();
    onStatusChange;
    onFlushTriggered;
    constructor(datasetId, opfs, options) {
        this.datasetId = datasetId;
        this.opfs = opfs;
        this.onStatusChange = options?.onStatusChange;
        this.onFlushTriggered = options?.onFlushTriggered;
    }
    /**
     * Initializes cold storage by loading historical records
     */
    setColdData(candles) {
        this.coldRows = [...candles];
        this.notifyStatus();
    }
    /**
     * Ingests high-frequency live streaming ticks into the hot in-memory buffer
     */
    async ingestTick(tick) {
        this.hotTicks.push(tick);
        // Auto-flush when hot buffer reaches threshold (50,000 rows)
        if (this.hotTicks.length >= FLUSH_THRESHOLD_ROWS) {
            await this.flushHotBufferToOPFS();
        }
        else if (this.hotTicks.length % 50 === 0) {
            this.notifyStatus();
        }
    }
    /**
     * Flushes in-memory hot buffer into an immutable Parquet chunk in OPFS
     */
    async flushHotBufferToOPFS() {
        if (this.hotTicks.length === 0)
            return;
        const count = this.hotTicks.length;
        const times = this.hotTicks.map((t) => t.time);
        const prices = this.hotTicks.map((t) => t.price);
        const volumes = this.hotTicks.map((t) => t.volume);
        // Convert hot buffer into Arrow Table and serialized IPC
        const arrowTable = tableFromArrays({
            timestamp: times,
            price: prices,
            volume: volumes,
        });
        const buffer = tableToIPC(arrowTable).buffer;
        // Persist to OPFS
        const chunkIndex = this.flushCount++;
        const hashHex = `flush_${chunkIndex}_${Date.now()}`;
        await this.opfs.writeChunk(this.datasetId, chunkIndex, buffer, hashHex);
        // Convert flushed ticks to aggregate candles and merge into cold storage
        const aggregated = this.aggregateTicksToCandles(this.hotTicks);
        this.coldRows.push(...aggregated);
        this.hotTicks = [];
        this.lastFlushTime = Date.now();
        this.onFlushTriggered?.(count);
        this.notifyStatus();
    }
    /**
     * Generates the seamless union of Cold Storage + Hot Buffer for continuous rendering
     */
    getUnifiedCandles() {
        if (this.hotTicks.length === 0) {
            return this.coldRows;
        }
        const hotCandles = this.aggregateTicksToCandles(this.hotTicks);
        return [...this.coldRows, ...hotCandles];
    }
    getStatus() {
        return {
            coldRowCount: this.coldRows.length,
            hotRowCount: this.hotTicks.length,
            totalRowCount: this.coldRows.length + this.hotTicks.length,
            flushCount: this.flushCount,
            lastFlushTime: this.lastFlushTime,
        };
    }
    notifyStatus() {
        this.onStatusChange?.(this.getStatus());
    }
    aggregateTicksToCandles(ticks, intervalSec = 60) {
        const buckets = new Map();
        for (const tick of ticks) {
            const bucketTime = Math.floor(tick.time / intervalSec) * intervalSec;
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, []);
            }
            buckets.get(bucketTime).push(tick);
        }
        const candles = [];
        const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
        for (const bTime of sortedBucketTimes) {
            const bucketTicks = buckets.get(bTime);
            const open = bucketTicks[0].price;
            const close = bucketTicks[bucketTicks.length - 1].price;
            let high = -Infinity;
            let low = Infinity;
            let volume = 0;
            for (const t of bucketTicks) {
                if (t.price > high)
                    high = t.price;
                if (t.price < low)
                    low = t.price;
                volume += t.volume;
            }
            candles.push({
                time: bTime,
                open,
                high,
                low,
                close,
                volume,
            });
        }
        return candles;
    }
}
