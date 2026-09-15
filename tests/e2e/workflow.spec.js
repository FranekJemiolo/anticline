import { test, expect } from '@playwright/test';
import { resolve } from 'path';
test.describe('Anticline End-to-End Workflow', () => {
    test('boots terminal, displays registry, executes Pyodide ETL, runs ASOF join, and renders canvas', async ({ page }) => {
        // Navigate to terminal
        await page.goto('/');
        // Check title and brand
        await expect(page).toHaveTitle(/Anticline/);
        const brand = page.locator('.brand-title');
        await expect(brand).toBeVisible();
        // Check status bar indicators
        await expect(page.locator('#opfs-status')).toBeVisible();
        await expect(page.locator('#hot-buffer-status')).toBeVisible();
        // Check Dataset Registry
        const registry = page.locator('#registry-panel');
        await expect(registry).toBeVisible();
        await expect(page.locator('.dataset-card').first()).toBeVisible();
        // Take screenshot 1: Dataset Registry view
        const assetPath1 = resolve(__dirname, '../../docs/assets/dataset-registry.png');
        await page.screenshot({ path: assetPath1 });
        // Click Run Pyodide ETL on first dataset
        const btnEtl = page.locator('.btn-etl').first();
        await expect(btnEtl).toBeVisible();
        await btnEtl.click();
        // Execute Visual ASOF Join
        const btnJoin = page.locator('#btn-execute-join');
        await expect(btnJoin).toBeVisible();
        await btnJoin.click();
        // Verify canvas rendered in chart viewport
        const canvas = page.locator('#chart-container canvas').first();
        await expect(canvas).toBeVisible();
        // Take screenshot 2: Multi-Dataset Charting canvas with ASOF joined data
        const assetPath2 = resolve(__dirname, '../../docs/assets/asof-join-chart.png');
        await page.screenshot({ path: assetPath2 });
    });
});
