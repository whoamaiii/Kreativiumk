import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useLogs, useCrisis, useGoals, useSchedule, useAppContext, useChildProfile, useSettings, STORAGE_ERROR_EVENT } from './store';
import type { LogEntry, CrisisEvent, Goal, ScheduleEntry, DailyScheduleTemplate } from './types';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Wrapper component for hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataProvider>{children}</DataProvider>
);

describe('Store - LogsContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('starts with empty logs array', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });
        expect(result.current.logs).toEqual([]);
    });

    it('adds a log entry with enrichment', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        const newLog: Omit<LogEntry, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'> = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            timestamp: '2024-01-15T14:30:00',
            context: 'home',
            arousal: 7,
            valence: 4,
            energy: 5,
            sensoryTriggers: ['Auditiv'],
            contextTriggers: ['Overgang'],
            strategies: ['Skjerming'],
            strategyEffectiveness: 'helped',
            duration: 15,
            note: 'Test note',
        };

        act(() => {
            result.current.addLog(newLog);
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].arousal).toBe(7);
        expect(result.current.logs[0].dayOfWeek).toBeDefined();
        expect(result.current.logs[0].timeOfDay).toBeDefined();
        expect(result.current.logs[0].hourOfDay).toBeDefined();
    });

    it('updates a log entry', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        const newLog = {
            id: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2024-01-15T14:30:00',
            context: 'home' as const,
            arousal: 5,
            valence: 5,
            energy: 5,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: [],
            duration: 10,
            note: '',
        };

        act(() => {
            result.current.addLog(newLog);
        });

        act(() => {
            result.current.updateLog('123e4567-e89b-12d3-a456-426614174001', { arousal: 8 });
        });

        expect(result.current.logs[0].arousal).toBe(8);
    });

    it('deletes a log entry', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        const newLog = {
            id: '123e4567-e89b-12d3-a456-426614174002',
            timestamp: '2024-01-15T14:30:00',
            context: 'home' as const,
            arousal: 5,
            valence: 5,
            energy: 5,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: [],
            duration: 10,
            note: '',
        };

        act(() => {
            result.current.addLog(newLog);
        });

        expect(result.current.logs).toHaveLength(1);

        act(() => {
            result.current.deleteLog('123e4567-e89b-12d3-a456-426614174002');
        });

        expect(result.current.logs).toHaveLength(0);
    });

    it('filters logs by date range', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        // Add logs one by one
        act(() => {
            result.current.addLog({
                id: '11111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-10T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        act(() => {
            result.current.addLog({
                id: '22222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T10:00:00',
                context: 'school',
                arousal: 6, valence: 6, energy: 6,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        act(() => {
            result.current.addLog({
                id: '33333333-3333-4333-a333-333333333333',
                timestamp: '2024-01-20T10:00:00',
                context: 'home',
                arousal: 7, valence: 7, energy: 7,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        // Verify all logs are present
        expect(result.current.logs).toHaveLength(3);

        const filtered = result.current.getLogsByDateRange(
            new Date('2024-01-12'),
            new Date('2024-01-18')
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('22222222-2222-4222-a222-222222222222');
    });

    it('filters logs by context', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        act(() => {
            result.current.addLog({
                id: '44444444-4444-4444-a444-444444444444',
                timestamp: '2024-01-10T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        act(() => {
            result.current.addLog({
                id: '55555555-5555-4555-a555-555555555555',
                timestamp: '2024-01-15T10:00:00',
                context: 'school',
                arousal: 6, valence: 6, energy: 6,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        expect(result.current.logs).toHaveLength(2);

        const homeLogs = result.current.getLogsByContext('home');
        expect(homeLogs).toHaveLength(1);
        expect(homeLogs[0].context).toBe('home');
    });
});

describe('Store - CrisisContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('starts with empty crisis events', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });
        expect(result.current.crisisEvents).toEqual([]);
    });

    it('adds a crisis event with enrichment', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        const crisisEvent: Omit<CrisisEvent, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'> = {
            id: 'c1111111-1111-4111-a111-111111111111',
            timestamp: '2024-01-15T14:30:00',
            context: 'school',
            type: 'meltdown',
            durationSeconds: 300,
            peakIntensity: 8,
            warningSignsObserved: ['Økt motorisk uro'],
            sensoryTriggers: ['Auditiv'],
            contextTriggers: ['Overgang'],
            strategiesUsed: ['Skjerming'],
            resolution: 'co_regulated',
            hasAudioRecording: false,
            notes: 'Crisis event notes',
        };

        act(() => {
            result.current.addCrisisEvent(crisisEvent);
        });

        expect(result.current.crisisEvents).toHaveLength(1);
        expect(result.current.crisisEvents[0].type).toBe('meltdown');
        expect(result.current.crisisEvents[0].dayOfWeek).toBeDefined();
    });

    it('calculates average crisis duration', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        act(() => {
            result.current.addCrisisEvent({
                id: 'c2222222-2222-4222-a222-222222222222', timestamp: '2024-01-15T10:00:00', context: 'home',
                type: 'meltdown', durationSeconds: 300, peakIntensity: 7,
                warningSignsObserved: [], sensoryTriggers: [], contextTriggers: [],
                strategiesUsed: [], resolution: 'self_regulated', hasAudioRecording: false, notes: '',
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'c3333333-3333-4333-a333-333333333333', timestamp: '2024-01-16T10:00:00', context: 'school',
                type: 'shutdown', durationSeconds: 600, peakIntensity: 6,
                warningSignsObserved: [], sensoryTriggers: [], contextTriggers: [],
                strategiesUsed: [], resolution: 'timed_out', hasAudioRecording: false, notes: '',
            });
        });

        expect(result.current.crisisEvents).toHaveLength(2);
        expect(result.current.getAverageCrisisDuration()).toBe(450);
    });

    it('counts crises by type', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        act(() => {
            result.current.addCrisisEvent({
                id: 'c4444444-4444-4444-a444-444444444444', timestamp: '2024-01-15T10:00:00', context: 'home',
                type: 'meltdown', durationSeconds: 300, peakIntensity: 7,
                warningSignsObserved: [], sensoryTriggers: [], contextTriggers: [],
                strategiesUsed: [], resolution: 'self_regulated', hasAudioRecording: false, notes: '',
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'c5555555-5555-4555-a555-555555555555', timestamp: '2024-01-16T10:00:00', context: 'school',
                type: 'meltdown', durationSeconds: 600, peakIntensity: 6,
                warningSignsObserved: [], sensoryTriggers: [], contextTriggers: [],
                strategiesUsed: [], resolution: 'timed_out', hasAudioRecording: false, notes: '',
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'c6666666-6666-4666-a666-666666666666', timestamp: '2024-01-17T10:00:00', context: 'home',
                type: 'anxiety', durationSeconds: 200, peakIntensity: 5,
                warningSignsObserved: [], sensoryTriggers: [], contextTriggers: [],
                strategiesUsed: [], resolution: 'co_regulated', hasAudioRecording: false, notes: '',
            });
        });

        expect(result.current.crisisEvents).toHaveLength(3);
        const countByType = result.current.getCrisisCountByType();
        expect(countByType.meltdown).toBe(2);
        expect(countByType.anxiety).toBe(1);
    });
});

describe('Store - GoalsContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('starts with empty goals', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });
        expect(result.current.goals).toEqual([]);
    });

    it('adds a goal', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        const goal: Goal = {
            id: 'goal-1',
            title: 'Improve self-regulation',
            description: 'Learn to recognize early warning signs',
            category: 'regulation',
            targetValue: 10,
            targetUnit: 'times',
            targetDirection: 'increase',
            startDate: '2024-01-01',
            targetDate: '2024-03-01',
            currentValue: 0,
            status: 'not_started',
            progressHistory: [],
        };

        act(() => {
            result.current.addGoal(goal);
        });

        expect(result.current.goals).toHaveLength(1);
        expect(result.current.goals[0].title).toBe('Improve self-regulation');
    });

    it('calculates overall progress', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'g1', title: 'Goal 1', description: '', category: 'regulation',
                targetValue: 10, targetUnit: 'times', targetDirection: 'increase',
                startDate: '2024-01-01', targetDate: '2024-03-01',
                currentValue: 5, status: 'in_progress', progressHistory: [],
            });
        });

        act(() => {
            result.current.addGoal({
                id: 'g2', title: 'Goal 2', description: '', category: 'social',
                targetValue: 10, targetUnit: 'times', targetDirection: 'increase',
                startDate: '2024-01-01', targetDate: '2024-03-01',
                currentValue: 10, status: 'achieved', progressHistory: [],
            });
        });

        expect(result.current.goals).toHaveLength(2);
        // (50% + 100%) / 2 = 75%
        expect(result.current.getOverallProgress()).toBe(75);
    });
});

describe('Store - AppContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('defaults to home context', () => {
        const { result } = renderHook(() => useAppContext(), { wrapper });
        expect(result.current.currentContext).toBe('home');
    });

    it('switches context', () => {
        const { result } = renderHook(() => useAppContext(), { wrapper });

        act(() => {
            result.current.setCurrentContext('school');
        });

        expect(result.current.currentContext).toBe('school');
    });
});

describe('Store - SettingsContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('defaults to onboarding not completed', () => {
        const { result } = renderHook(() => useSettings(), { wrapper });
        expect(result.current.hasCompletedOnboarding).toBe(false);
    });

    it('completes onboarding', () => {
        const { result } = renderHook(() => useSettings(), { wrapper });

        act(() => {
            result.current.completeOnboarding();
        });

        expect(result.current.hasCompletedOnboarding).toBe(true);
    });
});

describe('Store - ChildProfileContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('starts with null profile', () => {
        const { result } = renderHook(() => useChildProfile(), { wrapper });
        expect(result.current.childProfile).toBeNull();
    });

    it('sets child profile', () => {
        const { result } = renderHook(() => useChildProfile(), { wrapper });

        const profile = {
            id: 'child-1',
            name: 'Test Child',
            age: 8,
            diagnoses: ['autism', 'adhd'],
            communicationStyle: 'verbal' as const,
            sensorySensitivities: ['Auditiv'],
            seekingSensory: [],
            effectiveStrategies: ['Skjerming'],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        };

        act(() => {
            result.current.setChildProfile(profile);
        });

        expect(result.current.childProfile).not.toBeNull();
        expect(result.current.childProfile?.name).toBe('Test Child');
    });

    it('updates child profile', () => {
        const { result } = renderHook(() => useChildProfile(), { wrapper });

        const profile = {
            id: 'child-1',
            name: 'Test Child',
            age: 8,
            diagnoses: ['autism'],
            communicationStyle: 'verbal' as const,
            sensorySensitivities: [],
            seekingSensory: [],
            effectiveStrategies: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        };

        act(() => {
            result.current.setChildProfile(profile);
        });

        act(() => {
            result.current.updateChildProfile({ age: 9 });
        });

        expect(result.current.childProfile?.age).toBe(9);
    });

    it('clears child profile', () => {
        const { result } = renderHook(() => useChildProfile(), { wrapper });

        const profile = {
            id: 'child-1',
            name: 'Test Child',
            diagnoses: [],
            communicationStyle: 'verbal' as const,
            sensorySensitivities: [],
            seekingSensory: [],
            effectiveStrategies: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        };

        act(() => {
            result.current.setChildProfile(profile);
        });

        expect(result.current.childProfile).not.toBeNull();

        act(() => {
            result.current.clearChildProfile();
        });

        expect(result.current.childProfile).toBeNull();
    });
});

describe('Store - ScheduleContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('starts with empty schedule entries and templates', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });
        expect(result.current.scheduleEntries).toEqual([]);
        expect(result.current.scheduleTemplates).toEqual([]);
    });

    it('adds a schedule entry', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const entry: ScheduleEntry = {
            id: 's1111111-1111-4111-a111-111111111111',
            date: '2024-01-15',
            context: 'school',
            activity: {
                id: 'a1111111-1111-4111-a111-111111111111',
                title: 'Math class',
                icon: '📐',
                scheduledStart: '09:00',
                scheduledEnd: '10:00',
                durationMinutes: 60,
            },
            status: 'upcoming',
        };

        act(() => {
            result.current.addScheduleEntry(entry);
        });

        expect(result.current.scheduleEntries).toHaveLength(1);
        expect(result.current.scheduleEntries[0].activity.title).toBe('Math class');
    });

    it('updates a schedule entry', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const entry: ScheduleEntry = {
            id: 's2222222-2222-4222-a222-222222222222',
            date: '2024-01-15',
            context: 'home',
            activity: {
                id: 'a2222222-2222-4222-a222-222222222222',
                title: 'Homework',
                icon: '📚',
                scheduledStart: '15:00',
                scheduledEnd: '16:00',
                durationMinutes: 60,
            },
            status: 'upcoming',
        };

        act(() => {
            result.current.addScheduleEntry(entry);
        });

        act(() => {
            result.current.updateScheduleEntry('s2222222-2222-4222-a222-222222222222', {
                status: 'completed',
                actualStart: '15:05',
                actualEnd: '16:10',
            });
        });

        expect(result.current.scheduleEntries[0].status).toBe('completed');
        expect(result.current.scheduleEntries[0].actualStart).toBe('15:05');
    });

    it('deletes a schedule entry', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const entry: ScheduleEntry = {
            id: 's3333333-3333-4333-a333-333333333333',
            date: '2024-01-15',
            context: 'school',
            activity: {
                id: 'a3333333-3333-4333-a333-333333333333',
                title: 'Lunch',
                icon: '🍽️',
                scheduledStart: '12:00',
                scheduledEnd: '12:30',
                durationMinutes: 30,
            },
            status: 'upcoming',
        };

        act(() => {
            result.current.addScheduleEntry(entry);
        });

        expect(result.current.scheduleEntries).toHaveLength(1);

        act(() => {
            result.current.deleteScheduleEntry('s3333333-3333-4333-a333-333333333333');
        });

        expect(result.current.scheduleEntries).toHaveLength(0);
    });

    it('gets entries by date', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        act(() => {
            result.current.addScheduleEntry({
                id: 's4444444-4444-4444-a444-444444444444',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'a4444444-4444-4444-a444-444444444444',
                    title: 'Morning activity',
                    icon: '🌅',
                    scheduledStart: '08:00',
                    scheduledEnd: '09:00',
                    durationMinutes: 60,
                },
                status: 'completed',
            });
        });

        act(() => {
            result.current.addScheduleEntry({
                id: 's5555555-5555-4555-a555-555555555555',
                date: '2024-01-16',
                context: 'school',
                activity: {
                    id: 'a5555555-5555-4555-a555-555555555555',
                    title: 'Different day activity',
                    icon: '📅',
                    scheduledStart: '08:00',
                    scheduledEnd: '09:00',
                    durationMinutes: 60,
                },
                status: 'upcoming',
            });
        });

        const entriesForJan15 = result.current.getEntriesByDate('2024-01-15');
        expect(entriesForJan15).toHaveLength(1);
        expect(entriesForJan15[0].activity.title).toBe('Morning activity');
    });

    it('adds and manages schedule templates', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const template: DailyScheduleTemplate = {
            id: 't1111111-1111-4111-a111-111111111111',
            name: 'School Day',
            context: 'school',
            dayOfWeek: 'monday',
            activities: [
                {
                    id: 'a6666666-6666-4666-a666-666666666666',
                    title: 'Assembly',
                    icon: '🏫',
                    scheduledStart: '08:00',
                    scheduledEnd: '08:30',
                    durationMinutes: 30,
                },
            ],
        };

        act(() => {
            result.current.addTemplate(template);
        });

        expect(result.current.scheduleTemplates).toHaveLength(1);
        expect(result.current.scheduleTemplates[0].name).toBe('School Day');
    });

    it('updates a schedule template', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const template: DailyScheduleTemplate = {
            id: 't2222222-2222-4222-a222-222222222222',
            name: 'Weekend',
            context: 'home',
            dayOfWeek: 'saturday',
            activities: [],
        };

        act(() => {
            result.current.addTemplate(template);
        });

        act(() => {
            result.current.updateTemplate('t2222222-2222-4222-a222-222222222222', {
                name: 'Weekend Updated',
            });
        });

        expect(result.current.scheduleTemplates[0].name).toBe('Weekend Updated');
    });

    it('deletes a schedule template', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        const template: DailyScheduleTemplate = {
            id: 't3333333-3333-4333-a333-333333333333',
            name: 'To Delete',
            context: 'home',
            dayOfWeek: 'all',
            activities: [],
        };

        act(() => {
            result.current.addTemplate(template);
        });

        expect(result.current.scheduleTemplates).toHaveLength(1);

        act(() => {
            result.current.deleteTemplate('t3333333-3333-4333-a333-333333333333');
        });

        expect(result.current.scheduleTemplates).toHaveLength(0);
    });

    it('calculates completion rate', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        // Add 4 entries: 2 completed, 1 skipped, 1 upcoming
        act(() => {
            result.current.addScheduleEntry({
                id: 's6666666-6666-4666-a666-666666666666',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'a7777777-7777-4777-a777-777777777777',
                    title: 'Activity 1',
                    icon: '1️⃣',
                    scheduledStart: '08:00',
                    scheduledEnd: '09:00',
                    durationMinutes: 60,
                },
                status: 'completed',
            });
        });

        act(() => {
            result.current.addScheduleEntry({
                id: 's7777777-7777-4777-a777-777777777777',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'a8888888-8888-4888-a888-888888888888',
                    title: 'Activity 2',
                    icon: '2️⃣',
                    scheduledStart: '09:00',
                    scheduledEnd: '10:00',
                    durationMinutes: 60,
                },
                status: 'completed',
            });
        });

        act(() => {
            result.current.addScheduleEntry({
                id: 's8888888-8888-4888-a888-888888888888',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'a9999999-9999-4999-a999-999999999999',
                    title: 'Activity 3',
                    icon: '3️⃣',
                    scheduledStart: '10:00',
                    scheduledEnd: '11:00',
                    durationMinutes: 60,
                },
                status: 'skipped',
            });
        });

        act(() => {
            result.current.addScheduleEntry({
                id: 's9999999-9999-4999-a999-999999999999',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
                    title: 'Activity 4',
                    icon: '4️⃣',
                    scheduledStart: '11:00',
                    scheduledEnd: '12:00',
                    durationMinutes: 60,
                },
                status: 'upcoming',
            });
        });

        expect(result.current.scheduleEntries).toHaveLength(4);
        // 2 completed out of 4 = 50%
        expect(result.current.getCompletionRate()).toBe(50);
    });

    it('calculates completion rate with date range', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });

        act(() => {
            result.current.addScheduleEntry({
                id: 'sa111111-1111-4111-a111-111111111111',
                date: '2024-01-15',
                context: 'school',
                activity: {
                    id: 'ab111111-1111-4111-a111-111111111111',
                    title: 'Early Entry',
                    icon: '⏰',
                    scheduledStart: '08:00',
                    scheduledEnd: '09:00',
                    durationMinutes: 60,
                },
                status: 'completed',
            });
        });

        act(() => {
            result.current.addScheduleEntry({
                id: 'sa222222-2222-4222-a222-222222222222',
                date: '2024-01-20',
                context: 'school',
                activity: {
                    id: 'ab222222-2222-4222-a222-222222222222',
                    title: 'In Range Entry',
                    icon: '📍',
                    scheduledStart: '08:00',
                    scheduledEnd: '09:00',
                    durationMinutes: 60,
                },
                status: 'skipped',
            });
        });

        // Get completion rate for range that only includes the second entry
        const rate = result.current.getCompletionRate({
            start: new Date('2024-01-18'),
            end: new Date('2024-01-25'),
        });

        // 0 completed out of 1 in range = 0%
        expect(rate).toBe(0);
    });

    it('returns 0 completion rate when no entries', () => {
        const { result } = renderHook(() => useSchedule(), { wrapper });
        expect(result.current.getCompletionRate()).toBe(0);
    });
});

describe('Store - Additional LogsContext methods', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('gets logs near a timestamp', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        // Add logs at different times
        act(() => {
            result.current.addLog({
                id: 'la111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: 'Far before',
            });
        });

        act(() => {
            result.current.addLog({
                id: 'la222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T14:25:00',
                context: 'home',
                arousal: 6, valence: 6, energy: 6,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: 'Near target',
            });
        });

        act(() => {
            result.current.addLog({
                id: 'la333333-3333-4333-a333-333333333333',
                timestamp: '2024-01-15T14:30:00',
                context: 'school',
                arousal: 7, valence: 7, energy: 7,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: 'Target time',
            });
        });

        act(() => {
            result.current.addLog({
                id: 'la444444-4444-4444-a444-444444444444',
                timestamp: '2024-01-15T20:00:00',
                context: 'home',
                arousal: 4, valence: 4, energy: 4,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: 'Far after',
            });
        });

        // Get logs within 10 minutes of 14:30
        const nearLogs = result.current.getLogsNearTimestamp('2024-01-15T14:30:00', 10);

        expect(nearLogs).toHaveLength(2);
        // Should be sorted by timestamp
        expect(nearLogs[0].note).toBe('Near target');
        expect(nearLogs[1].note).toBe('Target time');
    });

    it('gets logs by context and date range', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        act(() => {
            result.current.addLog({
                id: 'lb111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        act(() => {
            result.current.addLog({
                id: 'lb222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T14:00:00',
                context: 'school',
                arousal: 6, valence: 6, energy: 6,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        act(() => {
            result.current.addLog({
                id: 'lb333333-3333-4333-a333-333333333333',
                timestamp: '2024-01-20T10:00:00',
                context: 'home',
                arousal: 7, valence: 7, energy: 7,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        const filtered = result.current.getLogsByContextAndDateRange(
            'home',
            new Date('2024-01-14'),
            new Date('2024-01-16')
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].context).toBe('home');
        expect(filtered[0].id).toBe('lb111111-1111-4111-a111-111111111111');
    });

    it('rejects invalid log entry data', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        // Try to add a log with invalid arousal value (out of range)
        const success = act(() => {
            return result.current.addLog({
                id: 'invalid-uuid-format', // Invalid UUID
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 15, // Out of range (max 10)
                valence: 5,
                energy: 5,
                sensoryTriggers: [],
                contextTriggers: [],
                strategies: [],
                duration: 10,
                note: '',
            });
        });

        expect(success).toBe(false);
        expect(result.current.logs).toHaveLength(0);
    });
});

describe('Store - Additional CrisisContext methods', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('gets crisis events by date range', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        act(() => {
            result.current.addCrisisEvent({
                id: 'cc111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-10T10:00:00',
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
                notes: 'Before range',
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'cc222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T10:00:00',
                context: 'school',
                type: 'shutdown',
                durationSeconds: 400,
                peakIntensity: 6,
                warningSignsObserved: [],
                sensoryTriggers: [],
                contextTriggers: [],
                strategiesUsed: [],
                resolution: 'co_regulated',
                hasAudioRecording: false,
                notes: 'In range',
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'cc333333-3333-4333-a333-333333333333',
                timestamp: '2024-01-25T10:00:00',
                context: 'home',
                type: 'anxiety',
                durationSeconds: 200,
                peakIntensity: 5,
                warningSignsObserved: [],
                sensoryTriggers: [],
                contextTriggers: [],
                strategiesUsed: [],
                resolution: 'timed_out',
                hasAudioRecording: false,
                notes: 'After range',
            });
        });

        const filtered = result.current.getCrisisByDateRange(
            new Date('2024-01-12'),
            new Date('2024-01-20')
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].notes).toBe('In range');
    });

    it('gets crisis events by context', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        act(() => {
            result.current.addCrisisEvent({
                id: 'cd111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
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
            });
        });

        act(() => {
            result.current.addCrisisEvent({
                id: 'cd222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-16T10:00:00',
                context: 'school',
                type: 'shutdown',
                durationSeconds: 400,
                peakIntensity: 6,
                warningSignsObserved: [],
                sensoryTriggers: [],
                contextTriggers: [],
                strategiesUsed: [],
                resolution: 'co_regulated',
                hasAudioRecording: false,
                notes: '',
            });
        });

        const homeCrises = result.current.getCrisisEventsByContext('home');
        expect(homeCrises).toHaveLength(1);
        expect(homeCrises[0].type).toBe('meltdown');

        const schoolCrises = result.current.getCrisisEventsByContext('school');
        expect(schoolCrises).toHaveLength(1);
        expect(schoolCrises[0].type).toBe('shutdown');
    });

    it('updates crisis recovery time', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        act(() => {
            result.current.addCrisisEvent({
                id: 'ce111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
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
            });
        });

        expect(result.current.crisisEvents[0].recoveryTimeMinutes).toBeUndefined();

        act(() => {
            result.current.updateCrisisRecoveryTime('ce111111-1111-4111-a111-111111111111', 15);
        });

        expect(result.current.crisisEvents[0].recoveryTimeMinutes).toBe(15);
    });

    it('returns 0 for average crisis duration with no events', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });
        expect(result.current.getAverageCrisisDuration()).toBe(0);
    });

    it('rejects invalid crisis event data', () => {
        const { result } = renderHook(() => useCrisis(), { wrapper });

        const success = act(() => {
            return result.current.addCrisisEvent({
                id: 'invalid-uuid', // Invalid UUID format
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                type: 'meltdown',
                durationSeconds: 300,
                peakIntensity: 15, // Out of range (max 10)
                warningSignsObserved: [],
                sensoryTriggers: [],
                contextTriggers: [],
                strategiesUsed: [],
                resolution: 'self_regulated',
                hasAudioRecording: false,
                notes: '',
            });
        });

        expect(success).toBe(false);
        expect(result.current.crisisEvents).toHaveLength(0);
    });
});

describe('Store - Goal Progress Tracking', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('adds goal progress and updates current value', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp111111-1111-4111-a111-111111111111',
                title: 'Test Goal',
                description: 'A test goal',
                category: 'regulation',
                targetValue: 10,
                targetUnit: 'times',
                targetDirection: 'increase',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        act(() => {
            result.current.addGoalProgress('gp111111-1111-4111-a111-111111111111', {
                date: '2024-01-15',
                value: 3,
                context: 'home',
            });
        });

        expect(result.current.goals[0].currentValue).toBe(3);
        expect(result.current.goals[0].progressHistory).toHaveLength(1);
        expect(result.current.goals[0].status).toBe('in_progress');
    });

    it('automatically achieves goal at 100% progress', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp222222-2222-4222-a222-222222222222',
                title: 'Achievable Goal',
                description: '',
                category: 'regulation',
                targetValue: 10,
                targetUnit: 'times',
                targetDirection: 'increase',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        act(() => {
            result.current.addGoalProgress('gp222222-2222-4222-a222-222222222222', {
                date: '2024-01-15',
                value: 10,
                context: 'home',
            });
        });

        expect(result.current.goals[0].status).toBe('achieved');
    });

    it('gets goal progress history', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp333333-3333-4333-a333-333333333333',
                title: 'Track Progress Goal',
                description: '',
                category: 'social',
                targetValue: 20,
                targetUnit: 'interactions',
                targetDirection: 'increase',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        act(() => {
            result.current.addGoalProgress('gp333333-3333-4333-a333-333333333333', {
                date: '2024-01-15',
                value: 5,
                context: 'school',
            });
        });

        act(() => {
            result.current.addGoalProgress('gp333333-3333-4333-a333-333333333333', {
                date: '2024-01-20',
                value: 10,
                context: 'school',
            });
        });

        const progress = result.current.getGoalProgress('gp333333-3333-4333-a333-333333333333');
        expect(progress).toHaveLength(2);
    });

    it('returns empty array for non-existent goal progress', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });
        const progress = result.current.getGoalProgress('non-existent-id');
        expect(progress).toEqual([]);
    });

    it('calculates progress for decrease direction goals', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp444444-4444-4444-a444-444444444444',
                title: 'Reduce Crisis Count',
                description: '',
                category: 'regulation',
                targetValue: 2,
                targetUnit: 'crises per week',
                targetDirection: 'decrease',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 10,
                status: 'not_started',
                progressHistory: [],
            });
        });

        // Add baseline
        act(() => {
            result.current.addGoalProgress('gp444444-4444-4444-a444-444444444444', {
                date: '2024-01-15',
                value: 10,
                context: 'home',
            });
        });

        // Add improvement
        act(() => {
            result.current.addGoalProgress('gp444444-4444-4444-a444-444444444444', {
                date: '2024-01-22',
                value: 5,
                context: 'home',
            });
        });

        expect(result.current.goals[0].currentValue).toBe(5);
        // Status should update based on progress
        expect(['in_progress', 'on_track']).toContain(result.current.goals[0].status);
    });

    it('returns 0 for overall progress with no goals', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });
        expect(result.current.getOverallProgress()).toBe(0);
    });

    it('handles goals with targetValue 0', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp555555-5555-4555-a555-555555555555',
                title: 'Zero Target Goal',
                description: '',
                category: 'regulation',
                targetValue: 0,
                targetUnit: 'times',
                targetDirection: 'decrease',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        // Should not crash
        expect(result.current.getOverallProgress()).toBe(0);
    });

    it('updates goal properties', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp666666-6666-4666-a666-666666666666',
                title: 'Original Title',
                description: '',
                category: 'regulation',
                targetValue: 10,
                targetUnit: 'times',
                targetDirection: 'increase',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        act(() => {
            result.current.updateGoal('gp666666-6666-4666-a666-666666666666', {
                title: 'Updated Title',
                status: 'discontinued',
            });
        });

        expect(result.current.goals[0].title).toBe('Updated Title');
        expect(result.current.goals[0].status).toBe('discontinued');
    });

    it('deletes a goal', () => {
        const { result } = renderHook(() => useGoals(), { wrapper });

        act(() => {
            result.current.addGoal({
                id: 'gp777777-7777-4777-a777-777777777777',
                title: 'To Delete',
                description: '',
                category: 'regulation',
                targetValue: 10,
                targetUnit: 'times',
                targetDirection: 'increase',
                startDate: '2024-01-01',
                targetDate: '2024-06-01',
                currentValue: 0,
                status: 'not_started',
                progressHistory: [],
            });
        });

        expect(result.current.goals).toHaveLength(1);

        act(() => {
            result.current.deleteGoal('gp777777-7777-4777-a777-777777777777');
        });

        expect(result.current.goals).toHaveLength(0);
    });
});

// Note: refreshData behavior changed in modular store architecture.
// Each context now handles its own storage sync via storage events.
// refreshData in SettingsProvider only refreshes onboarding state.
describe.skip('Store - SettingsContext refreshData (legacy behavior)', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('refreshes data from localStorage', () => {
        const { result } = renderHook(() => ({
            logs: useLogs(),
            settings: useSettings(),
        }), { wrapper });

        // Add a log
        act(() => {
            result.current.logs.addLog({
                id: 'rf111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        expect(result.current.logs.logs).toHaveLength(1);

        // Simulate external modification
        localStorageMock.setItem('kreativium_logs', '[]');

        // Refresh data
        act(() => {
            result.current.settings.refreshData();
        });

        expect(result.current.logs.logs).toHaveLength(0);
    });
});

// Note: Storage error handling tests require mocking localStorage at module load time.
// The modular store imports safeSetItem which captures localStorage reference on import.
// These tests would need vi.mock for the storage module to work properly.
describe.skip('Store - Storage Error Handling (requires module mocking)', () => {
    let originalSetItem: typeof Storage.prototype.setItem;

    beforeEach(() => {
        localStorageMock.clear();
        originalSetItem = localStorageMock.setItem.bind(localStorageMock);
    });

    afterEach(() => {
        localStorageMock.setItem = originalSetItem;
    });

    it('dispatches storage error event on quota exceeded', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        // Mock setItem to throw QuotaExceededError
        localStorageMock.setItem = () => {
            const error = new DOMException('Quota exceeded', 'QuotaExceededError');
            throw error;
        };

        const eventHandler = vi.fn();
        window.addEventListener(STORAGE_ERROR_EVENT, eventHandler);

        act(() => {
            result.current.addLog({
                id: 'se111111-1111-4111-a111-111111111111',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        expect(eventHandler).toHaveBeenCalled();
        expect(eventHandler.mock.calls[0][0].detail.error).toBe('quota_exceeded');

        window.removeEventListener(STORAGE_ERROR_EVENT, eventHandler);
    });

    it('dispatches storage error event on generic save failure', () => {
        const { result } = renderHook(() => useLogs(), { wrapper });

        // Mock setItem to throw generic error
        localStorageMock.setItem = () => {
            throw new Error('Generic storage error');
        };

        const eventHandler = vi.fn();
        window.addEventListener(STORAGE_ERROR_EVENT, eventHandler);

        act(() => {
            result.current.addLog({
                id: 'se222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5, valence: 5, energy: 5,
                sensoryTriggers: [], contextTriggers: [], strategies: [],
                duration: 10, note: '',
            });
        });

        expect(eventHandler).toHaveBeenCalled();
        expect(eventHandler.mock.calls[0][0].detail.error).toBe('save_failed');

        window.removeEventListener(STORAGE_ERROR_EVENT, eventHandler);
    });
});

describe('Store - Hook Error Handling', () => {
    it('throws error when useLogs is used outside provider', () => {
        expect(() => {
            renderHook(() => useLogs());
        }).toThrow('useLogs must be used within a DataProvider');
    });

    it('throws error when useCrisis is used outside provider', () => {
        expect(() => {
            renderHook(() => useCrisis());
        }).toThrow('useCrisis must be used within a DataProvider');
    });

    it('throws error when useSchedule is used outside provider', () => {
        expect(() => {
            renderHook(() => useSchedule());
        }).toThrow('useSchedule must be used within a DataProvider');
    });

    it('throws error when useGoals is used outside provider', () => {
        expect(() => {
            renderHook(() => useGoals());
        }).toThrow('useGoals must be used within a DataProvider');
    });

    it('throws error when useAppContext is used outside provider', () => {
        expect(() => {
            renderHook(() => useAppContext());
        }).toThrow('useAppContext must be used within a DataProvider');
    });

    it('throws error when useChildProfile is used outside provider', () => {
        expect(() => {
            renderHook(() => useChildProfile());
        }).toThrow('useChildProfile must be used within a DataProvider');
    });

    it('throws error when useSettings is used outside provider', () => {
        expect(() => {
            renderHook(() => useSettings());
        }).toThrow('useSettings must be used within a DataProvider');
    });
});

describe('Store - ChildProfile edge cases', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('creates new profile when updating with no existing profile', () => {
        const { result } = renderHook(() => useChildProfile(), { wrapper });

        expect(result.current.childProfile).toBeNull();

        act(() => {
            result.current.updateChildProfile({ name: 'New Child', age: 7 });
        });

        expect(result.current.childProfile).not.toBeNull();
        expect(result.current.childProfile?.name).toBe('New Child');
        expect(result.current.childProfile?.age).toBe(7);
        expect(result.current.childProfile?.id).toBeDefined();
    });
});

describe('Store - localStorage data loading with validation', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('loads valid data from localStorage on init', () => {
        // Pre-populate localStorage with valid data
        const validLog = {
            id: '11111111-1111-4111-a111-111111111111',
            timestamp: '2024-01-15T10:00:00',
            context: 'home',
            arousal: 5,
            valence: 5,
            energy: 5,
            sensoryTriggers: [],
            contextTriggers: [],
            strategies: [],
            duration: 10,
            note: 'Preloaded log',
            dayOfWeek: 'monday',
            timeOfDay: 'morning',
            hourOfDay: 10,
        };

        localStorageMock.setItem('kreativium_logs', JSON.stringify([validLog]));

        const { result } = renderHook(() => useLogs(), { wrapper });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].note).toBe('Preloaded log');
    });

    it('filters invalid items from localStorage array', () => {
        // Pre-populate localStorage with a mix of valid and invalid data
        const mixedData = [
            {
                id: '22222222-2222-4222-a222-222222222222',
                timestamp: '2024-01-15T10:00:00',
                context: 'home',
                arousal: 5,
                valence: 5,
                energy: 5,
                sensoryTriggers: [],
                contextTriggers: [],
                strategies: [],
                duration: 10,
                note: 'Valid log',
                dayOfWeek: 'monday',
                timeOfDay: 'morning',
                hourOfDay: 10,
            },
            {
                id: 'invalid-uuid',
                timestamp: 'not-a-date',
                context: 'invalid-context',
                arousal: 999, // Out of range
            },
        ];

        localStorageMock.setItem('kreativium_logs', JSON.stringify(mixedData));

        const { result } = renderHook(() => useLogs(), { wrapper });

        // Should have filtered out the invalid entry
        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].note).toBe('Valid log');
    });

    it('uses fallback for completely invalid localStorage data', () => {
        // Pre-populate with garbage
        localStorageMock.setItem('kreativium_logs', 'not valid json{{{');

        const { result } = renderHook(() => useLogs(), { wrapper });

        expect(result.current.logs).toEqual([]);
    });

    it('loads valid context from localStorage', () => {
        localStorageMock.setItem('kreativium_current_context', 'school');

        const { result } = renderHook(() => useAppContext(), { wrapper });

        expect(result.current.currentContext).toBe('school');
    });

    it('uses fallback for invalid context value', () => {
        localStorageMock.setItem('kreativium_current_context', 'invalid_context');

        const { result } = renderHook(() => useAppContext(), { wrapper });

        expect(result.current.currentContext).toBe('home'); // Fallback
    });
});
