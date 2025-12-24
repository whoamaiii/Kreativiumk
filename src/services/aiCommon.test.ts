import { describe, it, expect, beforeEach } from 'vitest';
import { createAnalysisCache, generateLogsHash, AI_CONFIG } from './aiCommon';
import type { LogEntry, AnalysisResult } from '../types';

describe('AI Common - createAnalysisCache', () => {
    let cache: ReturnType<typeof createAnalysisCache>;

    beforeEach(() => {
        cache = createAnalysisCache();
    });

    const mockResult: AnalysisResult = {
        summary: 'Test summary',
        patterns: ['pattern1', 'pattern2'],
        recommendations: ['rec1', 'rec2'],
        riskLevel: 'low',
        correlations: [],
        modelUsed: 'test-model',
    };

    const mockLogsHash = 'test-hash-123';

    it('returns null for empty cache', () => {
        const result = cache.get(mockLogsHash);
        expect(result).toBeNull();
    });

    it('stores and retrieves regular analysis', () => {
        cache.set(mockResult, mockLogsHash, 'regular');
        const result = cache.get(mockLogsHash, 'regular');
        expect(result).toEqual(mockResult);
    });

    it('stores and retrieves deep analysis', () => {
        cache.set(mockResult, mockLogsHash, 'deep');
        const result = cache.get(mockLogsHash, 'deep');
        expect(result).toEqual(mockResult);
    });

    it('keeps both regular and deep analysis cached separately', () => {
        const regularResult = { ...mockResult, summary: 'Regular analysis' };
        const deepResult = { ...mockResult, summary: 'Deep analysis', isDeepAnalysis: true };

        cache.set(regularResult, mockLogsHash, 'regular');
        cache.set(deepResult, mockLogsHash, 'deep');

        expect(cache.get(mockLogsHash, 'regular')?.summary).toBe('Regular analysis');
        expect(cache.get(mockLogsHash, 'deep')?.summary).toBe('Deep analysis');
    });

    it('returns null for wrong analysis type', () => {
        cache.set(mockResult, mockLogsHash, 'regular');
        const result = cache.get(mockLogsHash, 'deep');
        expect(result).toBeNull();
    });

    it('returns null for different logs hash', () => {
        cache.set(mockResult, mockLogsHash, 'regular');
        const result = cache.get('different-hash', 'regular');
        expect(result).toBeNull();
    });

    it('clears all cache entries', () => {
        cache.set(mockResult, mockLogsHash, 'regular');
        cache.set(mockResult, mockLogsHash, 'deep');
        cache.clear();

        expect(cache.get(mockLogsHash, 'regular')).toBeNull();
        expect(cache.get(mockLogsHash, 'deep')).toBeNull();
    });

    it('defaults analysis type to regular when not specified', () => {
        cache.set(mockResult, mockLogsHash);
        const result = cache.get(mockLogsHash);
        expect(result).toEqual(mockResult);
    });
});

describe('AI Common - generateLogsHash', () => {
    const createMockLog = (id: string, arousal: number): LogEntry => ({
        id,
        timestamp: '2024-01-15T10:00:00',
        context: 'home',
        arousal,
        valence: 5,
        energy: 5,
        sensoryTriggers: [],
        contextTriggers: [],
        strategies: [],
        duration: 10,
        note: '',
        dayOfWeek: 'monday',
        timeOfDay: 'morning',
        hourOfDay: 10,
    });

    it('generates consistent hash for same logs', () => {
        const logs = [
            createMockLog('1', 5),
            createMockLog('2', 7),
        ];

        const hash1 = generateLogsHash(logs);
        const hash2 = generateLogsHash(logs);

        expect(hash1).toBe(hash2);
    });

    it('generates different hash for different logs', () => {
        const logs1 = [createMockLog('1', 5)];
        const logs2 = [createMockLog('2', 7)];

        const hash1 = generateLogsHash(logs1);
        const hash2 = generateLogsHash(logs2);

        expect(hash1).not.toBe(hash2);
    });

    it('returns a hash even for empty array', () => {
        const hash = generateLogsHash([]);
        // The implementation returns a hash even for empty arrays
        expect(typeof hash).toBe('string');
    });

    it('handles crisis events in hash', () => {
        const logs = [createMockLog('1', 5)];
        const hash1 = generateLogsHash(logs, []);
        const hash2 = generateLogsHash(logs, [{
            id: 'crisis-1',
            timestamp: '2024-01-15T10:00:00',
            context: 'home',
            type: 'meltdown',
            durationSeconds: 300,
            peakIntensity: 8,
            warningSignsObserved: [],
            sensoryTriggers: [],
            contextTriggers: [],
            strategiesUsed: [],
            resolution: 'self_regulated',
            hasAudioRecording: false,
            notes: '',
            dayOfWeek: 'monday',
            timeOfDay: 'morning',
            hourOfDay: 10,
        }]);

        expect(hash1).not.toBe(hash2);
    });
});

describe('AI Common - AI_CONFIG', () => {
    it('has cache TTL defined', () => {
        expect(AI_CONFIG.cacheTtlMs).toBeDefined();
        expect(typeof AI_CONFIG.cacheTtlMs).toBe('number');
        expect(AI_CONFIG.cacheTtlMs).toBeGreaterThan(0);
    });

    it('has reasonable cache TTL (between 1 minute and 1 hour)', () => {
        expect(AI_CONFIG.cacheTtlMs).toBeGreaterThanOrEqual(60 * 1000);
        expect(AI_CONFIG.cacheTtlMs).toBeLessThanOrEqual(60 * 60 * 1000);
    });
});
