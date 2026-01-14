/**
 * Tests for i18nMigration utilities
 */
import { describe, it, expect, vi } from 'vitest';
import {
    migrateSensoryTrigger,
    migrateContextTrigger,
    migrateStrategy,
    migrateWarningSign,
    isLegacyValue,
    getSensoryTriggerLabel,
    getContextTriggerLabel,
    getStrategyLabel,
    getWarningSignLabel,
    SENSORY_TRIGGER_KEYS,
    CONTEXT_TRIGGER_KEYS,
    STRATEGY_KEYS,
    WARNING_SIGN_KEYS
} from './i18nMigration';

describe('Migration functions', () => {
    describe('migrateSensoryTrigger', () => {
        it('returns key as-is if already a valid key', () => {
            expect(migrateSensoryTrigger('auditory')).toBe('auditory');
            expect(migrateSensoryTrigger('visual')).toBe('visual');
            expect(migrateSensoryTrigger('tactile')).toBe('tactile');
        });

        it('converts legacy Norwegian values to keys', () => {
            expect(migrateSensoryTrigger('Auditiv')).toBe('auditory');
            expect(migrateSensoryTrigger('Visuell')).toBe('visual');
            expect(migrateSensoryTrigger('Taktil')).toBe('tactile');
            expect(migrateSensoryTrigger('Vestibulær')).toBe('vestibular');
            expect(migrateSensoryTrigger('Interosepsjon')).toBe('interoception');
            expect(migrateSensoryTrigger('Lukt')).toBe('smell');
            expect(migrateSensoryTrigger('Smak')).toBe('taste');
            expect(migrateSensoryTrigger('Lys')).toBe('light');
            expect(migrateSensoryTrigger('Temperatur')).toBe('temperature');
            expect(migrateSensoryTrigger('Trengsel')).toBe('crowding');
        });

        it('returns default for unknown values', () => {
            expect(migrateSensoryTrigger('unknown')).toBe('auditory');
        });
    });

    describe('migrateContextTrigger', () => {
        it('returns key as-is if already a valid key', () => {
            expect(migrateContextTrigger('demands')).toBe('demands');
            expect(migrateContextTrigger('transition')).toBe('transition');
        });

        it('converts legacy Norwegian values to keys', () => {
            expect(migrateContextTrigger('Krav')).toBe('demands');
            expect(migrateContextTrigger('Overgang')).toBe('transition');
            expect(migrateContextTrigger('Sosialt')).toBe('social');
            expect(migrateContextTrigger('Uventet Hendelse')).toBe('unexpected_event');
            expect(migrateContextTrigger('Sliten')).toBe('tired');
            expect(migrateContextTrigger('Sult')).toBe('hungry');
            expect(migrateContextTrigger('Ventetid')).toBe('waiting');
            expect(migrateContextTrigger('Gruppearbeid')).toBe('group_work');
            expect(migrateContextTrigger('Prøve/Test')).toBe('test');
            expect(migrateContextTrigger('Ny Situasjon')).toBe('new_situation');
        });

        it('returns default for unknown values', () => {
            expect(migrateContextTrigger('unknown')).toBe('demands');
        });
    });

    describe('migrateStrategy', () => {
        it('returns key as-is if already a valid key', () => {
            expect(migrateStrategy('shielding')).toBe('shielding');
            expect(migrateStrategy('deep_pressure')).toBe('deep_pressure');
        });

        it('converts legacy Norwegian values to keys', () => {
            expect(migrateStrategy('Skjerming')).toBe('shielding');
            expect(migrateStrategy('Dypt Trykk')).toBe('deep_pressure');
            expect(migrateStrategy('Samregulering')).toBe('co_regulation');
            expect(migrateStrategy('Pusting')).toBe('breathing');
            expect(migrateStrategy('Eget Rom')).toBe('own_room');
            expect(migrateStrategy('Vektteppe')).toBe('weighted_blanket');
            expect(migrateStrategy('Hodetelefoner')).toBe('headphones');
            expect(migrateStrategy('Fidget')).toBe('fidget');
            expect(migrateStrategy('Bevegelse')).toBe('movement');
            expect(migrateStrategy('Mørkt Rom')).toBe('dark_room');
            expect(migrateStrategy('Kjent Aktivitet')).toBe('familiar_activity');
            expect(migrateStrategy('Musikk')).toBe('music');
            expect(migrateStrategy('Timer/Visuell Støtte')).toBe('timer_visual_support');
        });

        it('returns default for unknown values', () => {
            expect(migrateStrategy('unknown')).toBe('shielding');
        });
    });

    describe('migrateWarningSign', () => {
        it('returns key as-is if already a valid key', () => {
            expect(migrateWarningSign('motor_restlessness')).toBe('motor_restlessness');
            expect(migrateWarningSign('verbal_escalation')).toBe('verbal_escalation');
        });

        it('converts legacy Norwegian values to keys', () => {
            expect(migrateWarningSign('Økt motorisk uro')).toBe('motor_restlessness');
            expect(migrateWarningSign('Verbal eskalering')).toBe('verbal_escalation');
            expect(migrateWarningSign('Tilbaketrekning')).toBe('withdrawal');
            expect(migrateWarningSign('Repetitive bevegelser')).toBe('repetitive_movements');
            expect(migrateWarningSign('Dekker ører')).toBe('covers_ears');
            expect(migrateWarningSign('Unngår øyekontakt')).toBe('avoids_eye_contact');
            expect(migrateWarningSign('Rødme/svetting')).toBe('flushing_sweating');
            expect(migrateWarningSign('Klamrer seg')).toBe('clinging');
            expect(migrateWarningSign('Nekter instrukser')).toBe('refuses_instructions');
            expect(migrateWarningSign('Gråt')).toBe('crying');
        });

        it('returns default for unknown values', () => {
            expect(migrateWarningSign('unknown')).toBe('motor_restlessness');
        });
    });

    describe('isLegacyValue', () => {
        it('returns true for legacy Norwegian values', () => {
            expect(isLegacyValue('Auditiv')).toBe(true);
            expect(isLegacyValue('Krav')).toBe(true);
            expect(isLegacyValue('Skjerming')).toBe(true);
            expect(isLegacyValue('Økt motorisk uro')).toBe(true);
        });

        it('returns false for English keys', () => {
            expect(isLegacyValue('auditory')).toBe(false);
            expect(isLegacyValue('demands')).toBe(false);
            expect(isLegacyValue('shielding')).toBe(false);
            expect(isLegacyValue('motor_restlessness')).toBe(false);
        });

        it('returns false for unknown values', () => {
            expect(isLegacyValue('unknown')).toBe(false);
            expect(isLegacyValue('')).toBe(false);
        });
    });
});

describe('Label getter functions', () => {
    describe('getSensoryTriggerLabel', () => {
        it('returns Norwegian label for English key', () => {
            expect(getSensoryTriggerLabel('auditory')).toBe('Auditiv');
            expect(getSensoryTriggerLabel('visual')).toBe('Visuell');
            expect(getSensoryTriggerLabel('tactile')).toBe('Taktil');
        });

        it('returns legacy value as-is', () => {
            expect(getSensoryTriggerLabel('Auditiv')).toBe('Auditiv');
            expect(getSensoryTriggerLabel('Visuell')).toBe('Visuell');
        });

        it('returns unknown value as-is', () => {
            expect(getSensoryTriggerLabel('unknown')).toBe('unknown');
        });

        it('uses translation function if provided', () => {
            const mockT = vi.fn((key: string) => {
                if (key === 'sensoryTriggers.auditory') return 'Auditory (translated)';
                return key;
            });

            expect(getSensoryTriggerLabel('auditory', mockT)).toBe('Auditory (translated)');
            expect(mockT).toHaveBeenCalledWith('sensoryTriggers.auditory', '');
        });

        it('falls back to legacy label if translation returns key', () => {
            const mockT = vi.fn((key: string) => key);

            expect(getSensoryTriggerLabel('auditory', mockT)).toBe('Auditiv');
        });
    });

    describe('getContextTriggerLabel', () => {
        it('returns Norwegian label for English key', () => {
            expect(getContextTriggerLabel('demands')).toBe('Krav');
            expect(getContextTriggerLabel('transition')).toBe('Overgang');
            expect(getContextTriggerLabel('social')).toBe('Sosialt');
        });

        it('returns legacy value as-is', () => {
            expect(getContextTriggerLabel('Krav')).toBe('Krav');
        });
    });

    describe('getStrategyLabel', () => {
        it('returns Norwegian label for English key', () => {
            expect(getStrategyLabel('shielding')).toBe('Skjerming');
            expect(getStrategyLabel('deep_pressure')).toBe('Dypt Trykk');
            expect(getStrategyLabel('co_regulation')).toBe('Samregulering');
        });

        it('returns legacy value as-is', () => {
            expect(getStrategyLabel('Skjerming')).toBe('Skjerming');
        });
    });

    describe('getWarningSignLabel', () => {
        it('returns Norwegian label for English key', () => {
            expect(getWarningSignLabel('motor_restlessness')).toBe('Økt motorisk uro');
            expect(getWarningSignLabel('verbal_escalation')).toBe('Verbal eskalering');
            expect(getWarningSignLabel('withdrawal')).toBe('Tilbaketrekning');
        });

        it('returns legacy value as-is', () => {
            expect(getWarningSignLabel('Økt motorisk uro')).toBe('Økt motorisk uro');
        });
    });
});

describe('Key arrays', () => {
    it('SENSORY_TRIGGER_KEYS contains all expected keys', () => {
        expect(SENSORY_TRIGGER_KEYS).toContain('auditory');
        expect(SENSORY_TRIGGER_KEYS).toContain('visual');
        expect(SENSORY_TRIGGER_KEYS).toContain('tactile');
        expect(SENSORY_TRIGGER_KEYS).toContain('vestibular');
        expect(SENSORY_TRIGGER_KEYS).toContain('interoception');
        expect(SENSORY_TRIGGER_KEYS.length).toBe(10);
    });

    it('CONTEXT_TRIGGER_KEYS contains all expected keys', () => {
        expect(CONTEXT_TRIGGER_KEYS).toContain('demands');
        expect(CONTEXT_TRIGGER_KEYS).toContain('transition');
        expect(CONTEXT_TRIGGER_KEYS).toContain('social');
        expect(CONTEXT_TRIGGER_KEYS.length).toBe(10);
    });

    it('STRATEGY_KEYS contains all expected keys', () => {
        expect(STRATEGY_KEYS).toContain('shielding');
        expect(STRATEGY_KEYS).toContain('deep_pressure');
        expect(STRATEGY_KEYS).toContain('co_regulation');
        expect(STRATEGY_KEYS.length).toBe(13);
    });

    it('WARNING_SIGN_KEYS contains all expected keys', () => {
        expect(WARNING_SIGN_KEYS).toContain('motor_restlessness');
        expect(WARNING_SIGN_KEYS).toContain('verbal_escalation');
        expect(WARNING_SIGN_KEYS).toContain('withdrawal');
        expect(WARNING_SIGN_KEYS.length).toBe(10);
    });
});
