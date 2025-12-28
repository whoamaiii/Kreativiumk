/**
 * App Context - Manages current context (home/school) selection
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { ContextType } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import { getStorageContext, safeSetItem } from './storage';
import type { AppContextType } from './types';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [currentContext, setCurrentContextState] = useState<ContextType>(() =>
        getStorageContext(STORAGE_KEYS.CURRENT_CONTEXT, 'home')
    );

    // Multi-tab sync for current context
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEYS.CURRENT_CONTEXT || !e.newValue) return;
            if (e.newValue === 'home' || e.newValue === 'school') {
                setCurrentContextState(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const setCurrentContext = useCallback((context: ContextType) => {
        setCurrentContextState(context);
        safeSetItem(STORAGE_KEYS.CURRENT_CONTEXT, context);
    }, []);

    const value = useMemo<AppContextType>(() => ({
        currentContext,
        setCurrentContext
    }), [currentContext, setCurrentContext]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within a DataProvider');
    }
    return context;
};

export { AppContext };
