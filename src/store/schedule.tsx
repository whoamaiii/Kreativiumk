/* eslint-disable react-refresh/only-export-components */
/**
 * Schedule Context - Manages visual schedule entries and templates
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { z } from 'zod';
import type { ScheduleEntry, DailyScheduleTemplate } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import { ScheduleEntrySchema, DailyScheduleTemplateSchema } from '../utils/validation';
import { getStorageItem, safeSetItem, STORAGE_REFRESH_EVENT } from './storage';
import type { ScheduleContextType } from './types';

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

interface ScheduleProviderProps {
    children: ReactNode;
}

export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
    const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(() =>
        getStorageItem(STORAGE_KEYS.SCHEDULE_ENTRIES, [], z.array(ScheduleEntrySchema))
    );
    const [scheduleTemplates, setScheduleTemplates] = useState<DailyScheduleTemplate[]>(() =>
        getStorageItem(STORAGE_KEYS.SCHEDULE_TEMPLATES, [], z.array(DailyScheduleTemplateSchema))
    );

    // Multi-tab sync and refresh event handling
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (!e.newValue) return;
            try {
                const parsed = JSON.parse(e.newValue);
                if (e.key === STORAGE_KEYS.SCHEDULE_ENTRIES) {
                    const result = z.array(ScheduleEntrySchema).safeParse(parsed);
                    if (result.success) {
                        setScheduleEntries(result.data);
                    } else if (import.meta.env.DEV) {
                        console.warn('[Storage Sync] Invalid schedule entries from other tab');
                    }
                } else if (e.key === STORAGE_KEYS.SCHEDULE_TEMPLATES) {
                    const result = z.array(DailyScheduleTemplateSchema).safeParse(parsed);
                    if (result.success) {
                        setScheduleTemplates(result.data);
                    } else if (import.meta.env.DEV) {
                        console.warn('[Storage Sync] Invalid schedule templates from other tab');
                    }
                }
            } catch {
                // Ignore parse errors
            }
        };

        const handleRefresh = () => {
            setScheduleEntries(getStorageItem(STORAGE_KEYS.SCHEDULE_ENTRIES, [], z.array(ScheduleEntrySchema)));
            setScheduleTemplates(getStorageItem(STORAGE_KEYS.SCHEDULE_TEMPLATES, [], z.array(DailyScheduleTemplateSchema)));
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener(STORAGE_REFRESH_EVENT, handleRefresh);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener(STORAGE_REFRESH_EVENT, handleRefresh);
        };
    }, []);

    const saveScheduleEntries = useCallback((newEntries: ScheduleEntry[]) => {
        setScheduleEntries(newEntries);
        safeSetItem(STORAGE_KEYS.SCHEDULE_ENTRIES, JSON.stringify(newEntries));
    }, []);

    const saveScheduleTemplates = useCallback((newTemplates: DailyScheduleTemplate[]) => {
        setScheduleTemplates(newTemplates);
        safeSetItem(STORAGE_KEYS.SCHEDULE_TEMPLATES, JSON.stringify(newTemplates));
    }, []);

    const addScheduleEntry = useCallback((entry: ScheduleEntry) => {
        saveScheduleEntries([...scheduleEntries, entry]);
    }, [scheduleEntries, saveScheduleEntries]);

    const updateScheduleEntry = useCallback((id: string, updates: Partial<ScheduleEntry>) => {
        saveScheduleEntries(scheduleEntries.map(e => e.id === id ? { ...e, ...updates } : e));
    }, [scheduleEntries, saveScheduleEntries]);

    const deleteScheduleEntry = useCallback((id: string) => {
        saveScheduleEntries(scheduleEntries.filter(e => e.id !== id));
    }, [scheduleEntries, saveScheduleEntries]);

    const getEntriesByDate = useCallback((date: string) => {
        return scheduleEntries.filter(e => e.date === date);
    }, [scheduleEntries]);

    const addTemplate = useCallback((template: DailyScheduleTemplate) => {
        saveScheduleTemplates([...scheduleTemplates, template]);
    }, [scheduleTemplates, saveScheduleTemplates]);

    const updateTemplate = useCallback((id: string, updates: Partial<DailyScheduleTemplate>) => {
        saveScheduleTemplates(scheduleTemplates.map(t => t.id === id ? { ...t, ...updates } : t));
    }, [scheduleTemplates, saveScheduleTemplates]);

    const deleteTemplate = useCallback((id: string) => {
        saveScheduleTemplates(scheduleTemplates.filter(t => t.id !== id));
    }, [scheduleTemplates, saveScheduleTemplates]);

    const getCompletionRate = useCallback((dateRange?: { start: Date; end: Date }) => {
        let entries = scheduleEntries;
        if (dateRange) {
            entries = entries.filter(e => {
                const date = new Date(e.date);
                return date >= dateRange.start && date <= dateRange.end;
            });
        }
        if (entries.length === 0) return 0;
        const completed = entries.filter(e => e.status === 'completed').length;
        return Math.round((completed / entries.length) * 100);
    }, [scheduleEntries]);

    const value = useMemo<ScheduleContextType>(() => ({
        scheduleEntries,
        scheduleTemplates,
        addScheduleEntry,
        updateScheduleEntry,
        deleteScheduleEntry,
        getEntriesByDate,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        getCompletionRate
    }), [scheduleEntries, scheduleTemplates, addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, getEntriesByDate, addTemplate, updateTemplate, deleteTemplate, getCompletionRate]);

    return (
        <ScheduleContext.Provider value={value}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = (): ScheduleContextType => {
    const context = useContext(ScheduleContext);
    if (context === undefined) {
        throw new Error('useSchedule must be used within a DataProvider');
    }
    return context;
};

export { ScheduleContext };
