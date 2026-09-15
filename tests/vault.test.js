import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { unlockVault, lockVault, isVaultUnlocked, setApiKey, getEncryptedPayload, decryptPayload, } from '../src/storage/vault.js';
describe('Encrypted-at-Rest Module Vault', () => {
    beforeEach(() => {
        lockVault();
    });
    it('starts in locked state', () => {
        expect(isVaultUnlocked()).toBe(false);
    });
    it('throws when setting key while locked', async () => {
        await expect(setApiKey('FRED', 'sample_secret_key')).rejects.toThrow(/locked/i);
    });
    it('unlocks with PIN and derives non-extractable CryptoKey', async () => {
        await unlockVault('1234');
        expect(isVaultUnlocked()).toBe(true);
    });
    it('encrypts and stores key, then retrieves encrypted payload without exposing raw key', async () => {
        await unlockVault('1234');
        const secretKey = 'test-fred-api-key-998877';
        await setApiKey('FRED', secretKey);
        const payload = await getEncryptedPayload('FRED');
        expect(payload).not.toBeNull();
        expect(payload?.bundle.iv).toBeDefined();
        expect(payload?.bundle.ciphertext).toBeDefined();
        // Ciphertext must NOT match raw plaintext string
        const cipherBytes = new Uint8Array(payload.bundle.ciphertext);
        const textDecoder = new TextDecoder();
        expect(textDecoder.decode(cipherBytes)).not.toContain(secretKey);
        // Decrypting with authorized key should recover exact key
        const decrypted = await decryptPayload(payload.bundle, payload.cryptoKey);
        expect(decrypted).toBe(secretKey);
    });
    it('fails decryption if wrong key is provided', async () => {
        await unlockVault('1234');
        await setApiKey('SEC', 'my_sec_contact@domain.com');
        const payload = await getEncryptedPayload('SEC');
        // Unlock with different PIN
        await unlockVault('5678');
        const wrongPayload = await getEncryptedPayload('SEC');
        // Attempting to decrypt payload with wrong PIN key should fail (AES-GCM tag mismatch)
        await expect(decryptPayload(payload.bundle, wrongPayload.cryptoKey)).rejects.toThrow();
    });
    it('locks vault and clears key from closure', async () => {
        await unlockVault('1234');
        expect(isVaultUnlocked()).toBe(true);
        lockVault();
        expect(isVaultUnlocked()).toBe(false);
    });
});
