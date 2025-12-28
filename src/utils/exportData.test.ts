import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportAllData, importData, downloadExport, type ExportedData } from './exportData';
import { STORAGE_KEYS } from '../constants/storage';

// Mock exportValidation module
vi.mock('./exportValidation', () => ({
    validateExportData: vi.fn((data: unknown) => {
        // Basic validation - check if it has expected structure
        if (!data || typeof data !== 'object') {
            return { success: false, errors: [{ path: 'root', message: 'Invalid data' }] };
        }
        const d = data as Record<string, unknown>;
        if (!Array.isArray(d.logs) || !Array.isArray(d.crisisEvents)) {
            return { success: false, errors: [{ path: 'root', message: 'Missing required arrays' }] };
        }
        return { success: true, data };
    }),
    formatValidationErrors: vi.fn((errors: Array<{ message: string }>) =>
        errors.map(e => e.message).join(', ')
    ),
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

// Mock URL API
const mockUrl = 'blob:mock-url';
const mockCreateObjectURL = vi.fn(() => mockUrl);
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

// Helper to create test data
const createTestLog = (id: string) => ({
    id,
    timestamp: '2025-01-15T10:00:00Z',
    context: 'home',
    arousal: 5,
    valence: 5,
    energy: 5,
    sensoryTriggers: [],
    contextTriggers: [],
    strategies: [],
    duration: 10,
    note: 'Test',
    dayOfWeek: 'monday',
    timeOfDay: 'morning',
    hourOfDay: 10,
});

const createTestCrisis = (id: string) => ({
    id,
    timestamp: '2025-01-15T11:00:00Z',
    context: 'home',
    type: 'meltdown',
    durationSeconds: 300,
    peakIntensity: 7,
    warningSignsObserved: [],
    sensoryTriggers: [],
    contextTriggers: [],
    strategiesUsed: [],
    resolution: 'self_regulated',
    hasAudioRecording: false,
    notes: '',
    dayOfWeek: 'monday',
    timeOfDay: 'morning',
    hourOfDay: 11,
});

const createTestGoal = (id: string) => ({
    id,
    title: 'Test Goal',
    description: '',
    category: 'social',
    targetValue: 10,
    currentValue: 5,
    unit: 'times',
    targetDirection: 'increase',
    frequency: 'weekly',
    startDate: '2025-01-01',
    targetDate: '2025-03-01',
    status: 'active',
    progressHistory: [],
    notes: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
});

describe('exportData', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('exportAllData', () => {
        it('exports empty data when localStorage is empty', () => {
            const result = exportAllData();

            expect(result.version).toBe('1.0.0');
            expect(result.exportedAt).toBeDefined();
            expect(result.logs).toEqual([]);
            expect(result.crisisEvents).toEqual([]);
            expect(result.scheduleEntries).toEqual([]);
            expect(result.goals).toEqual([]);
            expect(result.childProfile).toBeNull();
        });

        it('exports logs from localStorage', () => {
            const logs = [createTestLog('1'), createTestLog('2')];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

            const result = exportAllData();

            expect(result.logs).toHaveLength(2);
            expect(result.summary.totalLogs).toBe(2);
        });

        it('exports crisis events from localStorage', () => {
            const events = [createTestCrisis('c1')];
            localStorageMock.setItem(STORAGE_KEYS.CRISIS_EVENTS, JSON.stringify(events));

            const result = exportAllData();

            expect(result.crisisEvents).toHaveLength(1);
            expect(result.summary.totalCrisisEvents).toBe(1);
        });

        it('calculates date range from all data', () => {
            const logs = [
                { ...createTestLog('1'), timestamp: '2025-01-10T10:00:00Z' },
                { ...createTestLog('2'), timestamp: '2025-01-20T10:00:00Z' },
            ];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

            const result = exportAllData();

            expect(result.summary.dateRange).not.toBeNull();
            expect(result.summary.dateRange!.start).toContain('2025-01-10');
            expect(result.summary.dateRange!.end).toContain('2025-01-20');
        });

        it('calculates average crisis duration', () => {
            const events = [
                { ...createTestCrisis('c1'), durationSeconds: 300 },
                { ...createTestCrisis('c2'), durationSeconds: 600 },
            ];
            localStorageMock.setItem(STORAGE_KEYS.CRISIS_EVENTS, JSON.stringify(events));

            const result = exportAllData();

            expect(result.summary.averageCrisisDuration).toBe(450);
        });

        it('calculates schedule completion rate', () => {
            const entries = [
                { id: '1', date: '2025-01-15', status: 'completed' },
                { id: '2', date: '2025-01-16', status: 'completed' },
                { id: '3', date: '2025-01-17', status: 'pending' },
                { id: '4', date: '2025-01-18', status: 'skipped' },
            ];
            localStorageMock.setItem(STORAGE_KEYS.SCHEDULE_ENTRIES, JSON.stringify(entries));

            const result = exportAllData();

            expect(result.summary.scheduleCompletionRate).toBe(50); // 2/4 = 50%
        });

        it('calculates goal progress', () => {
            const goals = [
                { ...createTestGoal('g1'), targetValue: 10, currentValue: 5, targetDirection: 'increase' },
                { ...createTestGoal('g2'), targetValue: 10, currentValue: 10, targetDirection: 'increase' },
            ];
            localStorageMock.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));

            const result = exportAllData();

            // (50% + 100%) / 2 = 75%
            expect(result.summary.goalProgress).toBe(75);
        });

        it('handles corrupted JSON gracefully', () => {
            localStorageMock.setItem(STORAGE_KEYS.LOGS, 'invalid json');

            const result = exportAllData();

            expect(result.logs).toEqual([]);
        });

        it('exports child profile when present', () => {
            const profile = {
                id: 'child-1',
                name: 'Test Child',
                birthDate: '2018-01-01',
            };
            localStorageMock.setItem(STORAGE_KEYS.CHILD_PROFILE, JSON.stringify(profile));

            const result = exportAllData();

            expect(result.childProfile).toEqual(profile);
        });

        it('collects daily schedule modifications', () => {
            // Set up some daily schedules
            localStorageMock.setItem('kreativium_daily_schedule_2025-01-15_home', JSON.stringify([
                { id: 'a1', time: '09:00', endTime: '10:00', title: 'Activity', status: 'completed', icon: '📚' }
            ]));

            // Mock localStorage.key to return the daily schedule key
            localStorageMock.key = vi.fn((i) => {
                const allKeys = ['kreativium_daily_schedule_2025-01-15_home'];
                return allKeys[i] || null;
            });
            Object.defineProperty(localStorageMock, 'length', { get: () => 1 });

            const result = exportAllData();

            expect(result.dailySchedules).toBeDefined();
        });
    });

    describe('downloadExport', () => {
        it('creates and triggers download', () => {
            const appendChildSpy = vi.spyOn(document.body, 'appendChild');
            const removeChildSpy = vi.spyOn(document.body, 'removeChild');

            downloadExport();

            expect(mockCreateObjectURL).toHaveBeenCalled();
            expect(appendChildSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalled();
            expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);

            appendChildSpy.mockRestore();
            removeChildSpy.mockRestore();
        });
    });

    describe('importData', () => {
        it('returns error for invalid JSON', () => {
            const result = importData('not valid json');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Ugyldig JSON-format');
        });

        it('returns error for invalid data structure', () => {
            const result = importData(JSON.stringify({ invalid: 'structure' }));

            expect(result.success).toBe(false);
        });

        it('imports valid data in replace mode', () => {
            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [createTestLog('1')],
                crisisEvents: [createTestCrisis('c1')],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [createTestGoal('g1')],
                childProfile: null,
                summary: {
                    totalLogs: 1,
                    totalCrisisEvents: 1,
                    averageCrisisDuration: 300,
                    scheduleCompletionRate: 0,
                    goalProgress: 50,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData));

            expect(result.success).toBe(true);
            expect(result.imported?.logs).toBe(1);
            expect(result.imported?.crisisEvents).toBe(1);
            expect(result.imported?.goals).toBe(1);
        });

        it('imports data in merge mode', () => {
            // Pre-existing data
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify([createTestLog('existing')]));

            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [createTestLog('new')],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: null,
                summary: {
                    totalLogs: 1,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData), 'merge');

            expect(result.success).toBe(true);
            expect(result.merged?.logsAdded).toBe(1);
            expect(result.merged?.logsSkipped).toBe(0);

            // Check merged data
            const logs = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.LOGS) || '[]');
            expect(logs).toHaveLength(2);
        });

        it('skips duplicate entries in merge mode', () => {
            // Pre-existing data with same ID
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify([createTestLog('same-id')]));

            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [createTestLog('same-id')],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: null,
                summary: {
                    totalLogs: 1,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData), 'merge');

            expect(result.success).toBe(true);
            expect(result.merged?.logsAdded).toBe(0);
            expect(result.merged?.logsSkipped).toBe(1);
        });

        it('imports child profile only if not already set in merge mode', () => {
            // No existing profile
            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: { id: 'child-1', name: 'Test', birthDate: '2018-01-01', diagnoses: [], communicationStyle: 'verbal' as const, sensoryPreferences: [], effectiveStrategies: [], triggers: [], notes: '' },
                summary: {
                    totalLogs: 0,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData), 'merge');

            expect(result.success).toBe(true);
            expect(result.imported?.childProfile).toBe(true);
        });

        it('does not overwrite existing child profile in merge mode', () => {
            // Pre-existing profile
            localStorageMock.setItem(STORAGE_KEYS.CHILD_PROFILE, JSON.stringify({ id: 'existing', name: 'Existing' }));

            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: { id: 'new', name: 'New', birthDate: '2018-01-01', diagnoses: [], communicationStyle: 'verbal' as const, sensoryPreferences: [], effectiveStrategies: [], triggers: [], notes: '' },
                summary: {
                    totalLogs: 0,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            importData(JSON.stringify(exportData), 'merge');

            const profile = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CHILD_PROFILE) || '{}');
            expect(profile.id).toBe('existing');
        });

        it('imports daily schedules', () => {
            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: null,
                dailySchedules: {
                    '2025-01-15_home': [
                        { id: 'a1', time: '09:00', endTime: '10:00', title: 'Activity', status: 'completed', icon: '📚' }
                    ],
                },
                summary: {
                    totalLogs: 0,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData));

            expect(result.success).toBe(true);
            expect(result.imported?.dailySchedules).toBe(1);
        });

        it('handles storage quota errors with rollback', () => {
            // Make setItem fail
            localStorageMock.setItem = vi.fn(() => {
                throw new Error('QuotaExceededError');
            });

            const exportData: ExportedData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                logs: [createTestLog('1')],
                crisisEvents: [],
                scheduleEntries: [],
                scheduleTemplates: [],
                goals: [],
                childProfile: null,
                summary: {
                    totalLogs: 1,
                    totalCrisisEvents: 0,
                    averageCrisisDuration: 0,
                    scheduleCompletionRate: 0,
                    goalProgress: 0,
                    dateRange: null,
                },
            };

            const result = importData(JSON.stringify(exportData));

            expect(result.success).toBe(false);
        });
    });
});
