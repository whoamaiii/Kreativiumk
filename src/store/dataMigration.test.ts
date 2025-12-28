import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CURRENT_SCHEMA_VERSION, runDataMigrations } from './dataMigration';
import { STORAGE_KEYS } from '../constants/storage';

// Mock i18nMigration module
vi.mock('../utils/i18nMigration', () => ({
    migrateSensoryTrigger: vi.fn((t: string) => {
        // Simulate migration of Norwegian terms to keys
        const mapping: Record<string, string> = {
            'Auditiv': 'auditory',
            'Visuell': 'visual',
            'Høye lyder': 'loud_sounds',
            'Sterkt lys': 'bright_lights',
        };
        return mapping[t] || t;
    }),
    migrateContextTrigger: vi.fn((t: string) => {
        const mapping: Record<string, string> = {
            'Overganger': 'transitions',
            'Endringer': 'changes',
        };
        return mapping[t] || t;
    }),
    migrateStrategy: vi.fn((s: string) => {
        const mapping: Record<string, string> = {
            'Hodetelefoner': 'headphones',
            'Dypt trykk': 'deep_pressure',
        };
        return mapping[s] || s;
    }),
    migrateWarningSign: vi.fn((w: string) => {
        const mapping: Record<string, string> = {
            'Økt stimming': 'increased_stimming',
            'Tilbaketrekning': 'withdrawal',
        };
        return mapping[w] || w;
    }),
    isLegacyValue: vi.fn((v: string) => {
        const legacyValues = ['Auditiv', 'Visuell', 'Høye lyder', 'Sterkt lys', 'Overganger', 'Endringer', 'Hodetelefoner', 'Dypt trykk', 'Økt stimming', 'Tilbaketrekning'];
        return legacyValues.includes(v);
    }),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('dataMigration', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('CURRENT_SCHEMA_VERSION', () => {
        it('exports a valid schema version', () => {
            expect(CURRENT_SCHEMA_VERSION).toBeDefined();
            expect(typeof CURRENT_SCHEMA_VERSION).toBe('number');
            expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
        });
    });

    describe('runDataMigrations', () => {
        it('skips migration when already at current version', () => {
            localStorageMock.setItem('kreativium_schema_version', CURRENT_SCHEMA_VERSION.toString());

            runDataMigrations();

            // Should not touch any data
            expect(localStorageMock.getItem).toHaveBeenCalledWith('kreativium_schema_version');
        });

        it('migrates logs with legacy Norwegian triggers', () => {
            // Set up v1 schema
            localStorageMock.setItem('kreativium_schema_version', '1');

            // Legacy logs with Norwegian triggers
            const legacyLogs = [
                {
                    id: '1',
                    timestamp: '2025-01-15T10:00:00Z',
                    sensoryTriggers: ['Høye lyder', 'Sterkt lys'],
                    contextTriggers: ['Overganger'],
                    strategies: ['Hodetelefoner'],
                },
            ];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(legacyLogs));

            runDataMigrations();

            // Check migrated data
            const migratedLogs = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.LOGS) || '[]');
            expect(migratedLogs[0].sensoryTriggers).toEqual(['loud_sounds', 'bright_lights']);
            expect(migratedLogs[0].contextTriggers).toEqual(['transitions']);
            expect(migratedLogs[0].strategies).toEqual(['headphones']);
        });

        it('migrates crisis events with legacy data', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');

            const legacyEvents = [
                {
                    id: 'c1',
                    timestamp: '2025-01-15T10:00:00Z',
                    triggers: ['Auditiv'],
                    warningSignsObserved: ['Økt stimming'],
                    resolutionStrategies: ['Dypt trykk'],
                },
            ];
            localStorageMock.setItem(STORAGE_KEYS.CRISIS_EVENTS, JSON.stringify(legacyEvents));

            runDataMigrations();

            const migratedEvents = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CRISIS_EVENTS) || '[]');
            expect(migratedEvents[0].warningSignsObserved).toEqual(['increased_stimming']);
            expect(migratedEvents[0].resolutionStrategies).toEqual(['deep_pressure']);
        });

        it('migrates child profile with legacy sensory data', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');

            const legacyProfile = {
                id: 'child-1',
                name: 'Test Child',
                sensorySensitivities: ['Auditiv', 'Visuell'],
                seekingSensory: ['Visuell'],
                effectiveStrategies: ['Hodetelefoner'],
            };
            localStorageMock.setItem(STORAGE_KEYS.CHILD_PROFILE, JSON.stringify(legacyProfile));

            runDataMigrations();

            const migratedProfile = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CHILD_PROFILE) || '{}');
            expect(migratedProfile.sensorySensitivities).toEqual(['auditory', 'visual']);
            expect(migratedProfile.effectiveStrategies).toEqual(['headphones']);
        });

        it('updates schema version after migration', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.LOGS, '[]');

            runDataMigrations();

            expect(localStorageMock.getItem('kreativium_schema_version')).toBe(CURRENT_SCHEMA_VERSION.toString());
        });

        it('handles empty localStorage gracefully', () => {
            // No schema version set (fresh install)
            expect(() => runDataMigrations()).not.toThrow();
        });

        it('handles corrupted JSON in logs', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.LOGS, 'not valid json');

            // Should not throw
            expect(() => runDataMigrations()).not.toThrow();
        });

        it('handles corrupted JSON in crisis events', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.CRISIS_EVENTS, '{invalid}');

            expect(() => runDataMigrations()).not.toThrow();
        });

        it('handles corrupted JSON in child profile', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.CHILD_PROFILE, 'corrupted');

            expect(() => runDataMigrations()).not.toThrow();
        });

        it('skips logs that do not need migration', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');

            // Already migrated logs with keys
            const modernLogs = [
                {
                    id: '1',
                    sensoryTriggers: ['loud_sounds'],
                    contextTriggers: ['transitions'],
                    strategies: ['headphones'],
                },
            ];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(modernLogs));

            runDataMigrations();

            // Data should remain unchanged (no legacy values detected)
            const logs = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.LOGS) || '[]');
            expect(logs[0].sensoryTriggers).toEqual(['loud_sounds']);
        });

        it('handles non-array logs data', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify({ invalid: 'data' }));

            expect(() => runDataMigrations()).not.toThrow();
        });

        it('handles non-object child profile', () => {
            localStorageMock.setItem('kreativium_schema_version', '1');
            localStorageMock.setItem(STORAGE_KEYS.CHILD_PROFILE, JSON.stringify('string value'));

            expect(() => runDataMigrations()).not.toThrow();
        });
    });
});
