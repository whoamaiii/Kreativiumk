/**
 * Model Context
 * Manages local AI model state across the application
 * Provides loading, status checking, and unloading functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    loadModel as loadLocalModel,
    unloadModel as unloadLocalModel,
    getModelStatus,
    getModelInfo,
    checkWebGPUSupport,
    checkLocalServer,
    type ModelInfo,
    type ModelLoadProgress
} from '../services/localModel';

// =============================================================================
// TYPES
// =============================================================================

export interface ModelContextType {
    // Status
    isLoaded: boolean;
    isLoading: boolean;
    loadProgress: number;
    progressText: string;
    error: string | null;

    // WebGPU support
    webGPUSupported: boolean | null;
    webGPUError: string | null;

    // Model info
    modelInfo: ModelInfo;

    // Actions
    loadModel: () => Promise<void>;
    unloadModel: () => Promise<void>;
    checkSupport: () => Promise<boolean>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ModelContext = createContext<ModelContextType | null>(null);

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
    modelLoaded: 'neurologg_model_loaded',
    autoLoad: 'neurologg_model_autoload',
} as const;

// =============================================================================
// PROVIDER
// =============================================================================

interface ModelProviderProps {
    children: React.ReactNode;
}

export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
    // State
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
    const [webGPUError, setWebGPUError] = useState<string | null>(null);
    const [modelInfo, setModelInfo] = useState<ModelInfo>(getModelInfo());

    // Check WebGPU support, local server, and sync model status on mount
    useEffect(() => {
        const initializeModelState = async () => {
            // Check WebGPU support
            const gpuResult = await checkWebGPUSupport();
            setWebGPUSupported(gpuResult.supported);
            if (!gpuResult.supported) {
                setWebGPUError(gpuResult.error || 'WebGPU ikke støttet');
            }

            // Check for local llama-server
            const serverAvailable = await checkLocalServer();
            if (serverAvailable && import.meta.env.DEV) {
                console.log('[ModelContext] Local llama-server detected and active');
            }

            // Sync with actual model status (after server check completes)
            const status = getModelStatus();
            setIsLoaded(status.loaded);
            setModelInfo(getModelInfo());
        };

        initializeModelState();
    }, []);

    // Progress callback
    const handleProgress = useCallback((progress: ModelLoadProgress) => {
        setLoadProgress(progress.progress);
        setProgressText(progress.text);
    }, []);

    // Load model
    const loadModel = useCallback(async () => {
        if (isLoading || isLoaded) return;

        setIsLoading(true);
        setError(null);
        setLoadProgress(0);
        setProgressText('Starter nedlasting...');

        try {
            await loadLocalModel(handleProgress);
            setIsLoaded(true);
            localStorage.setItem(STORAGE_KEYS.modelLoaded, 'true');

            if (import.meta.env.DEV) {
                console.log('[ModelContext] Model loaded successfully');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ukjent feil ved lasting av modell';
            setError(errorMessage);
            setIsLoaded(false);

            if (import.meta.env.DEV) {
                console.error('[ModelContext] Failed to load model:', err);
            }

        } finally {
            setIsLoading(false);
            setModelInfo(getModelInfo());
        }
    }, [isLoading, isLoaded, handleProgress]);

    // Unload model
    const unloadModel = useCallback(async () => {
        try {
            await unloadLocalModel();
            setIsLoaded(false);
            setLoadProgress(0);
            setProgressText('');
            localStorage.removeItem(STORAGE_KEYS.modelLoaded);

            if (import.meta.env.DEV) {
                console.log('[ModelContext] Model unloaded');
            }

        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('[ModelContext] Failed to unload model:', err);
            }
        } finally {
            setModelInfo(getModelInfo());
        }
    }, []);

    // Check support
    const checkSupport = useCallback(async (): Promise<boolean> => {
        const result = await checkWebGPUSupport();
        setWebGPUSupported(result.supported);
        if (!result.supported) {
            setWebGPUError(result.error || 'WebGPU ikke støttet');
        }
        return result.supported;
    }, []);

    // Memoized context value
    const contextValue = useMemo<ModelContextType>(() => ({
        isLoaded,
        isLoading,
        loadProgress,
        progressText,
        error,
        webGPUSupported,
        webGPUError,
        modelInfo,
        loadModel,
        unloadModel,
        checkSupport,
    }), [
        isLoaded,
        isLoading,
        loadProgress,
        progressText,
        error,
        webGPUSupported,
        webGPUError,
        modelInfo,
        loadModel,
        unloadModel,
        checkSupport,
    ]);

    return (
        <ModelContext.Provider value={contextValue}>
            {children}
        </ModelContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export const useModel = (): ModelContextType => {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModel must be used within a ModelProvider');
    }
    return context;
};

export default ModelContext;
