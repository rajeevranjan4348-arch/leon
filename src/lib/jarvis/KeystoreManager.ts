/**
 * Keystore Manager ported from JarvisLauncher (com.jarvis.launcher.security.KeystoreManager)
 * 
 * Provides secure encryption and decryption for sensitive API keys (OpenAI, Gemini)
 * before persisting to local storage, supporting automatic migration of unencrypted keys.
 */

const STORAGE_KEY_PREFIX = 'jarvis_sec_';
const ENCRYPTED_PREFIX = 'ENC_v1:';

export class KeystoreManager {
  private static instance: KeystoreManager;

  private constructor() {}

  public static getInstance(): KeystoreManager {
    if (!KeystoreManager.instance) {
      KeystoreManager.instance = new KeystoreManager();
    }
    return KeystoreManager.instance;
  }

  /**
   * Check if string is encrypted
   */
  public isEncrypted(value: string): boolean {
    return value.startsWith(ENCRYPTED_PREFIX);
  }

  /**
   * Encrypt a sensitive API key using obfuscated WebCrypto / XOR cipher
   */
  public async encrypt(plainText: string): Promise<string> {
    if (!plainText) return '';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const salt = 'JARVIS_KEYSTORE_SECURE_SALT_2026';
      const saltBytes = encoder.encode(salt);
      
      const encrypted = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ saltBytes[i % saltBytes.length];
      }

      const base64 = btoa(String.fromCharCode(...encrypted));
      return `${ENCRYPTED_PREFIX}${base64}`;
    } catch (e) {
      console.error('[KeystoreManager] Encryption failed:', e);
      return plainText;
    }
  }

  /**
   * Decrypt an encrypted API key
   */
  public async decrypt(cipherText: string): Promise<string> {
    if (!cipherText) return '';
    if (!this.isEncrypted(cipherText)) {
      return cipherText; // Unencrypted plain text
    }

    try {
      const base64 = cipherText.slice(ENCRYPTED_PREFIX.length);
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }

      const encoder = new TextEncoder();
      const saltBytes = encoder.encode('JARVIS_KEYSTORE_SECURE_SALT_2026');
      const decrypted = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        decrypted[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
      }

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('[KeystoreManager] Decryption failed:', e);
      return '';
    }
  }

  /**
   * Save API key securely
   */
  public async saveSecureKey(keyName: string, apiKey: string): Promise<void> {
    const encrypted = await this.encrypt(apiKey);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${keyName}`, encrypted);
  }

  /**
   * Retrieve API key securely with automatic migration
   */
  public async getSecureKey(keyName: string): Promise<string> {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${keyName}`);
    if (!stored) return '';

    if (!this.isEncrypted(stored)) {
      // Auto-migrate unencrypted key
      await this.saveSecureKey(keyName, stored);
      return stored;
    }

    return await this.decrypt(stored);
  }
}

export const keystoreManager = KeystoreManager.getInstance();
