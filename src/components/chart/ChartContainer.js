import { createChart } from 'lightweight-charts';
export class ChartContainer {
    container;
    chart = null;
    candleSeries = null;
    macroSeries = null;
    overlayCanvas;
    overlayCtx = null;
    constructor(container) {
        this.container = container;
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '10';
        this.initChart();
    }
    initChart() {
        if (typeof window === 'undefined' || !this.container)
            return;
        this.chart = createChart(this.container, {
            width: this.container.clientWidth || 800,
            height: this.container.clientHeight || 500,
            layout: {
                background: { color: '#070a13' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#131b2e' },
                horzLines: { color: '#131b2e' },
            },
            crosshair: {
                vertLine: { color: '#38bdf8', width: 1, style: 1 },
                horzLine: { color: '#38bdf8', width: 1, style: 1 },
            },
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
                secondsVisible: false,
            },
        });
        this.candleSeries = this.chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });
        this.macroSeries = this.chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 2,
            priceScaleId: 'left',
            title: 'Macro Benchmark (Yield %)',
        });
        this.chart.priceScale('left').applyOptions({
            borderColor: '#1e293b',
            visible: true,
        });
        this.chart.priceScale('right').applyOptions({
            borderColor: '#1e293b',
            visible: true,
        });
        this.container.appendChild(this.overlayCanvas);
        this.resizeOverlay();
        window.addEventListener('resize', () => {
            if (this.chart && this.container) {
                this.chart.applyOptions({
                    width: this.container.clientWidth,
                    height: this.container.clientHeight,
                });
                this.resizeOverlay();
            }
        });
    }
    resizeOverlay() {
        if (!this.container)
            return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.overlayCanvas.width = w * (window.devicePixelRatio || 1);
        this.overlayCanvas.height = h * (window.devicePixelRatio || 1);
        this.overlayCanvas.style.width = `${w}px`;
        this.overlayCanvas.style.height = `${h}px`;
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        if (this.overlayCtx) {
            this.overlayCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        }
    }
    /**
     * Directly ingests an Apache Arrow Table into the chart without JSON parsing
     */
    ingestArrowTable(table) {
        const timeCol = table.getChild('time') || table.getChild('timestamp');
        const openCol = table.getChild('open');
        const highCol = table.getChild('high');
        const lowCol = table.getChild('low');
        const closeCol = table.getChild('close') || table.getChild('price');
        const macroCol = table.getChild('macro_rate');
        if (!timeCol)
            return;
        if (openCol && highCol && lowCol && closeCol && this.candleSeries) {
            const candles = [];
            for (let i = 0; i < table.numRows; i++) {
                let t = Number(timeCol.get(i));
                if (t > 1e11)
                    t = Math.floor(t / 1000); // normalize ms to seconds
                candles.push({
                    time: t,
                    open: Number(openCol.get(i)),
                    high: Number(highCol.get(i)),
                    low: Number(lowCol.get(i)),
                    close: Number(closeCol.get(i)),
                });
            }
            this.candleSeries.setData(candles);
        }
        if (macroCol && this.macroSeries) {
            const macroPoints = [];
            for (let i = 0; i < table.numRows; i++) {
                let t = Number(timeCol.get(i));
                if (t > 1e11)
                    t = Math.floor(t / 1000);
                const val = Number(macroCol.get(i));
                if (!isNaN(val)) {
                    macroPoints.push({ time: t, value: val });
                }
            }
            this.macroSeries.setData(macroPoints);
        }
    }
    setCandles(candles) {
        if (this.candleSeries) {
            this.candleSeries.setData(candles);
        }
    }
    updateLatestCandle(candle) {
        if (this.candleSeries) {
            this.candleSeries.update(candle);
        }
    }
    setMacroSeries(points) {
        if (this.macroSeries) {
            this.macroSeries.setData(points);
        }
    }
    /**
     * Renders collaborative trendlines on high-DPI canvas overlay
     */
    renderAnnotations(annotations) {
        if (!this.overlayCtx)
            return;
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        for (const ann of annotations) {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(ann.x1, ann.y1);
            ctx.lineTo(ann.x2, ann.y2);
            ctx.stroke();
            if (ann.label) {
                ctx.fillStyle = ann.color;
                ctx.font = '11px monospace';
                ctx.fillText(ann.label, ann.x1 + 6, ann.y1 - 6);
            }
        }
        ctx.setLineDash([]);
    }
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
    }
}
