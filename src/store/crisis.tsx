/* eslint-disable react-refresh/only-export-components */
/**
 * Crisis Context - Manages crisis event tracking
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { z } from 'zod';
import type { CrisisEvent, ContextType } from '../types';
import { enrichCrisisEvent } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import { CrisisEventSchema, validateCrisisEvent } from '../utils/validation';
import { getStorageItem, safeSetItem, STORAGE_REFRESH_EVENT } from './storage';
import type { CrisisContextType } from './types';

const CrisisContext = createContext<CrisisContextType | undefined>(undefined);

interface CrisisProviderProps {
    children: ReactNode;
}

export const CrisisProvider: React.FC<CrisisProviderProps> = ({ children }) => {
    const [crisisEvents, setCrisisEvents] = useState<CrisisEvent[]>(() =>
        getStorageItem(STORAGE_KEYS.CRISIS_EVENTS, [], z.array(CrisisEventSchema))
    );

    // Multi-tab sync and refresh event handling
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEYS.CRISIS_EVENTS || !e.newValue) return;
            try {
                const parsed = JSON.parse(e.newValue);
                const result = z.array(CrisisEventSchema).safeParse(parsed);
                if (result.success) {
                    setCrisisEvents(result.data);
                } else if (import.meta.env.DEV) {
                    console.warn('[Storage Sync] Invalid crisis events data from other tab');
                }
            } catch {
                // Ignore parse errors
            }
        };

        const handleRefresh = () => {
            setCrisisEvents(getStorageItem(STORAGE_KEYS.CRISIS_EVENTS, [], z.array(CrisisEventSchema)));
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener(STORAGE_REFRESH_EVENT, handleRefresh);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener(STORAGE_REFRESH_EVENT, handleRefresh);
        };
    }, []);

    const saveCrisisEvents = useCallback((newEvents: CrisisEvent[]) => {
        setCrisisEvents(newEvents);
        safeSetItem(STORAGE_KEYS.CRISIS_EVENTS, JSON.stringify(newEvents));
    }, []);

    const addCrisisEvent = useCallback((event: Omit<CrisisEvent, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'>): boolean => {
        const validation = validateCrisisEvent(event);
        if (!validation.success) {
            if (import.meta.env.DEV) {
                console.error('[addCrisisEvent] Validation failed:', validation.errors);
            }
            return false;
        }

        const enrichedEvent = enrichCrisisEvent(event);
        saveCrisisEvents([enrichedEvent, ...crisisEvents]);
        return true;
    }, [crisisEvents, saveCrisisEvents]);

    const updateCrisisEvent = useCallback((id: string, updates: Partial<CrisisEvent>) => {
        saveCrisisEvents(crisisEvents.map(e => e.id === id ? { ...e, ...updates } : e));
    }, [crisisEvents, saveCrisisEvents]);

    const deleteCrisisEvent = useCallback((id: string) => {
        saveCrisisEvents(crisisEvents.filter(e => e.id !== id));
    }, [crisisEvents, saveCrisisEvents]);

    const getCrisisByDateRange = useCallback((startDate: Date, endDate: Date) => {
        return crisisEvents.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });
    }, [crisisEvents]);

    const getAverageCrisisDuration = useCallback(() => {
        if (crisisEvents.length === 0) return 0;
        const totalSeconds = crisisEvents.reduce((sum, e) => sum + e.durationSeconds, 0);
        return Math.round(totalSeconds / crisisEvents.length);
    }, [crisisEvents]);

    const getCrisisCountByType = useCallback(() => {
        return crisisEvents.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [crisisEvents]);

    const getCrisisEventsByContext = useCallback((context: ContextType) => {
        return crisisEvents.filter(event => event.context === context);
    }, [crisisEvents]);

    const updateCrisisRecoveryTime = useCallback((id: string, recoveryMinutes: number) => {
        saveCrisisEvents(crisisEvents.map(e =>
            e.id === id ? { ...e, recoveryTimeMinutes: recoveryMinutes } : e
        ));
    }, [crisisEvents, saveCrisisEvents]);

    const value = useMemo<CrisisContextType>(() => ({
        crisisEvents,
        addCrisisEvent,
        updateCrisisEvent,
        deleteCrisisEvent,
        getCrisisByDateRange,
        getAverageCrisisDuration,
        getCrisisCountByType,
        getCrisisEventsByContext,
        updateCrisisRecoveryTime
    }), [crisisEvents, addCrisisEvent, updateCrisisEvent, deleteCrisisEvent, getCrisisByDateRange, getAverageCrisisDuration, getCrisisCountByType, getCrisisEventsByContext, updateCrisisRecoveryTime]);

    return (
        <CrisisContext.Provider value={value}>
            {children}
        </CrisisContext.Provider>
    );
};

export const useCrisis = (): CrisisContextType => {
    const context = useContext(CrisisContext);
    if (context === undefined) {
        throw new Error('useCrisis must be used within a DataProvider');
    }
    return context;
};

export { CrisisContext };
