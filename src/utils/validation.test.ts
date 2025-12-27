import { describe, it, expect } from 'vitest';
import {
    validateLogEntry,
    validateLogEntryInput,
    validateCrisisEvent,
    validateImportedData,
} from './validation';

describe('Validation - LogEntry', () => {
    it('validates a correct log entry', () => {
        const validLog = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            arousal: 7,
            valence: 5,
            energy: 6,
            sensoryTriggers: ['Auditiv', 'Visuell'],
            contextTriggers: ['Overgang'],
            strategies: ['Skjerming'],
            strategyEffectiveness: 'helped',
            duration: 15,
            note: 'Test note',
            dayOfWeek: 'monday',
            timeOfDay: 'afternoon',
            hourOfDay: 14,
        };

        const result = validateLogEntry(validLog);
        expect(result.success).toBe(true);
    });

    it('rejects arousal outside 1-10 range', () => {
        const invalidLog = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            arousal: 15, // Invalid
            valence: 5,
            energy: 6,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: [],
            duration: 15,
            note: '',
        };

        const result = validateLogEntry(invalidLog);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors.some(e => e.includes('arousal'))).toBe(true);
        }
    });

    it('rejects invalid context type', () => {
        const invalidLog = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'invalid', // Invalid
            arousal: 5,
            valence: 5,
            energy: 5,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: [],
            duration: 15,
            note: '',
        };

        const result = validateLogEntry(invalidLog);
        expect(result.success).toBe(false);
    });

    it('rejects invalid strategy effectiveness', () => {
        const invalidLog = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            arousal: 5,
            valence: 5,
            energy: 5,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: ['Skjerming'],
            strategyEffectiveness: 'invalid', // Invalid
            duration: 15,
            note: '',
        };

        const result = validateLogEntry(invalidLog);
        expect(result.success).toBe(false);
    });
});

describe('Validation - LogEntryInput', () => {
    it('validates log entry input without computed fields', () => {
        const validInput = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'school',
            arousal: 8,
            valence: 3,
            energy: 4,
            sensoryTriggers: ['Taktil'],
            contextTriggers: ['Krav'],
            strategies: ['Pusting'],
            duration: 30,
            note: 'High stress situation',
        };

        const result = validateLogEntryInput(validInput);
        expect(result.success).toBe(true);
    });
});

describe('Validation - CrisisEvent', () => {
    it('validates a correct crisis event', () => {
        const validCrisis = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'school',
            type: 'meltdown',
            durationSeconds: 300,
            peakIntensity: 9,
            precedingArousal: 8,
            precedingEnergy: 3,
            warningSignsObserved: ['Økt motorisk uro', 'Dekker ører'],
            sensoryTriggers: ['Auditiv'],
            contextTriggers: ['Overgang'],
            strategiesUsed: ['Skjerming', 'Samregulering'],
            resolution: 'co_regulated',
            hasAudioRecording: false,
            notes: 'Crisis notes',
            recoveryTimeMinutes: 30,
        };

        const result = validateCrisisEvent(validCrisis);
        expect(result.success).toBe(true);
    });

    it('rejects invalid crisis type', () => {
        const invalidCrisis = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            type: 'tantrum', // Invalid
            durationSeconds: 300,
            peakIntensity: 7,
            warningSignsObserved: [],
            sensoryTriggers: [],
            contextTriggers: [],
            strategiesUsed: [],
            resolution: 'self_regulated',
            hasAudioRecording: false,
            notes: '',
        };

        const result = validateCrisisEvent(invalidCrisis);
        expect(result.success).toBe(false);
    });

    it('rejects peak intensity outside 1-10', () => {
        const invalidCrisis = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            type: 'meltdown',
            durationSeconds: 300,
            peakIntensity: 12, // Invalid
            warningSignsObserved: [],
            sensoryTriggers: [],
            contextTriggers: [],
            strategiesUsed: [],
            resolution: 'self_regulated',
            hasAudioRecording: false,
            notes: '',
        };

        const result = validateCrisisEvent(invalidCrisis);
        expect(result.success).toBe(false);
    });
});

// Note: Tests for validateChildProfile, validateGoal, and validateAnalysisResult
// were removed along with the unused validation functions (dead code cleanup)

describe('Validation - ImportedData', () => {
    it('validates correct imported data structure', () => {
        const validImport = {
            logs: [],
            crisisEvents: [],
            scheduleEntries: [],
            goals: [],
            childProfile: null,
            exportedAt: '2024-01-15T12:00:00',
            version: '1.0.0',
        };

        const result = validateImportedData(validImport);
        expect(result.success).toBe(true);
    });

    it('validates imported data with populated arrays', () => {
        const validImport = {
            logs: [
                {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    timestamp: '2024-01-15T14:30:00',
                    context: 'home',
                    arousal: 5,
                    valence: 5,
                    energy: 5,
                    sensoryTriggers: [],
                    contextTriggers: [],
                    strategies: [],
                    duration: 15,
                    note: '',
                },
            ],
            crisisEvents: [],
            exportedAt: '2024-01-15T12:00:00',
        };

        const result = validateImportedData(validImport);
        expect(result.success).toBe(true);
    });
});
