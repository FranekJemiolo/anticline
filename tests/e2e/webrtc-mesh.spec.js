import { test, expect } from '@playwright/test';
import { resolve } from 'path';
test.describe('P2P WebRTC Multi-Peer Swarm Test', () => {
    test('launches Browser A (host) and Browser B (peer), transfers chunk, and renders on Browser B canvas', async ({ browser }) => {
        // Launch Context A
        const contextA = await browser.newContext();
        const pageA = await contextA.newPage();
        await pageA.goto('/');
        await expect(pageA.locator('.brand-title')).toBeVisible();
        // Browser A triggers Pyodide ETL and hosts dataset
        const btnEtlA = pageA.locator('.btn-etl').first();
        await expect(btnEtlA).toBeVisible();
        await btnEtlA.click();
        // Launch Context B
        const contextB = await browser.newContext();
        const pageB = await contextB.newPage();
        await pageB.goto('/');
        await expect(pageB.locator('.brand-title')).toBeVisible();
        // Browser B subscribes to dataset
        const btnSubB = pageB.locator('.btn-sub').first();
        await expect(btnSubB).toBeVisible();
        await btnSubB.click();
        // Execute ASOF join on Browser B
        const btnJoinB = pageB.locator('#btn-execute-join');
        await expect(btnJoinB).toBeVisible();
        await btnJoinB.click();
        // Assert that Browser B's canvas renders the data
        const canvasB = pageB.locator('#chart-container canvas').first();
        await expect(canvasB).toBeVisible();
        // Capture collaborative multiplayer screenshot
        const assetPath3 = resolve(__dirname, '../../docs/assets/multiplayer-session.png');
        await pageB.screenshot({ path: assetPath3 });
        await contextA.close();
        await contextB.close();
    });
});
