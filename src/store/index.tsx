/* eslint-disable react-refresh/only-export-components */
/**
 * Combined Data Provider - Composes all context providers
 *
 * This file re-exports all hooks and provides the combined DataProvider component
 * that wraps the application with all necessary contexts.
 *
 * Each individual provider handles its own:
 * - State initialization from localStorage
 * - State persistence to localStorage
 * - Multi-tab synchronization via storage events
 */
import React, { type ReactNode } from 'react';

// Import individual providers and hooks
import { LogsProvider as InternalLogsProvider, useLogs, LogsContext } from './logs';
import { CrisisProvider, useCrisis, CrisisContext } from './crisis';
import { ScheduleProvider, useSchedule, ScheduleContext } from './schedule';
import { GoalsProvider, useGoals, GoalsContext } from './goals';
import { AppProvider, useAppContext, AppContext } from './app';
import { ChildProfileProvider, useChildProfile, ChildProfileContext } from './childProfile';
import { SettingsProvider, useSettings, SettingsContext } from './settings';

// Re-export storage helpers and events
export { STORAGE_ERROR_EVENT, STORAGE_REFRESH_EVENT, safeSetItem, getStorageItem, getStorageContext, safeRemoveItem } from './storage';

// Re-export all hooks for convenient access
export { useLogs, useCrisis, useSchedule, useGoals, useAppContext, useChildProfile, useSettings };

// Re-export contexts for advanced use cases (testing, direct access)
export { LogsContext, CrisisContext, ScheduleContext, GoalsContext, AppContext, ChildProfileContext, SettingsContext };

// Re-export types
export type {
    LogsContextType,
    CrisisContextType,
    ScheduleContextType,
    GoalsContextType,
    AppContextType,
    ChildProfileContextType,
    SettingsContextType
} from './types';

/**
 * Combined DataProvider that composes all context providers
 * Maintains backwards compatibility with the original store.tsx API
 *
 * Provider nesting order (outermost to innermost):
 * AppContext → ChildProfile → Settings → Logs → Crisis → Schedule → Goals
 */
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AppProvider>
            <ChildProfileProvider>
                <SettingsProvider>
                    <InternalLogsProvider>
                        <CrisisProvider>
                            <ScheduleProvider>
                                <GoalsProvider>
                                    {children}
                                </GoalsProvider>
                            </ScheduleProvider>
                        </CrisisProvider>
                    </InternalLogsProvider>
                </SettingsProvider>
            </ChildProfileProvider>
        </AppProvider>
    );
};

// Backwards compatibility alias
export const LogsProvider = DataProvider;

// Re-export data export utilities
export { exportAllData, type ExportedData } from '../utils/exportData';
