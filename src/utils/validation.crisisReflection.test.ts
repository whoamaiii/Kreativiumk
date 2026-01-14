/**
 * Tests for CrisisReflection validation schema
 */
import { describe, it, expect } from 'vitest';
import { CrisisReflectionSchema, ReflectionEmotionalStateSchema } from './validation';

describe('ReflectionEmotionalStateSchema', () => {
    it('accepts valid emotional states', () => {
        const validStates = ['calm', 'tired', 'anxious', 'sad', 'relieved', 'frustrated'];

        validStates.forEach(state => {
            const result = ReflectionEmotionalStateSchema.safeParse(state);
            expect(result.success).toBe(true);
        });
    });

    it('rejects invalid emotional states', () => {
        const invalidStates = ['happy', 'angry', 'unknown', '', 123];

        invalidStates.forEach(state => {
            const result = ReflectionEmotionalStateSchema.safeParse(state);
            expect(result.success).toBe(false);
        });
    });
});

describe('CrisisReflectionSchema', () => {
    const validReflection = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        crisisId: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: '2024-01-15T10:30:00.000Z'
    };

    it('accepts minimal valid reflection', () => {
        const result = CrisisReflectionSchema.safeParse(validReflection);
        expect(result.success).toBe(true);
    });

    it('accepts full reflection with all optional fields', () => {
        const fullReflection = {
            ...validReflection,
            immediateArousal: 5,
            immediateEnergy: 3,
            immediateValence: 4,
            currentEmotionalState: 'tired',
            mostHelpfulStrategy: 'deep_pressure',
            mainTriggerIdentified: 'auditory',
            strategiesThatHelped: ['shielding', 'headphones'],
            strategiesThatDidntHelp: ['breathing'],
            preventionIdeas: ['Earlier warning', 'Quiet space'],
            supportNeeded: ['Physical proximity', 'Verbal reassurance'],
            caregiverObservations: 'Child was overwhelmed by noise',
            environmentFactors: 'Crowded room with loud TV',
            needsFollowUp: true,
            followUpNotes: 'Discuss with therapist'
        };

        const result = CrisisReflectionSchema.safeParse(fullReflection);
        expect(result.success).toBe(true);
    });

    it('requires valid UUID for id', () => {
        const result = CrisisReflectionSchema.safeParse({
            ...validReflection,
            id: 'not-a-uuid'
        });
        expect(result.success).toBe(false);
    });

    it('requires valid UUID for crisisId', () => {
        const result = CrisisReflectionSchema.safeParse({
            ...validReflection,
            crisisId: 'not-a-uuid'
        });
        expect(result.success).toBe(false);
    });

    it('requires valid timestamp', () => {
        const result = CrisisReflectionSchema.safeParse({
            ...validReflection,
            timestamp: 'invalid-date'
        });
        expect(result.success).toBe(false);
    });

    it('accepts ISO timestamp without offset', () => {
        const result = CrisisReflectionSchema.safeParse({
            ...validReflection,
            timestamp: '2024-01-15T10:30:00'
        });
        expect(result.success).toBe(true);
    });

    describe('arousal/energy/valence validation', () => {
        it('accepts values between 1 and 10', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                immediateArousal: 1,
                immediateEnergy: 5,
                immediateValence: 10
            });
            expect(result.success).toBe(true);
        });

        it('rejects values below 1', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                immediateArousal: 0
            });
            expect(result.success).toBe(false);
        });

        it('rejects values above 10', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                immediateEnergy: 11
            });
            expect(result.success).toBe(false);
        });

        it('rejects non-integer values', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                immediateValence: 5.5
            });
            expect(result.success).toBe(false);
        });
    });

    describe('emotional state validation', () => {
        it('accepts valid emotional state', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                currentEmotionalState: 'calm'
            });
            expect(result.success).toBe(true);
        });

        it('rejects invalid emotional state', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                currentEmotionalState: 'happy'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('array fields validation', () => {
        it('accepts empty arrays', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                strategiesThatHelped: [],
                strategiesThatDidntHelp: [],
                preventionIdeas: [],
                supportNeeded: []
            });
            expect(result.success).toBe(true);
        });

        it('accepts arrays with string items', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                strategiesThatHelped: ['strategy1', 'strategy2'],
                preventionIdeas: ['idea1', 'idea2', 'idea3']
            });
            expect(result.success).toBe(true);
        });

        it('rejects arrays with non-string items', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                strategiesThatHelped: [1, 2, 3]
            });
            expect(result.success).toBe(false);
        });
    });

    describe('boolean fields validation', () => {
        it('accepts true for needsFollowUp', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                needsFollowUp: true
            });
            expect(result.success).toBe(true);
        });

        it('accepts false for needsFollowUp', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                needsFollowUp: false
            });
            expect(result.success).toBe(true);
        });

        it('rejects non-boolean for needsFollowUp', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                needsFollowUp: 'yes'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('string fields validation', () => {
        it('accepts any string for text fields', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                mostHelpfulStrategy: 'custom strategy',
                mainTriggerIdentified: 'custom trigger',
                caregiverObservations: 'Long observation text with special chars: éèê',
                environmentFactors: 'Environment notes',
                followUpNotes: 'Follow up notes'
            });
            expect(result.success).toBe(true);
        });

        it('accepts empty strings for text fields', () => {
            const result = CrisisReflectionSchema.safeParse({
                ...validReflection,
                caregiverObservations: '',
                environmentFactors: ''
            });
            expect(result.success).toBe(true);
        });
    });
});
