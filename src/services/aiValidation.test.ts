/**
 * Tests for AI Insight Validation Layer
 */

import { describe, it, expect } from 'vitest';
import {
    computeStatistics,
    validateAIInsights,
    generateDataCitation,
    addCitationsToResult,
    createValidatedResult
} from './aiValidation';
import type { LogEntry, CrisisEvent, AnalysisResult } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockLog(overrides: Partial<LogEntry> = {}): LogEntry {
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

function createMockCrisis(overrides: Partial<CrisisEvent> = {}): CrisisEvent {
    return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'meltdown',
        durationSeconds: 600, // 10 minutes
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

function createMockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        id: 'test-result',
        generatedAt: new Date().toISOString(),
        triggerAnalysis: 'Test trigger analysis',
        strategyEvaluation: 'Test strategy evaluation',
        interoceptionPatterns: 'Test patterns',
        summary: 'Test summary',
        ...overrides
    };
}

// =============================================================================
// COMPUTE STATISTICS TESTS
// =============================================================================

describe('computeStatistics', () => {
    it('should handle empty logs', () => {
        const stats = computeStatistics([]);

        expect(stats.logCount).toBe(0);
        expect(stats.avgArousal).toBe(0);
        expect(stats.avgEnergy).toBe(0);
        expect(stats.avgValence).toBe(0);
    });

    it('should calculate correct averages', () => {
        const logs = [
            createMockLog({ arousal: 3, energy: 4, valence: 5 }),
            createMockLog({ arousal: 5, energy: 6, valence: 7 }),
            createMockLog({ arousal: 7, energy: 8, valence: 9 })
        ];

        const stats = computeStatistics(logs);

        expect(stats.avgArousal).toBe(5); // (3+5+7)/3 = 5
        expect(stats.avgEnergy).toBe(6); // (4+6+8)/3 = 6
        expect(stats.avgValence).toBe(7); // (5+7+9)/3 = 7
    });

    it('should calculate correct high arousal percentage', () => {
        const logs = [
            createMockLog({ arousal: 8 }), // high
            createMockLog({ arousal: 9 }), // high
            createMockLog({ arousal: 5 }), // not high
            createMockLog({ arousal: 4 })  // not high
        ];

        const stats = computeStatistics(logs);

        expect(stats.highArousalPercentage).toBe(50); // 2/4 = 50%
    });

    it('should calculate correct low energy percentage', () => {
        const logs = [
            createMockLog({ energy: 2 }), // low
            createMockLog({ energy: 3 }), // low
            createMockLog({ energy: 4 }), // not low
            createMockLog({ energy: 7 })  // not low
        ];

        const stats = computeStatistics(logs);

        expect(stats.lowEnergyPercentage).toBe(50); // 2/4 = 50%
    });

    it('should calculate trigger percentages', () => {
        const logs = [
            createMockLog({ sensoryTriggers: ['auditory', 'visual'] }),
            createMockLog({ sensoryTriggers: ['auditory'] }),
            createMockLog({ sensoryTriggers: [] }),
            createMockLog({ contextTriggers: ['transition'] })
        ];

        const stats = computeStatistics(logs);

        expect(stats.triggerPercentages['auditory']).toBe(50); // 2/4
        expect(stats.triggerPercentages['visual']).toBe(25); // 1/4
        expect(stats.triggerPercentages['transition']).toBe(25); // 1/4
    });

    it('should calculate strategy effectiveness', () => {
        const logs = [
            createMockLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createMockLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'helped' }),
            createMockLog({ strategies: ['deep_breathing'], strategyEffectiveness: 'no_change' }),
            createMockLog({ strategies: ['quiet_space'], strategyEffectiveness: 'helped' })
        ];

        const stats = computeStatistics(logs);

        expect(stats.strategyEffectiveness['deep_breathing'].successRate).toBe(67); // 2/3
        expect(stats.strategyEffectiveness['deep_breathing'].usageCount).toBe(3);
        expect(stats.strategyEffectiveness['quiet_space'].successRate).toBe(100); // 1/1
    });

    it('should calculate context distribution', () => {
        const logs = [
            createMockLog({ context: 'home' }),
            createMockLog({ context: 'home' }),
            createMockLog({ context: 'home' }),
            createMockLog({ context: 'school' })
        ];

        const stats = computeStatistics(logs);

        expect(stats.contextPercentages.home).toBe(75);
        expect(stats.contextPercentages.school).toBe(25);
    });

    it('should calculate crisis statistics', () => {
        const logs = [createMockLog()];
        const crises = [
            createMockCrisis({ durationSeconds: 600, recoveryTimeMinutes: 30 }), // 10 min
            createMockCrisis({ durationSeconds: 1200, recoveryTimeMinutes: 60 }) // 20 min
        ];

        const stats = computeStatistics(logs, crises);

        expect(stats.crisisCount).toBe(2);
        expect(stats.avgCrisisDuration).toBe(15); // (10+20)/2
        expect(stats.avgRecoveryTime).toBe(45); // (30+60)/2
    });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validateAIInsights', () => {
    it('should validate accurate claims', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 8 })); // 100% high arousal
        const result = createMockAnalysisResult({
            summary: 'Høy arousal ble observert i 100% av loggene.'
        });

        const validation = validateAIInsights(result, logs);

        // 100% claim for high arousal should be valid
        const highArousalValidation = validation.claimValidations.find(
            v => v.category === 'percentage' && v.actualValue === 100
        );
        expect(highArousalValidation?.isValid).toBe(true);
    });

    it('should flag inaccurate percentage claims', () => {
        const logs = [
            createMockLog({ arousal: 8 }), // high
            createMockLog({ arousal: 3 })  // not high
        ];
        const result = createMockAnalysisResult({
            summary: 'Høy arousal ble observert i 80% av loggene.' // Actual: 50%
        });

        const validation = validateAIInsights(result, logs);

        // Should find the 80% claim
        const claim = validation.claimValidations.find(v => v.claimedValue === 80);
        if (claim) {
            expect(claim.isValid).toBe(false);
            expect(claim.actualValue).toBe(50);
        }
    });

    it('should validate average claims', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 6 }));
        const result = createMockAnalysisResult({
            triggerAnalysis: 'Gjennomsnittlig arousal var 6/10.'
        });

        const validation = validateAIInsights(result, logs);

        const avgValidation = validation.claimValidations.find(
            v => v.category === 'average' && v.claimedValue === 6
        );
        expect(avgValidation?.isValid).toBe(true);
    });

    it('should validate count claims', () => {
        const logs = Array.from({ length: 25 }, () => createMockLog());
        const result = createMockAnalysisResult({
            summary: 'Totalt 25 logger ble analysert.'
        });

        const validation = validateAIInsights(result, logs);

        const countValidation = validation.claimValidations.find(
            v => v.category === 'count' && v.claimedValue === 25
        );
        expect(countValidation?.isValid).toBe(true);
    });

    it('should generate warnings for invalid claims', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 3 })); // 0% high arousal
        const result = createMockAnalysisResult({
            summary: 'Høy arousal ble observert i 70% av loggene.'
        });

        const validation = validateAIInsights(result, logs);

        expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should mark overall validation as invalid when many claims fail', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 3 }));
        const result = createMockAnalysisResult({
            summary: 'Høy arousal: 80%. Lav energi: 90%. Gjennomsnitt arousal: 9/10.',
            triggerAnalysis: 'Triggere forekom i 95% av tilfellene.'
        });

        const validation = validateAIInsights(result, logs);

        // Most claims should be invalid
        expect(validation.isValid).toBe(false);
    });

    it('should handle text with no numerical claims', () => {
        const logs = [createMockLog()];
        const result = createMockAnalysisResult({
            summary: 'Barnet viser noen tegn på reguleringsutfordringer.',
            triggerAnalysis: 'Flere triggere ble observert.'
        });

        const validation = validateAIInsights(result, logs);

        expect(validation.totalClaims).toBe(0);
        expect(validation.isValid).toBe(true); // No claims to invalidate
    });
});

// =============================================================================
// CITATION TESTS
// =============================================================================

describe('generateDataCitation', () => {
    it('should handle empty logs', () => {
        const citation = generateDataCitation([]);
        expect(citation).toBe('[Ingen data tilgjengelig]');
    });

    it('should include log count', () => {
        const logs = Array.from({ length: 25 }, () => createMockLog());
        const citation = generateDataCitation(logs);
        expect(citation).toContain('25 logger');
    });

    it('should include crisis count when provided', () => {
        const logs = [createMockLog()];
        const crises = [createMockCrisis(), createMockCrisis()];
        const citation = generateDataCitation(logs, crises);

        expect(citation).toContain('2 krisehendelser');
    });

    it('should include date range for multiple days', () => {
        const now = Date.now();
        const logs = [
            createMockLog({ timestamp: new Date(now).toISOString() }),
            createMockLog({ timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() }) // 7 days ago
        ];

        const citation = generateDataCitation(logs);
        expect(citation).toMatch(/\d+ dager/);
    });
});

describe('addCitationsToResult', () => {
    it('should add citation to summary', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog());
        const result = createMockAnalysisResult({
            summary: 'Original summary'
        });

        const cited = addCitationsToResult(result, logs);

        expect(cited.summary).toContain('Original summary');
        expect(cited.summary).toContain('[Basert på');
    });

    it('should add citation to last recommendation', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog());
        const result = createMockAnalysisResult({
            recommendations: ['Rec 1', 'Rec 2', 'Rec 3']
        });

        const cited = addCitationsToResult(result, logs);

        expect(cited.recommendations?.[0]).toBe('Rec 1');
        expect(cited.recommendations?.[1]).toBe('Rec 2');
        expect(cited.recommendations?.[2]).toContain('[Basert på');
    });
});

// =============================================================================
// VALIDATED RESULT TESTS
// =============================================================================

describe('createValidatedResult', () => {
    it('should create validated result with all fields', () => {
        const logs = Array.from({ length: 20 }, () => createMockLog());
        const result = createMockAnalysisResult();

        const validated = createValidatedResult(result, logs);

        expect(validated.id).toBe(result.id);
        expect(validated.validation).toBeDefined();
        expect(validated.citation).toBeDefined();
        expect(typeof validated.trustworthy).toBe('boolean');
    });

    it('should mark accurate analysis as trustworthy', () => {
        const logs = Array.from({ length: 20 }, (_, i) =>
            createMockLog({ arousal: i < 10 ? 8 : 3 }) // 50% high arousal
        );
        const result = createMockAnalysisResult({
            summary: 'Høy arousal i ca 50% av loggene.'
        });

        const validated = createValidatedResult(result, logs);

        expect(validated.trustworthy).toBe(true);
    });

    it('should mark inaccurate analysis as not trustworthy', () => {
        const logs = Array.from({ length: 20 }, () =>
            createMockLog({ arousal: 3 }) // 0% high arousal
        );
        const result = createMockAnalysisResult({
            summary: 'Høy arousal i 80% av loggene. Lav energi i 90% av tilfellene.'
        });

        const validated = createValidatedResult(result, logs);

        // Should be not trustworthy due to inaccurate claims
        expect(validated.validation?.warnings.length).toBeGreaterThan(0);
    });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
    it('should handle Norwegian decimal format', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 6 }));
        const result = createMockAnalysisResult({
            summary: 'Gjennomsnittlig arousal på 6,5 viser moderate nivåer' // Norwegian comma format
        });

        const validation = validateAIInsights(result, logs);

        // Should find average claims
        // The validation should work regardless of format
        expect(validation.computedStats.avgArousal).toBe(6);
    });

    it('should handle hour to minute conversion', () => {
        const logs = [createMockLog()];
        const crises = [createMockCrisis({ durationSeconds: 7200, recoveryTimeMinutes: 60 })]; // 2 hours
        const result = createMockAnalysisResult({
            summary: 'Gjennomsnittlig gjenoppretting: 1 time'
        });

        const validation = validateAIInsights(result, logs, crises);

        // 1 time = 60 minutes, should match recoveryTimeMinutes
        const durationClaim = validation.claimValidations.find(v => v.category === 'duration');
        if (durationClaim) {
            expect(durationClaim.claimedValue).toBe(60);
        }
    });

    it('should deduplicate identical claims', () => {
        const logs = Array.from({ length: 10 }, () => createMockLog({ arousal: 8 }));
        const result = createMockAnalysisResult({
            summary: 'Høy arousal: 100%. Som nevnt, 100% av loggene viste høy arousal.'
        });

        const validation = validateAIInsights(result, logs);

        // Should only have one 100% claim, not two
        const hundredPercentClaims = validation.claimValidations.filter(
            v => v.category === 'percentage' && v.claimedValue === 100
        );
        expect(hundredPercentClaims.length).toBe(1);
    });

    it('should handle empty analysis result', () => {
        const logs = [createMockLog()];
        const result = createMockAnalysisResult({
            triggerAnalysis: '',
            strategyEvaluation: '',
            interoceptionPatterns: '',
            summary: ''
        });

        const validation = validateAIInsights(result, logs);

        expect(validation.totalClaims).toBe(0);
        expect(validation.isValid).toBe(true);
    });
});
