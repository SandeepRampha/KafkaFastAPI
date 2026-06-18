/**
 * Safe Storage Utility
 * Provides a robust interface for localStorage with:
 * 1. Automatic JSON serialization/deserialization
 * 2. Key prefixing and versioning
 * 3. Error handling for QuotaExceededError
 */

const STORAGE_PREFIX = "kfm_";
const STORAGE_VERSION = "v1";

class SafeStorage {
    private getFullKey(key: string): string {
        return `${STORAGE_PREFIX}${key}_${STORAGE_VERSION}`;
    }

    setItem(key: string, value: any): boolean {
        try {
            const fullKey = this.getFullKey(key);
            const stringValue = typeof value === "string" ? value : JSON.stringify(value);
            sessionStorage.setItem(fullKey, stringValue);
            return true;
        } catch (error) {
            console.error(`LocalStorage error (setItem): ${key}`, error);
            // Handle QuotaExceededError or other storage failures
            return false;
        }
    }

    getItem<T>(key: string, defaultValue: T | null = null): T | null {
        try {
            const fullKey = this.getFullKey(key);
            const value = sessionStorage.getItem(fullKey);

            if (value === null) return defaultValue;

            // Try to parse as JSON, if it fails, return as string
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as unknown as T;
            }
        } catch (error) {
            console.error(`LocalStorage error (getItem): ${key}`, error);
            return defaultValue;
        }
    }

    removeItem(key: string): void {
        try {
            sessionStorage.removeItem(this.getFullKey(key));
        } catch (error) {
            console.error(`LocalStorage error (removeItem): ${key}`, error);
        }
    }

    clear(): void {
        try {
            // Only clear keys with our prefix to avoid touching other apps' data
            Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error("LocalStorage error (clear)", error);
        }
    }
}

export const storage = new SafeStorage();
