import { describe, it, expect } from 'vitest';
import { VisualJoinBuilder } from '../src/components/join-builder/JoinBuilder.js';
describe('Visual ASOF Join Builder Query Synthesis', () => {
    it('synthesizes valid DuckDB ASOF JOIN SQL query', () => {
        const dummyContainer = document.createElement('div');
        const mockBridge = {};
        const builder = new VisualJoinBuilder(dummyContainer, {
            workerBridge: mockBridge,
            onJoinExecuted: () => { },
        });
        const sql = builder.generateSQL();
        expect(sql).toContain('ASOF JOIN');
        expect(sql).toContain('ON t.timestamp >= m.timestamp');
        expect(sql).toContain('price_delta');
    });
});
