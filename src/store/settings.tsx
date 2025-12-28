/* eslint-disable react-refresh/only-export-components */
/**
 * Settings Context - Manages onboarding state and data refresh
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../constants/storage';
import { getStorageItem, safeSetItem, STORAGE_REFRESH_EVENT } from './storage';
import type { SettingsContextType } from './types';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() =>
        getStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, false)
    );

    const completeOnboarding = useCallback(() => {
        setHasCompletedOnboarding(true);
        safeSetItem(STORAGE_KEYS.ONBOARDING_COMPLETED, JSON.stringify(true));
    }, []);

    // refreshData triggers a reload of all contexts from localStorage
    // This is used after importing data or loading mock data
    const refreshData = useCallback(() => {
        // Refresh local settings state
        setHasCompletedOnboarding(getStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, false));
        // Dispatch event for all other providers to refresh
        window.dispatchEvent(new CustomEvent(STORAGE_REFRESH_EVENT));
    }, []);

    const value = useMemo<SettingsContextType>(() => ({
        hasCompletedOnboarding,
        completeOnboarding,
        refreshData
    }), [hasCompletedOnboarding, completeOnboarding, refreshData]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a DataProvider');
    }
    return context;
};

export { SettingsContext };
