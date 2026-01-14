/**
 * Tests for Data Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
    validateLogEntry,
    validateCrisisEvent,
    detectSuspiciousPatterns,
    generateDataQualityReport,
    isValidEntry,
    filterValidEntries,
    getEntriesNeedingAttention
} from './dataValidation';
import type { LogEntry, CrisisEvent } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Helper to create invalid test data by setting fields to invalid values.
 * This bypasses TypeScript's type checking for testing validation functions.
 */
function setInvalid<T, K extends keyof T>(obj: T, key: K, value: unknown): void {
    (obj as Record<string, unknown>)[key as string] = value;
}

/**
 * Helper to delete fields from test data for validation testing.
 */
function deleteField<T>(obj: T, key: keyof T): void {
    delete (obj as Record<string, unknown>)[key as string];
}

function createValidLog(overrides: Partial<LogEntry> = {}): LogEntry {
    return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        arousal: 5,
        valence: 5,
        energy: 5,
        duration: 30,
        context: 'home',
        sensoryTriggers: [],
        contextTriggers: [],
        strategies: [],
        notes: '',
        dayOfWeek: 'monday',
        timeOfDay: 'morning',
        hourOfDay: 10,
        ...overrides
    };
}

function createValidCrisis(overrides: Partial<CrisisEvent> = {}): CrisisEvent {
    return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'meltdown',
        durationSeconds: 600,
        peakIntensity: 8,
        context: 'home',
        sensoryTriggers: [],
        contextTriggers: [],
        warningSignsObserved: [],
        strategiesUsed: [],
        resolution: 'self_regulated',
        notes: '',
        ...overrides
    };
}

// =============================================================================
// LOG ENTRY VALIDATION TESTS
// =============================================================================

describe('validateLogEntry', () => {
    describe('Valid entries', () => {
        it('should accept a valid log entry', () => {
            const log = createValidLog();
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept entry with all scale values at minimum', () => {
            const log = createValidLog({ arousal: 1, valence: 1, energy: 1 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true);
        });

        it('should accept entry with all scale values at maximum', () => {
            const log = createValidLog({ arousal: 10, valence: 10, energy: 10 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true);
        });

        it('should accept entry with optional fields missing', () => {
            const log = createValidLog();
            deleteField(log, 'duration');
            deleteField(log, 'notes');

            const result = validateLogEntry(log);
            expect(result.isValid).toBe(true);
        });
    });

    describe('Missing required fields', () => {
        it('should reject entry without id', () => {
            const log = createValidLog();
            setInvalid(log, 'id', undefined);

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'MISSING_ID'
            }));
        });

        it('should reject entry without timestamp', () => {
            const log = createValidLog();
            setInvalid(log, 'timestamp', undefined);

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'MISSING_TIMESTAMP'
            }));
        });

        it('should reject entry without arousal', () => {
            const log = createValidLog();
            setInvalid(log, 'arousal', undefined);

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'MISSING_AROUSAL'
            }));
        });

        it('should reject entry without valence', () => {
            const log = createValidLog();
            setInvalid(log, 'valence', undefined);

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'MISSING_VALENCE'
            }));
        });

        it('should reject entry without energy', () => {
            const log = createValidLog();
            setInvalid(log, 'energy', undefined);

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'MISSING_ENERGY'
            }));
        });
    });

    describe('Invalid values', () => {
        it('should reject arousal below 1', () => {
            const log = createValidLog({ arousal: 0 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'OUT_OF_RANGE_AROUSAL'
            }));
        });

        it('should reject arousal above 10', () => {
            const log = createValidLog({ arousal: 11 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'OUT_OF_RANGE_AROUSAL'
            }));
        });

        it('should reject valence below 1', () => {
            const log = createValidLog({ valence: -1 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'OUT_OF_RANGE_VALENCE'
            }));
        });

        it('should reject energy above 10', () => {
            const log = createValidLog({ energy: 15 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'OUT_OF_RANGE_ENERGY'
            }));
        });

        it('should reject non-numeric scale values', () => {
            const log = createValidLog();
            setInvalid(log, 'arousal', 'high');

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'INVALID_AROUSAL_TYPE'
            }));
        });

        it('should reject NaN values', () => {
            const log = createValidLog({ arousal: NaN });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
        });
    });

    describe('Timestamp validation', () => {
        it('should reject future timestamps', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const log = createValidLog({ timestamp: futureDate.toISOString() });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'FUTURE_TIMESTAMP'
            }));
        });

        it('should reject invalid timestamp format', () => {
            const log = createValidLog({ timestamp: 'not-a-date' });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'INVALID_TIMESTAMP_FORMAT'
            }));
        });

        it('should warn for entries older than 1 year', () => {
            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 2);

            const log = createValidLog({ timestamp: oldDate.toISOString() });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true); // Still valid, just a warning
            expect(result.warnings).toContainEqual(expect.objectContaining({
                code: 'OLD_ENTRY'
            }));
        });
    });

    describe('Extreme value warnings', () => {
        it('should warn for extreme arousal (10)', () => {
            const log = createValidLog({ arousal: 10 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContainEqual(expect.objectContaining({
                code: 'EXTREME_AROUSAL'
            }));
        });

        it('should warn for extreme low energy (1)', () => {
            const log = createValidLog({ energy: 1 });
            const result = validateLogEntry(log);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContainEqual(expect.objectContaining({
                code: 'EXTREME_ENERGY_LOW'
            }));
        });
    });

    describe('Duration validation', () => {
        it('should warn for very short duration', () => {
            const log = createValidLog({ duration: 0.5 });
            const result = validateLogEntry(log);

            expect(result.warnings).toContainEqual(expect.objectContaining({
                code: 'VERY_SHORT_DURATION'
            }));
        });

        it('should warn for very long duration', () => {
            const log = createValidLog({ duration: 25 * 60 }); // 25 hours
            const result = validateLogEntry(log);

            expect(result.warnings).toContainEqual(expect.objectContaining({
                code: 'VERY_LONG_DURATION'
            }));
        });
    });

    describe('Array field validation', () => {
        it('should reject non-array sensoryTriggers', () => {
            const log = createValidLog();
            setInvalid(log, 'sensoryTriggers', 'auditory');

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'INVALID_SENSORYTRIGGERS_TYPE'
            }));
        });

        it('should reject non-array contextTriggers', () => {
            const log = createValidLog();
            setInvalid(log, 'contextTriggers', { type: 'transition' });

            const result = validateLogEntry(log);

            expect(result.isValid).toBe(false);
        });
    });
});

// =============================================================================
// CRISIS EVENT VALIDATION TESTS
// =============================================================================

describe('validateCrisisEvent', () => {
    it('should accept a valid crisis event', () => {
        const crisis = createValidCrisis();
        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject crisis without type', () => {
        const crisis = createValidCrisis();
        setInvalid(crisis, 'type', undefined);

        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            code: 'MISSING_TYPE'
        }));
    });

    it('should reject invalid crisis type', () => {
        const crisis = createValidCrisis();
        setInvalid(crisis, 'type', 'tantrum');

        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            code: 'INVALID_TYPE'
        }));
    });

    it('should reject negative duration', () => {
        const crisis = createValidCrisis({ durationSeconds: -100 });
        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            code: 'INVALID_DURATION'
        }));
    });

    it('should warn for very long crisis', () => {
        const crisis = createValidCrisis({ durationSeconds: 25 * 60 * 60 }); // 25 hours
        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContainEqual(expect.objectContaining({
            code: 'VERY_LONG_CRISIS'
        }));
    });

    it('should reject peak intensity out of range', () => {
        const crisis = createValidCrisis({ peakIntensity: 15 });
        const result = validateCrisisEvent(crisis);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            code: 'INVALID_PEAK_INTENSITY'
        }));
    });
});

// =============================================================================
// SUSPICIOUS PATTERN DETECTION TESTS
// =============================================================================

describe('detectSuspiciousPatterns', () => {
    describe('Duplicate detection', () => {
        it('should detect duplicate entries within 5 minutes', () => {
            const now = Date.now();
            const logs = [
                createValidLog({
                    timestamp: new Date(now).toISOString(),
                    arousal: 7, valence: 6, energy: 5
                }),
                createValidLog({
                    timestamp: new Date(now + 60000).toISOString(), // 1 minute later
                    arousal: 7, valence: 6, energy: 5
                })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns).toContainEqual(expect.objectContaining({
                type: 'duplicate'
            }));
        });

        it('should not flag entries with different values', () => {
            const now = Date.now();
            const logs = [
                createValidLog({
                    timestamp: new Date(now).toISOString(),
                    arousal: 7, valence: 6, energy: 5
                }),
                createValidLog({
                    timestamp: new Date(now + 60000).toISOString(),
                    arousal: 8, valence: 6, energy: 5 // Different arousal
                })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns.find(p => p.type === 'duplicate')).toBeUndefined();
        });

        it('should not flag entries more than 5 minutes apart', () => {
            const now = Date.now();
            const logs = [
                createValidLog({
                    timestamp: new Date(now).toISOString(),
                    arousal: 7, valence: 6, energy: 5
                }),
                createValidLog({
                    timestamp: new Date(now + 10 * 60000).toISOString(), // 10 minutes later
                    arousal: 7, valence: 6, energy: 5
                })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns.find(p => p.type === 'duplicate')).toBeUndefined();
        });
    });

    describe('Monotonous data detection', () => {
        it('should detect 10+ entries with identical values', () => {
            const now = Date.now();
            const logs = Array.from({ length: 12 }, (_, i) =>
                createValidLog({
                    timestamp: new Date(now + i * 60 * 60000).toISOString(), // 1 hour apart
                    arousal: 5, valence: 5, energy: 5
                })
            );

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns).toContainEqual(expect.objectContaining({
                type: 'monotonous',
                severity: 'high'
            }));
        });

        it('should not flag fewer than 10 identical entries', () => {
            const now = Date.now();
            const logs = Array.from({ length: 8 }, (_, i) =>
                createValidLog({
                    timestamp: new Date(now + i * 60 * 60000).toISOString(),
                    arousal: 5, valence: 5, energy: 5
                })
            );

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns.find(p => p.type === 'monotonous')).toBeUndefined();
        });

        it('should not flag varied data', () => {
            const now = Date.now();
            const logs = Array.from({ length: 15 }, (_, i) =>
                createValidLog({
                    timestamp: new Date(now + i * 60 * 60000).toISOString(),
                    arousal: (i % 5) + 3, // Varies 3-7
                    valence: 5,
                    energy: 5
                })
            );

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns.find(p => p.type === 'monotonous')).toBeUndefined();
        });
    });

    describe('Impossible timestamp detection', () => {
        it('should detect future timestamps', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            const logs = [
                createValidLog(),
                createValidLog({ timestamp: futureDate.toISOString() })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns).toContainEqual(expect.objectContaining({
                type: 'impossible_timestamp'
            }));
        });

        it('should detect timestamps before 2020', () => {
            const logs = [
                createValidLog(),
                createValidLog({ timestamp: '2019-01-01T12:00:00Z' })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns).toContainEqual(expect.objectContaining({
                type: 'impossible_timestamp'
            }));
        });
    });

    describe('Outlier cluster detection', () => {
        it('should detect 3+ extreme values within 1 hour', () => {
            const now = Date.now();
            const logs = [
                createValidLog({
                    timestamp: new Date(now).toISOString(),
                    arousal: 10
                }),
                createValidLog({
                    timestamp: new Date(now + 10 * 60000).toISOString(), // 10 min later
                    arousal: 10
                }),
                createValidLog({
                    timestamp: new Date(now + 20 * 60000).toISOString(), // 20 min later
                    energy: 1
                })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns).toContainEqual(expect.objectContaining({
                type: 'outlier_cluster'
            }));
        });

        it('should not flag spread-out extreme values', () => {
            const now = Date.now();
            const logs = [
                createValidLog({
                    timestamp: new Date(now).toISOString(),
                    arousal: 10
                }),
                createValidLog({
                    timestamp: new Date(now + 3 * 60 * 60000).toISOString(), // 3 hours later
                    arousal: 10
                }),
                createValidLog({
                    timestamp: new Date(now + 6 * 60 * 60000).toISOString(), // 6 hours later
                    energy: 1
                })
            ];

            const patterns = detectSuspiciousPatterns(logs);

            expect(patterns.find(p => p.type === 'outlier_cluster')).toBeUndefined();
        });
    });

    it('should handle empty log array', () => {
        const patterns = detectSuspiciousPatterns([]);
        expect(patterns).toEqual([]);
    });

    it('should handle single log entry', () => {
        const patterns = detectSuspiciousPatterns([createValidLog()]);
        expect(patterns).toEqual([]);
    });
});

// =============================================================================
// DATA QUALITY REPORT TESTS
// =============================================================================

describe('generateDataQualityReport', () => {
    it('should generate report for valid data', () => {
        // Use varied values to avoid triggering monotonous data pattern
        const logs = Array.from({ length: 10 }, (_, i) =>
            createValidLog({ arousal: (i % 4) + 4, valence: (i % 3) + 4, energy: (i % 5) + 3 })
        );

        const report = generateDataQualityReport(logs);

        expect(report.totalEntries).toBe(10);
        expect(report.validEntries).toBe(10);
        expect(report.errorEntries).toBe(0);
        expect(report.qualityScore).toBeGreaterThanOrEqual(90);
    });

    it('should reduce quality score for errors', () => {
        const logs = [
            createValidLog(),
            createValidLog({ arousal: 15 }), // Invalid
            createValidLog({ valence: -1 }), // Invalid
        ];

        const report = generateDataQualityReport(logs);

        expect(report.errorEntries).toBe(2);
        expect(report.qualityScore).toBeLessThan(90);
    });

    it('should include suspicious patterns in report', () => {
        const now = Date.now();
        const logs = Array.from({ length: 12 }, (_, i) =>
            createValidLog({
                timestamp: new Date(now + i * 60 * 60000).toISOString(),
                arousal: 5, valence: 5, energy: 5
            })
        );

        const report = generateDataQualityReport(logs);

        expect(report.suspiciousPatterns.length).toBeGreaterThan(0);
        expect(report.qualityScore).toBeLessThan(100);
    });

    it('should include crisis events in report', () => {
        const logs = [createValidLog()];
        const crises = [
            createValidCrisis(),
            createValidCrisis({ peakIntensity: 15 }) // Invalid
        ];

        const report = generateDataQualityReport(logs, crises);

        expect(report.totalEntries).toBe(3);
        expect(report.errorEntries).toBe(1);
    });

    it('should provide Norwegian summary', () => {
        const logs = Array.from({ length: 5 }, () => createValidLog());
        const report = generateDataQualityReport(logs);

        // Summary should be in Norwegian
        expect(report.summary).toMatch(/datakvalitet|data|analyse/i);
    });

    it('should handle empty data', () => {
        const report = generateDataQualityReport([]);

        expect(report.totalEntries).toBe(0);
        expect(report.qualityScore).toBe(100);
    });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('isValidEntry', () => {
    it('should return true for valid entry', () => {
        const log = createValidLog();
        expect(isValidEntry(log)).toBe(true);
    });

    it('should return false for invalid entry', () => {
        const log = createValidLog({ arousal: 15 });
        expect(isValidEntry(log)).toBe(false);
    });
});

describe('filterValidEntries', () => {
    it('should filter out invalid entries', () => {
        const logs = [
            createValidLog(),
            createValidLog({ arousal: 15 }), // Invalid
            createValidLog(),
            createValidLog({ valence: -1 }), // Invalid
        ];

        const valid = filterValidEntries(logs);

        expect(valid).toHaveLength(2);
    });

    it('should return empty array for all invalid entries', () => {
        const logs = [
            createValidLog({ arousal: 15 }),
            createValidLog({ valence: -1 }),
        ];

        const valid = filterValidEntries(logs);

        expect(valid).toHaveLength(0);
    });
});

describe('getEntriesNeedingAttention', () => {
    it('should return entries with errors', () => {
        const logs = [
            createValidLog(),
            createValidLog({ arousal: 15 }), // Error
        ];

        const needsAttention = getEntriesNeedingAttention(logs);

        expect(needsAttention).toHaveLength(1);
        expect(needsAttention[0].result.isValid).toBe(false);
    });

    it('should return entries with warnings', () => {
        const logs = [
            createValidLog(),
            createValidLog({ arousal: 10 }), // Warning: extreme value
        ];

        const needsAttention = getEntriesNeedingAttention(logs);

        expect(needsAttention).toHaveLength(1);
        expect(needsAttention[0].result.warnings.length).toBeGreaterThan(0);
    });

    it('should not return clean entries', () => {
        const logs = [
            createValidLog({ arousal: 5 }),
            createValidLog({ arousal: 6 }),
        ];

        const needsAttention = getEntriesNeedingAttention(logs);

        expect(needsAttention).toHaveLength(0);
    });
});
