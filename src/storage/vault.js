import { openDB } from 'idb';
// 1. THE CLOSURE TRAP
// These variables are NOT exported. They cannot be accessed by window.
// They exist strictly in this module's closure memory space.
let masterCryptoKey = null;
const VAULT_STORE = 'api_keys';
// 2. INITIALIZE INDEXEDDB
let dbPromise = null;
function getDB() {
    if (!dbPromise) {
        dbPromise = openDB('orogen_vault', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(VAULT_STORE)) {
                    db.createObjectStore(VAULT_STORE);
                }
            },
        });
    }
    return dbPromise;
}
// 3. KEY DERIVATION (PBKDF2)
// Derives a strong 256-bit AES-GCM key from a user PIN with 100,000 iterations
export async function unlockVault(pin) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']);
    masterCryptoKey = await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: enc.encode('orogen_static_salt'),
        iterations: 100000,
        hash: 'SHA-256',
    }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, // EXPORTABLE = FALSE (Cannot be extracted from memory)
    ['encrypt', 'decrypt']);
}
export function isVaultUnlocked() {
    return masterCryptoKey !== null;
}
export function lockVault() {
    masterCryptoKey = null;
}
// 4. ENCRYPT & STORE
export async function setApiKey(provider, rawKey) {
    if (!masterCryptoKey)
        throw new Error('Vault is locked. Provide PIN to unlock.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedKey = new TextEncoder().encode(rawKey);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, masterCryptoKey, encodedKey);
    const db = await getDB();
    await db.put(VAULT_STORE, { iv, ciphertext }, provider);
}
// 5. RETRIEVE ENCRYPTED PAYLOAD
// Returns encrypted bundle and non-extractable CryptoKey reference
export async function getEncryptedPayload(provider) {
    const db = await getDB();
    const record = await db.get(VAULT_STORE, provider);
    if (!record)
        return null;
    return {
        bundle: record,
        cryptoKey: masterCryptoKey,
    };
}
// 6. DECRYPT PAYLOAD
// Used within authorized execution context (e.g. Worker/ETL execution)
export async function decryptPayload(bundle, cryptoKey) {
    const key = cryptoKey || masterCryptoKey;
    if (!key)
        throw new Error('Vault is locked');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bundle.iv }, key, bundle.ciphertext);
    return new TextDecoder().decode(decrypted);
}
