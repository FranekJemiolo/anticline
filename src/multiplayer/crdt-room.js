import * as Y from 'yjs';
export class CRDTRoom {
    doc;
    annotationsArray;
    awarenessMap;
    options;
    constructor(options) {
        this.options = options;
        this.doc = new Y.Doc();
        this.annotationsArray = this.doc.getArray('chart_annotations');
        this.awarenessMap = this.doc.getMap('awareness_presence');
        this.initListeners();
    }
    initListeners() {
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
    addAnnotation(annotation) {
        this.doc.transact(() => {
            this.annotationsArray.push([annotation]);
        });
    }
    removeAnnotation(id) {
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
    getAnnotations() {
        return this.annotationsArray.toArray();
    }
    /**
     * Generates a binary state update to broadcast over the Nostr/WebRTC mesh
     */
    encodeStateUpdate() {
        return Y.encodeStateAsUpdate(this.doc);
    }
    /**
     * Applies an incoming binary state update received from a peer data channel
     */
    applyPeerUpdate(update) {
        Y.applyUpdate(this.doc, update);
    }
    destroy() {
        this.awarenessMap.delete(this.options.userPubkey);
        this.doc.destroy();
    }
}
