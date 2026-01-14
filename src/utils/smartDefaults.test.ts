/**
 * Tests for Smart Defaults Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    calculateSmartDefaults,
    getFrequentTriggers,
    getEffectiveStrategies,
    getLastUsedContext,
    getContextualTriggerSuggestions,
    getContextualStrategySuggestions,
    detectContextFromTime
} from './smartDefaults';
import type { LogEntry } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createLog(overrides: Partial<LogEntry> = {}): LogEntry {
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
        note: '',
        dayOfWeek: 'monday',
        timeOfDay: 'morning',
        hourOfDay: 10,
        ...overrides
    };
}

function createLogsForTimeOfDay(hour: number, count: number, values: Partial<LogEntry> = {}): LogEntry[] {
    const logs: LogEntry[] = [];
    for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        logs.push(createLog({
            timestamp: date.toISOString(),
            ...values
        }));
    }
    return logs;
}

// =============================================================================
// DETECT CONTEXT FROM TIME TESTS
// =============================================================================

describe('detectContextFromTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return school during weekday school hours', () => {
        // Monday at 10am
        vi.setSystemTime(new Date('2024-01-15T10:00:00'));
        expect(detectContextFromTime()).toBe('school');
    });

    it('should return home during weekday evening', () => {
        // Monday at 7pm
        vi.setSystemTime(new Date('2024-01-15T19:00:00'));
        expect(detectContextFromTime()).toBe('home');
    });

    it('should return home on weekends', () => {
        // Saturday at 10am
        vi.setSystemTime(new Date('2024-01-13T10:00:00'));
        expect(detectContextFromTime()).toBe('home');
    });

    it('should return home early morning on weekdays', () => {
        // Monday at 7am
        vi.setSystemTime(new Date('2024-01-15T07:00:00'));
        expect(detectContextFromTime()).toBe('home');
    });
});

// =============================================================================
// GET FREQUENT TRIGGERS TESTS
// =============================================================================

describe('getFrequentTriggers', () => {
    it('should return empty array for logs without triggers', () => {
        const logs = [createLog(), createLog()];
        const result = getFrequentTriggers(logs, 'sensory');

        expect(result).toEqual([]);
    });

    it('should count sensory triggers correctly', () => {
        const logs = [
            createLog({ sensoryTriggers: ['auditory', 'visual'] }),
            createLog({ sensoryTriggers: ['auditory'] }),
            createLog({ sensoryTriggers: ['tactile', 'auditory'] }),
            createLog({ sensoryTriggers: [] })
        ];

        const result = getFrequentTriggers(logs, 'sensory');

        expect(result[0].trigger).toBe('auditory');
        expect(result[0].count).toBe(3);
        expect(result[0].percentage).toBe(75); // 3/4 = 75%
    });

    it('should count context triggers correctly', () => {
        const logs = [
            createLog({ contextTriggers: ['transition', 'unexpected_change'] }),
            createLog({ contextTriggers: ['transition'] }),
            createLog({ contextTriggers: ['social_demand'] })
        ];

        const result = getFrequentTriggers(logs, 'context');

        expect(result[0].trigger).toBe('transition');
        expect(result[0].count).toBe(2);
    });

    it('should sort by count descending', () => {
        const logs = [
            createLog({ sensoryTriggers: ['tactile'] }),
            createLog({ sensoryTriggers: ['auditory', 'visual'] }),
            createLog({ sensoryTriggers: ['auditory', 'visual'] }),
            createLog({ sensoryTriggers: ['auditory'] })
        ];

        const result = getFrequentTriggers(logs, 'sensory');

        expect(result[0].trigger).toBe('auditory');
        expect(result[1].trigger).toBe('visual');
        expect(result[2].trigger).toBe('tactile');
    });
});

// =============================================================================
// GET EFFECTIVE STRATEGIES TESTS
// =============================================================================

describe('getEffectiveStrategies', () => {
    it('should return empty array for logs without strategies', () => {
        const logs = [createLog(), createLog()];
        const result = getEffectiveStrategies(logs);

        expect(result).toEqual([]);
    });

    it('should calculate success rate correctly', () => {
        const logs = [
            createLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'no_change' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'escalated' })
        ];

        const result = getEffectiveStrategies(logs);

        const breathing = result.find(s => s.strategy === 'deep_breathing');
        expect(breathing?.successRate).toBeCloseTo(0.67, 1); // 2/3
        expect(breathing?.usedCount).toBe(3);

        const quiet = result.find(s => s.strategy === 'quiet_space');
        expect(quiet?.successRate).toBe(0.5); // 1/2
    });

    it('should filter out strategies with too few uses', () => {
        const logs = [
            createLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }), // Only 1 use
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' }) // 2 uses
        ];

        const result = getEffectiveStrategies(logs);

        expect(result.length).toBe(1);
        expect(result[0].strategy).toBe('quiet_space');
    });

    it('should sort by success rate then usage count', () => {
        const logs = [
            // High success, low count
            createLog({ strategies: ['movement'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['movement'], strategyEffectiveness: 'helped' }),
            // Medium success, high count
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'no_change' }),
            createLog({ strategies: ['quiet_space'], strategyEffectiveness: 'no_change' })
        ];

        const result = getEffectiveStrategies(logs);

        expect(result[0].strategy).toBe('movement'); // 100% success
        expect(result[1].strategy).toBe('quiet_space'); // 50% success
    });
});

// =============================================================================
// CALCULATE SMART DEFAULTS TESTS
// =============================================================================

describe('calculateSmartDefaults', () => {
    it('should return default values for empty logs', () => {
        const result = calculateSmartDefaults([]);

        expect(result.suggestedArousal).toBe(5);
        expect(result.suggestedValence).toBe(5);
        expect(result.suggestedEnergy).toBe(5);
        expect(result.confidence).toBe(0);
    });

    it('should return defaults for too few logs', () => {
        const logs = [createLog(), createLog()]; // Less than 5
        const result = calculateSmartDefaults(logs);

        expect(result.confidence).toBe(0);
    });

    it('should calculate time-based averages', () => {
        // Use fake timers to control current time
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-15T09:30:00')); // Monday 9:30am

        // Create logs for morning with consistent values
        const morningLogs = createLogsForTimeOfDay(9, 5, {
            arousal: 7,
            valence: 6,
            energy: 8
        });

        const result = calculateSmartDefaults(morningLogs);

        expect(result.suggestedArousal).toBe(7);
        expect(result.suggestedValence).toBe(6);
        expect(result.suggestedEnergy).toBe(8);

        vi.useRealTimers();
    });

    it('should include frequent triggers', () => {
        const logs = Array.from({ length: 10 }, (_, i) =>
            createLog({
                sensoryTriggers: i < 8 ? ['auditory'] : ['visual'],
                contextTriggers: i < 6 ? ['transition'] : ['social_demand']
            })
        );

        const result = calculateSmartDefaults(logs);

        expect(result.frequentSensoryTriggers).toContain('auditory');
        expect(result.frequentContextTriggers).toContain('transition');
    });

    it('should include effective strategies', () => {
        const logs = Array.from({ length: 10 }, () =>
            createLog({
                strategies: ['deep_breathing', 'quiet_space'],
                strategyEffectiveness: 'helped'
            })
        );

        const result = calculateSmartDefaults(logs);

        expect(result.effectiveStrategies.length).toBeGreaterThan(0);
    });

    it('should calculate confidence based on data quality', () => {
        const richLogs = Array.from({ length: 10 }, () =>
            createLog({
                sensoryTriggers: ['auditory'],
                contextTriggers: ['transition'],
                strategies: ['deep_breathing'],
                strategyEffectiveness: 'helped'
            })
        );

        const result = calculateSmartDefaults(richLogs);

        expect(result.confidence).toBeGreaterThan(0.5);
    });
});

// =============================================================================
// GET LAST USED CONTEXT TESTS
// =============================================================================

describe('getLastUsedContext', () => {
    it('should return null for empty logs', () => {
        expect(getLastUsedContext([])).toBeNull();
    });

    it('should return context of most recent log', () => {
        const now = Date.now();
        const logs = [
            createLog({ timestamp: new Date(now - 3600000).toISOString(), context: 'home' }),
            createLog({ timestamp: new Date(now).toISOString(), context: 'school' }), // Most recent
            createLog({ timestamp: new Date(now - 7200000).toISOString(), context: 'home' })
        ];

        expect(getLastUsedContext(logs)).toBe('school');
    });
});

// =============================================================================
// CONTEXTUAL SUGGESTIONS TESTS
// =============================================================================

describe('getContextualTriggerSuggestions', () => {
    it('should return triggers for specific context', () => {
        const logs = [
            createLog({ context: 'school', sensoryTriggers: ['auditory'] }),
            createLog({ context: 'school', sensoryTriggers: ['auditory'] }),
            createLog({ context: 'home', sensoryTriggers: ['visual'] }),
            createLog({ context: 'home', sensoryTriggers: ['visual'] })
        ];

        const schoolTriggers = getContextualTriggerSuggestions(logs, 'school', 'sensory');
        expect(schoolTriggers).toContain('auditory');

        const homeTriggers = getContextualTriggerSuggestions(logs, 'home', 'sensory');
        expect(homeTriggers).toContain('visual');
    });

    it('should fall back to context logs if no time match', () => {
        const logs = [
            createLog({ context: 'school', sensoryTriggers: ['auditory'] }),
            createLog({ context: 'school', sensoryTriggers: ['auditory'] })
        ];

        const result = getContextualTriggerSuggestions(logs, 'school', 'sensory');
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('getContextualStrategySuggestions', () => {
    it('should prioritize strategies from similar situations', () => {
        const logs = [
            createLog({ context: 'school', arousal: 8, strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'school', arousal: 8, strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'school', arousal: 3, strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'school', arousal: 3, strategies: ['quiet_space'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'home', arousal: 8, strategies: ['movement'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'home', arousal: 8, strategies: ['movement'], strategyEffectiveness: 'helped' })
        ];

        // For high arousal at school, should suggest deep_breathing
        const result = getContextualStrategySuggestions(logs, 'school', 8);
        expect(result).toContain('deep_breathing');
    });

    it('should fall back to overall strategies for insufficient data', () => {
        const logs = [
            createLog({ context: 'school', strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createLog({ context: 'school', strategies: ['deep_breathing'], strategyEffectiveness: 'helped' })
        ];

        // Asking for home strategies with no home data
        const result = getContextualStrategySuggestions(logs, 'home', 5);
        expect(result).toContain('deep_breathing');
    });
});
