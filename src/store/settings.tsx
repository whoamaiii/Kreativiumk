/**
 * Settings Context - Manages onboarding state and data refresh
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../constants/storage';
import { getStorageItem, safeSetItem } from './storage';
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

    // refreshData is a no-op now - each context handles its own storage sync
    // Kept for backwards compatibility with existing code that calls it
    const refreshData = useCallback(() => {
        // Each individual provider handles its own multi-tab sync
        // This function is kept for backwards compatibility
        setHasCompletedOnboarding(getStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, false));
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
