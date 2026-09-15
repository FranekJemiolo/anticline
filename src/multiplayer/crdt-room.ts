import * as Y from 'yjs';
import { ChartAnnotation } from '../types/index.js';

export interface CRDTOptions {
  roomId: string;
  userPubkey: string;
  onAnnotationsChanged?: (annotations: ChartAnnotation[]) => void;
  onPresenceChanged?: (peers: string[]) => void;
}

export class CRDTRoom {
  private doc: Y.Doc;
  private annotationsArray: Y.Array<ChartAnnotation>;
  private awarenessMap: Y.Map<any>;
  private options: CRDTOptions;

  constructor(options: CRDTOptions) {
    this.options = options;
    this.doc = new Y.Doc();
    this.annotationsArray = this.doc.getArray<ChartAnnotation>('chart_annotations');
    this.awarenessMap = this.doc.getMap('awareness_presence');

    this.initListeners();
  }

  private initListeners(): void {
    this.annotationsArray.observe(() => {
      const current = this.annotationsArray.toArray();
      this.options.onAnnotationsChanged?.(current);
    });

    this.awarenessMap.observe(() => {
      const activePeers = Array.from(this.awarenessMap.keys());
      this.options.onPresenceChanged?.(activePeers);
    });

    // Set self awareness
    this.awarenessMap.set(this.options.userPubkey, {
      onlineAt: Date.now(),
      status: 'active',
    });
  }

  addAnnotation(annotation: ChartAnnotation): void {
    this.doc.transact(() => {
      this.annotationsArray.push([annotation]);
    });
  }

  removeAnnotation(id: string): void {
    this.doc.transact(() => {
      let targetIndex = -1;
      const all = this.annotationsArray.toArray();
      for (let i = 0; i < all.length; i++) {
        if (all[i]?.id === id) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) {
        this.annotationsArray.delete(targetIndex, 1);
      }
    });
  }

  getAnnotations(): ChartAnnotation[] {
    return this.annotationsArray.toArray();
  }

  /**
   * Generates a binary state update to broadcast over the Nostr/WebRTC mesh
   */
  encodeStateUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Applies an incoming binary state update received from a peer data channel
   */
  applyPeerUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  destroy(): void {
    this.awarenessMap.delete(this.options.userPubkey);
    this.doc.destroy();
  }
}
