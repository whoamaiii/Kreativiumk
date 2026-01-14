/**
 * Storage Health Monitoring
 * Monitors localStorage usage and provides warnings before storage limits are reached
 * Prepares for future IndexedDB migration
 */

// =============================================================================
// TYPES
// =============================================================================

export interface StorageUsage {
    /** Total bytes used by localStorage */
    usedBytes: number;
    /** Estimated quota (5MB default for most browsers) */
    quotaBytes: number;
    /** Usage percentage (0-100) */
    usagePercent: number;
    /** Human-readable used size */
    usedFormatted: string;
    /** Human-readable quota size */
    quotaFormatted: string;
    /** Number of items in localStorage */
    itemCount: number;
    /** Breakdown by key prefix */
    breakdown: Record<string, { bytes: number; count: number }>;
}

export interface StorageHealthStatus {
    /** Overall health status */
    status: 'healthy' | 'warning' | 'critical' | 'error';
    /** Usage information */
    usage: StorageUsage;
    /** Warning or error message */
    message: string;
    /** Recommended action */
    recommendation?: string;
    /** Whether user should be prompted to export data */
    shouldPromptExport: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const STORAGE_CONFIG = {
    /** Default localStorage quota (5MB is typical for most browsers) */
    defaultQuotaBytes: 5 * 1024 * 1024,
    /** Warning threshold percentage */
    warningThreshold: 70,
    /** Critical threshold percentage */
    criticalThreshold: 90,
    /** App-specific key prefix */
    appKeyPrefix: 'kreativium_',
    /** Keys that belong to this app */
    appKeys: [
        'kreativium_logs',
        'kreativium_crisis_events',
        'kreativium_schedule',
        'kreativium_goals',
        'kreativium_child_profile',
        'kreativium_settings',
        'kreativium_onboarding_completed',
        'kreativium_app_context',
    ]
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Calculate the byte size of a string (UTF-16 for localStorage)
 */
function getStringByteSize(str: string): number {
    // localStorage stores strings as UTF-16, which is 2 bytes per character
    // However, for estimation, we use UTF-8 which is more accurate for typical JSON data
    return new Blob([str]).size;
}

// =============================================================================
// STORAGE MEASUREMENT
// =============================================================================

/**
 * Measure current localStorage usage
 */
export function measureStorageUsage(): StorageUsage {
    let totalBytes = 0;
    let itemCount = 0;
    const breakdown: Record<string, { bytes: number; count: number }> = {};

    // Initialize breakdown categories
    breakdown['logs'] = { bytes: 0, count: 0 };
    breakdown['crisis'] = { bytes: 0, count: 0 };
    breakdown['schedule'] = { bytes: 0, count: 0 };
    breakdown['goals'] = { bytes: 0, count: 0 };
    breakdown['profile'] = { bytes: 0, count: 0 };
    breakdown['settings'] = { bytes: 0, count: 0 };
    breakdown['other'] = { bytes: 0, count: 0 };

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            const value = localStorage.getItem(key) || '';
            const keyBytes = getStringByteSize(key);
            const valueBytes = getStringByteSize(value);
            const itemBytes = keyBytes + valueBytes;

            totalBytes += itemBytes;
            itemCount++;

            // Categorize by key pattern
            let category = 'other';
            if (key.includes('logs') || key.includes('log')) {
                category = 'logs';
            } else if (key.includes('crisis')) {
                category = 'crisis';
            } else if (key.includes('schedule')) {
                category = 'schedule';
            } else if (key.includes('goals') || key.includes('goal')) {
                category = 'goals';
            } else if (key.includes('profile') || key.includes('child')) {
                category = 'profile';
            } else if (key.includes('settings') || key.includes('onboarding') || key.includes('context')) {
                category = 'settings';
            }

            breakdown[category].bytes += itemBytes;
            breakdown[category].count++;
        }
    } catch (error) {
        // localStorage might not be available
        if (import.meta.env.DEV) {
            console.error('[StorageHealth] Failed to measure storage:', error);
        }
    }

    const quotaBytes = STORAGE_CONFIG.defaultQuotaBytes;
    const usagePercent = Math.round((totalBytes / quotaBytes) * 100);

    return {
        usedBytes: totalBytes,
        quotaBytes,
        usagePercent,
        usedFormatted: formatBytes(totalBytes),
        quotaFormatted: formatBytes(quotaBytes),
        itemCount,
        breakdown
    };
}

/**
 * Estimate remaining storage capacity
 */
export function estimateRemainingCapacity(): {
    remainingBytes: number;
    remainingFormatted: string;
    canStoreMoreLogs: boolean;
    estimatedLogsRemaining: number;
} {
    const usage = measureStorageUsage();
    const remainingBytes = Math.max(0, usage.quotaBytes - usage.usedBytes);

    // Estimate average log size (approximately 500 bytes per log entry)
    const avgLogSize = 500;
    const estimatedLogsRemaining = Math.floor(remainingBytes / avgLogSize);

    return {
        remainingBytes,
        remainingFormatted: formatBytes(remainingBytes),
        canStoreMoreLogs: remainingBytes > avgLogSize * 10, // At least 10 more logs
        estimatedLogsRemaining
    };
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Get overall storage health status
 */
export function getStorageHealth(): StorageHealthStatus {
    try {
        const usage = measureStorageUsage();

        if (usage.usagePercent >= STORAGE_CONFIG.criticalThreshold) {
            return {
                status: 'critical',
                usage,
                message: `Lagringsplass nesten full (${usage.usagePercent}% brukt)`,
                recommendation: 'Eksporter data og slett gamle logger for å frigjøre plass',
                shouldPromptExport: true
            };
        }

        if (usage.usagePercent >= STORAGE_CONFIG.warningThreshold) {
            return {
                status: 'warning',
                usage,
                message: `Lagringsplass begynner å bli full (${usage.usagePercent}% brukt)`,
                recommendation: 'Vurder å eksportere data som sikkerhetskopi',
                shouldPromptExport: true
            };
        }

        return {
            status: 'healthy',
            usage,
            message: `Lagringsplass OK (${usage.usagePercent}% brukt)`,
            shouldPromptExport: false
        };
    } catch {
        return {
            status: 'error',
            usage: {
                usedBytes: 0,
                quotaBytes: STORAGE_CONFIG.defaultQuotaBytes,
                usagePercent: 0,
                usedFormatted: '0 B',
                quotaFormatted: formatBytes(STORAGE_CONFIG.defaultQuotaBytes),
                itemCount: 0,
                breakdown: {}
            },
            message: 'Kunne ikke måle lagringsplass',
            shouldPromptExport: false
        };
    }
}

// =============================================================================
// STORAGE TEST
// =============================================================================

/**
 * Test if we can write to localStorage
 * Returns true if write succeeds, false otherwise
 */
export function testStorageWrite(): boolean {
    const testKey = '__storage_test__';
    const testValue = 'test';

    try {
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return retrieved === testValue;
    } catch {
        return false;
    }
}

/**
 * Test available storage by attempting to write progressively larger data
 * Returns actual available bytes (may differ from quota)
 */
export function testActualCapacity(): number {
    const testKey = '__capacity_test__';
    let size = 1024; // Start with 1KB
    const maxSize = 10 * 1024 * 1024; // Max 10MB test

    // First, clean up any existing test data
    try {
        localStorage.removeItem(testKey);
    } catch {
        // Ignore
    }

    let lastSuccessfulSize = 0;

    while (size <= maxSize) {
        try {
            const testData = 'x'.repeat(size);
            localStorage.setItem(testKey, testData);
            lastSuccessfulSize = size;
            size *= 2; // Double the size
        } catch {
            // Quota exceeded
            break;
        }
    }

    // Clean up
    try {
        localStorage.removeItem(testKey);
    } catch {
        // Ignore
    }

    // Get current usage to calculate actual remaining
    const usage = measureStorageUsage();
    return lastSuccessfulSize + (usage.quotaBytes - usage.usedBytes - lastSuccessfulSize);
}

// =============================================================================
// DATA CLEANUP SUGGESTIONS
// =============================================================================

export interface CleanupSuggestion {
    category: string;
    currentBytes: number;
    currentFormatted: string;
    itemCount: number;
    suggestion: string;
    potentialSavings: string;
}

/**
 * Get suggestions for reducing storage usage
 */
export function getCleanupSuggestions(): CleanupSuggestion[] {
    const usage = measureStorageUsage();
    const suggestions: CleanupSuggestion[] = [];

    // Check logs (usually the largest)
    const logsData = usage.breakdown['logs'];
    if (logsData && logsData.bytes > 1024 * 1024) { // > 1MB
        suggestions.push({
            category: 'Logger',
            currentBytes: logsData.bytes,
            currentFormatted: formatBytes(logsData.bytes),
            itemCount: logsData.count,
            suggestion: 'Eksporter og arkiver logger eldre enn 90 dager',
            potentialSavings: formatBytes(logsData.bytes * 0.5) // Estimate 50% savings
        });
    }

    // Check crisis events
    const crisisData = usage.breakdown['crisis'];
    if (crisisData && crisisData.bytes > 512 * 1024) { // > 512KB
        suggestions.push({
            category: 'Krisehendelser',
            currentBytes: crisisData.bytes,
            currentFormatted: formatBytes(crisisData.bytes),
            itemCount: crisisData.count,
            suggestion: 'Eksporter og arkiver krisehendelser eldre enn 6 måneder',
            potentialSavings: formatBytes(crisisData.bytes * 0.3)
        });
    }

    // Check for orphaned data
    const otherData = usage.breakdown['other'];
    if (otherData && otherData.bytes > 100 * 1024) { // > 100KB
        suggestions.push({
            category: 'Annet',
            currentBytes: otherData.bytes,
            currentFormatted: formatBytes(otherData.bytes),
            itemCount: otherData.count,
            suggestion: 'Vurder å rydde opp i ubrukte data',
            potentialSavings: formatBytes(otherData.bytes)
        });
    }

    return suggestions;
}

// =============================================================================
// MONITORING HOOK SUPPORT
// =============================================================================

/**
 * Storage event listener for multi-tab synchronization
 * Call this to set up a listener that triggers callback on storage changes
 */
export function onStorageChange(callback: (usage: StorageUsage) => void): () => void {
    const handler = (event: StorageEvent) => {
        // Only respond to our app's keys
        if (event.key && event.key.startsWith(STORAGE_CONFIG.appKeyPrefix)) {
            callback(measureStorageUsage());
        }
    };

    window.addEventListener('storage', handler);

    // Return cleanup function
    return () => {
        window.removeEventListener('storage', handler);
    };
}

// =============================================================================
// EXPORT FOR FUTURE INDEXEDDB MIGRATION
// =============================================================================

/**
 * Prepare data summary for migration to IndexedDB
 * Returns statistics about what would need to be migrated
 */
export function getMigrationSummary(): {
    totalItems: number;
    totalBytes: number;
    categories: Record<string, { count: number; bytes: number }>;
    canMigrate: boolean;
    migrationNote: string;
} {
    const usage = measureStorageUsage();

    return {
        totalItems: usage.itemCount,
        totalBytes: usage.usedBytes,
        categories: usage.breakdown,
        canMigrate: usage.usedBytes > 0,
        migrationNote: usage.usedBytes > 0
            ? `${usage.itemCount} elementer (${usage.usedFormatted}) klar for migrering til IndexedDB`
            : 'Ingen data å migrere'
    };
}
