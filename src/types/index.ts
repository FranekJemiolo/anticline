export interface TimeSeriesPoint {
  time: number; // Unix timestamp in seconds or ms
  value: number;
}

export interface CandlestickPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface JoinedSeriesPoint {
  time: number;
  price: number;
  macroRate?: number;
  delta?: number;
}

export interface ChartAnnotation {
  id: string;
  type: 'trendline' | 'horizontal' | 'label';
  p1: { time: number; price: number };
  p2?: { time: number; price: number };
  color: string;
  authorPubkey: string;
  text?: string;
}

export interface TurnServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface JoinedQuerySpec {
  primaryDatasetId: string;
  macroDatasetId: string;
  toleranceSeconds: number;
  primaryTimeCol: string;
  primaryValCol: string;
  macroTimeCol: string;
  macroValCol: string;
}

export interface DualStoreStatus {
  coldRowCount: number;
  hotRowCount: number;
  totalRowCount: number;
  flushCount: number;
  lastFlushTime: number;
}
