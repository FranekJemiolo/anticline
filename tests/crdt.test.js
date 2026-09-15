import { describe, it, expect } from 'vitest';
import { CRDTRoom } from '../src/multiplayer/crdt-room.js';
describe('CRDT Multiplayer Chart Annotations', () => {
    it('synchronizes annotations between two peer rooms via binary state updates', () => {
        const peer1 = new CRDTRoom({
            roomId: 'desk-1',
            userPubkey: 'user_1',
        });
        const peer2 = new CRDTRoom({
            roomId: 'desk-1',
            userPubkey: 'user_2',
        });
        peer1.addAnnotation({
            id: 'trend_1',
            type: 'trendline',
            p1: { time: 1000, price: 60000 },
            p2: { time: 2000, price: 65000 },
            color: '#38bdf8',
            authorPubkey: 'user_1',
            text: 'Resistance',
        });
        // Exchange binary state updates
        const update1 = peer1.encodeStateUpdate();
        peer2.applyPeerUpdate(update1);
        const peer2Annotations = peer2.getAnnotations();
        expect(peer2Annotations.length).toBe(1);
        expect(peer2Annotations[0].id).toBe('trend_1');
        expect(peer2Annotations[0].text).toBe('Resistance');
        peer1.destroy();
        peer2.destroy();
    });
});
