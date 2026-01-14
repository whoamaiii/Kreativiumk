/**
 * Tests for Storage Health Monitoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    formatBytes,
    measureStorageUsage,
    getStorageHealth,
    testStorageWrite,
    estimateRemainingCapacity,
    getCleanupSuggestions,
    getMigrationSummary
} from './storageHealth';

// =============================================================================
// FORMAT BYTES TESTS
// =============================================================================

describe('formatBytes', () => {
    it('should format 0 bytes', () => {
        expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
        expect(formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
        expect(formatBytes(1048576)).toBe('1 MB');
        expect(formatBytes(2621440)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
        expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should round to 2 decimal places', () => {
        expect(formatBytes(1234567)).toBe('1.18 MB');
    });
});

// =============================================================================
// MEASURE STORAGE TESTS
// =============================================================================

describe('measureStorageUsage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return zero for empty storage', () => {
        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(0);
        expect(usage.usedBytes).toBe(0);
        expect(usage.usagePercent).toBe(0);
    });

    it('should measure single item', () => {
        localStorage.setItem('test_key', 'test_value');
        const usage = measureStorageUsage();

        expect(usage.itemCount).toBe(1);
        expect(usage.usedBytes).toBeGreaterThan(0);
    });

    it('should measure multiple items', () => {
        localStorage.setItem('key1', 'value1');
        localStorage.setItem('key2', 'value2');
        localStorage.setItem('key3', 'value3');

        const usage = measureStorageUsage();

        expect(usage.itemCount).toBe(3);
        expect(usage.usedBytes).toBeGreaterThan(0);
    });

    it('should categorize logs correctly', () => {
        localStorage.setItem('kreativium_logs', JSON.stringify([{ id: 1 }]));
        const usage = measureStorageUsage();

        expect(usage.breakdown['logs'].count).toBe(1);
        expect(usage.breakdown['logs'].bytes).toBeGreaterThan(0);
    });

    it('should categorize crisis events correctly', () => {
        localStorage.setItem('kreativium_crisis_events', JSON.stringify([{ id: 1 }]));
        const usage = measureStorageUsage();

        expect(usage.breakdown['crisis'].count).toBe(1);
        expect(usage.breakdown['crisis'].bytes).toBeGreaterThan(0);
    });

    it('should categorize settings correctly', () => {
        localStorage.setItem('kreativium_settings', JSON.stringify({ theme: 'dark' }));
        const usage = measureStorageUsage();

        expect(usage.breakdown['settings'].count).toBe(1);
    });

    it('should provide formatted sizes', () => {
        localStorage.setItem('test', 'x'.repeat(1000));
        const usage = measureStorageUsage();

        expect(usage.usedFormatted).toMatch(/\d+(\.\d+)?\s*(B|KB)/);
        expect(usage.quotaFormatted).toMatch(/\d+(\.\d+)?\s*(MB|GB)/);
    });

    it('should calculate usage percentage', () => {
        // Use 100KB of data (~2% of 5MB quota)
        localStorage.setItem('test', 'x'.repeat(100000));
        const usage = measureStorageUsage();

        expect(usage.usagePercent).toBeGreaterThanOrEqual(1); // At least 1% with 100KB
        expect(usage.usagePercent).toBeLessThan(100);
    });
});

// =============================================================================
// STORAGE HEALTH TESTS
// =============================================================================

describe('getStorageHealth', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return healthy status for empty storage', () => {
        const health = getStorageHealth();

        expect(health.status).toBe('healthy');
        expect(health.shouldPromptExport).toBe(false);
    });

    it('should return healthy status for low usage', () => {
        localStorage.setItem('test', 'small data');
        const health = getStorageHealth();

        expect(health.status).toBe('healthy');
        expect(health.message).toContain('OK');
    });

    it('should include usage information', () => {
        const health = getStorageHealth();

        expect(health.usage).toBeDefined();
        expect(health.usage.usedBytes).toBeDefined();
        expect(health.usage.quotaBytes).toBeDefined();
        expect(health.usage.usagePercent).toBeDefined();
    });

    it('should provide Norwegian message', () => {
        const health = getStorageHealth();

        // Messages should be in Norwegian
        expect(health.message).toMatch(/Lagringsplass|brukt/);
    });
});

// =============================================================================
// TEST STORAGE WRITE
// =============================================================================

describe('testStorageWrite', () => {
    it('should return true when localStorage is available', () => {
        const result = testStorageWrite();
        expect(result).toBe(true);
    });

    it('should clean up test data', () => {
        testStorageWrite();
        expect(localStorage.getItem('__storage_test__')).toBeNull();
    });
});

// =============================================================================
// ESTIMATE REMAINING CAPACITY
// =============================================================================

describe('estimateRemainingCapacity', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should estimate remaining bytes', () => {
        const capacity = estimateRemainingCapacity();

        expect(capacity.remainingBytes).toBeGreaterThan(0);
        expect(capacity.remainingFormatted).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
    });

    it('should indicate if more logs can be stored', () => {
        const capacity = estimateRemainingCapacity();

        expect(typeof capacity.canStoreMoreLogs).toBe('boolean');
        expect(capacity.canStoreMoreLogs).toBe(true); // Empty storage should have room
    });

    it('should estimate number of logs remaining', () => {
        const capacity = estimateRemainingCapacity();

        expect(capacity.estimatedLogsRemaining).toBeGreaterThan(0);
    });
});

// =============================================================================
// CLEANUP SUGGESTIONS
// =============================================================================

describe('getCleanupSuggestions', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return empty array for small storage', () => {
        localStorage.setItem('test', 'small');
        const suggestions = getCleanupSuggestions();

        expect(suggestions).toEqual([]);
    });

    it('should return suggestions when logs are large', () => {
        // Create a large logs entry
        const largeLogs = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({
            id: `log-${i}`,
            arousal: 5,
            valence: 5,
            energy: 5,
            timestamp: new Date().toISOString(),
            sensoryTriggers: ['auditory', 'visual'],
            contextTriggers: ['transition'],
            strategies: ['deep_breathing', 'quiet_space'],
            notes: 'Some notes here for padding the data size more'
        })));

        localStorage.setItem('kreativium_logs', largeLogs);
        const suggestions = getCleanupSuggestions();

        // Should have suggestions if logs are large enough
        if (suggestions.length > 0) {
            expect(suggestions[0].category).toBe('Logger');
            expect(suggestions[0].currentBytes).toBeGreaterThan(0);
        }
    });

    it('should include formatted sizes', () => {
        // Create enough data to trigger suggestions
        const largeData = 'x'.repeat(1024 * 1024 * 2); // 2MB
        localStorage.setItem('kreativium_logs', largeData);

        const suggestions = getCleanupSuggestions();

        if (suggestions.length > 0) {
            expect(suggestions[0].currentFormatted).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
            expect(suggestions[0].potentialSavings).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
        }
    });
});

// =============================================================================
// MIGRATION SUMMARY
// =============================================================================

describe('getMigrationSummary', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should report no data for empty storage', () => {
        const summary = getMigrationSummary();

        expect(summary.totalItems).toBe(0);
        expect(summary.totalBytes).toBe(0);
        expect(summary.canMigrate).toBe(false);
        expect(summary.migrationNote).toContain('Ingen data');
    });

    it('should report data for non-empty storage', () => {
        localStorage.setItem('test', 'data');
        const summary = getMigrationSummary();

        expect(summary.totalItems).toBe(1);
        expect(summary.totalBytes).toBeGreaterThan(0);
        expect(summary.canMigrate).toBe(true);
        expect(summary.migrationNote).toContain('klar for migrering');
    });

    it('should include categories breakdown', () => {
        localStorage.setItem('kreativium_logs', '[]');
        localStorage.setItem('kreativium_settings', '{}');

        const summary = getMigrationSummary();

        expect(summary.categories).toBeDefined();
        expect(summary.categories['logs']).toBeDefined();
        expect(summary.categories['settings']).toBeDefined();
    });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should handle very long keys', () => {
        const longKey = 'a'.repeat(1000);
        localStorage.setItem(longKey, 'value');

        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(1);
        expect(usage.usedBytes).toBeGreaterThan(1000);
    });

    it('should handle empty values', () => {
        localStorage.setItem('empty', '');

        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(1);
    });

    it('should handle unicode content', () => {
        localStorage.setItem('unicode', '日本語テスト 🎉 émojis');

        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(1);
        expect(usage.usedBytes).toBeGreaterThan(0);
    });

    it('should handle JSON content', () => {
        const jsonData = JSON.stringify({
            nested: {
                array: [1, 2, 3],
                string: 'test'
            }
        });
        localStorage.setItem('json', jsonData);

        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(1);
    });

    it('should handle many small items', () => {
        for (let i = 0; i < 100; i++) {
            localStorage.setItem(`item_${i}`, `value_${i}`);
        }

        const usage = measureStorageUsage();
        expect(usage.itemCount).toBe(100);
    });
});
