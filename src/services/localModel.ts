/**
 * Local Model Service
 * WebLLM integration for offline-first AI inference
 * Uses fine-tuned Gemma 3 1B model for Norwegian behavioral analysis
 */

import * as webllm from '@mlc-ai/web-llm';
import type { LogEntry, AnalysisResult, CrisisEvent, ChildProfile } from '../types';
import {
    generateLogsHash,
    createAnalysisCache,
    getLogsDateRange,
    prepareLogsForAnalysis,
    prepareCrisisEventsForAnalysis,
    buildSystemPrompt,
    buildUserPrompt,
    parseAnalysisResponse,
    type StreamCallbacks
} from './aiCommon';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Local llama-server configuration (for development with fine-tuned model)
// NOTE: This feature is disabled by default. The app uses OpenRouter/Gemini APIs.
// To enable local inference, set enabled: true and run llama-server on localhost:8080
const LOCAL_SERVER_CONFIG = {
    // URL of the local llama-server
    url: 'http://localhost:8080',

    // Disabled by default - use cloud APIs (OpenRouter/Gemini) for analysis
    // Set to true only for local development with a running llama-server
    enabled: false,
} as const;

// Model configuration - Update this when hosting your fine-tuned model
const MODEL_CONFIG = {
    // Default to standard Gemma model until custom model is hosted
    // Replace with your fine-tuned model URL when ready
    modelId: 'gemma-2-2b-it-q4f16_1-MLC',

    // Custom model config (uncomment and configure when ready)
    // customModelUrl: 'https://your-cdn.com/neurologg-gemma-1b/',
    // customModelLib: 'https://your-cdn.com/neurologg-gemma-1b/lib/',

    // Generation settings optimized for behavioral analysis
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 4000,

    // Context window
    contextWindowSize: 4096,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface ModelInfo {
    id: string;
    loaded: boolean;
    loadProgress: number;
    vramRequired: string;
    contextLength: number;
}

export interface ModelLoadProgress {
    progress: number;
    text: string;
    timeRemaining?: number;
}

export type ProgressCallback = (progress: ModelLoadProgress) => void;

// =============================================================================
// MODULE STATE
// =============================================================================

let engine: webllm.MLCEngine | null = null;
let isModelLoaded = false;
let currentModelId: string | null = null;
let isLocalServerAvailable = false;

// Cache for analysis results
const analysisCache = createAnalysisCache();

// =============================================================================
// LOCAL SERVER (llama-server) SUPPORT
// =============================================================================

/**
 * Check if local llama-server is running
 */
export const checkLocalServer = async (): Promise<boolean> => {
    if (!LOCAL_SERVER_CONFIG.enabled) {
        return false;
    }

    try {
        const response = await fetch(`${LOCAL_SERVER_CONFIG.url}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        isLocalServerAvailable = response.ok;
        return isLocalServerAvailable;
    } catch {
        isLocalServerAvailable = false;
        return false;
    }
};

/**
 * Call local llama-server API for chat completion
 */
const callLocalServer = async (
    systemPrompt: string,
    userPrompt: string,
    callbacks?: StreamCallbacks
): Promise<string> => {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    const requestBody = {
        messages,
        temperature: MODEL_CONFIG.temperature,
        top_p: MODEL_CONFIG.topP,
        max_tokens: MODEL_CONFIG.maxTokens,
        stream: Boolean(callbacks?.onChunk),
    };

    const response = await fetch(`${LOCAL_SERVER_CONFIG.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`Local server error: ${response.status}`);
    }

    if (callbacks?.onChunk && response.body) {
        // Streaming mode
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                        fullText += content;
                        callbacks.onChunk(content);
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }

        callbacks.onComplete?.(fullText);
        return fullText;
    } else {
        // Non-streaming mode
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from local server');
        }
        return content;
    }
};

// =============================================================================
// ENGINE MANAGEMENT
// =============================================================================

/**
 * Initialize the WebLLM engine
 */
export const initializeEngine = async (): Promise<void> => {
    if (engine) {
        return; // Already initialized
    }

    engine = new webllm.MLCEngine();

    if (import.meta.env.DEV) {
        console.log('[LocalModel] Engine initialized');
    }
};

/**
 * Check if WebGPU is supported in this browser
 */
export const checkWebGPUSupport = async (): Promise<{ supported: boolean; error?: string }> => {
    if (!navigator.gpu) {
        return {
            supported: false,
            error: 'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.'
        };
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return {
                supported: false,
                error: 'No WebGPU adapter found. Your device may not support WebGPU.'
            };
        }
        return { supported: true };
    } catch (error) {
        return {
            supported: false,
            error: `WebGPU error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
};

/**
 * Load the model with progress reporting
 */
export const loadModel = async (onProgress?: ProgressCallback): Promise<void> => {
    // Check WebGPU support first
    const webgpuCheck = await checkWebGPUSupport();
    if (!webgpuCheck.supported) {
        throw new Error(webgpuCheck.error);
    }

    // Initialize engine if needed
    await initializeEngine();

    if (!engine) {
        throw new Error('Failed to initialize WebLLM engine');
    }

    // Already loaded?
    if (isModelLoaded && currentModelId === MODEL_CONFIG.modelId) {
        onProgress?.({ progress: 100, text: 'Modell allerede lastet' });
        return;
    }

    if (import.meta.env.DEV) {
        console.log(`[LocalModel] Loading model: ${MODEL_CONFIG.modelId}`);
    }

    try {
        // Set up progress callback
        engine.setInitProgressCallback((report) => {
            const progress = Math.round(report.progress * 100);
            onProgress?.({
                progress,
                text: report.text,
                timeRemaining: report.timeElapsed ? Math.round((report.timeElapsed / report.progress) * (1 - report.progress)) : undefined
            });

            if (import.meta.env.DEV) {
                console.log(`[LocalModel] Loading: ${progress}% - ${report.text}`);
            }
        });

        // Load the model
        await engine.reload(MODEL_CONFIG.modelId);

        isModelLoaded = true;
        currentModelId = MODEL_CONFIG.modelId;

        onProgress?.({ progress: 100, text: 'Modell lastet!' });

        if (import.meta.env.DEV) {
            console.log('[LocalModel] Model loaded successfully');
        }

    } catch (error) {
        isModelLoaded = false;
        currentModelId = null;

        if (import.meta.env.DEV) {
            console.error('[LocalModel] Failed to load model:', error);
        }

        throw new Error(`Kunne ikke laste modell: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
    }
};

/**
 * Unload the model and free memory
 */
export const unloadModel = async (): Promise<void> => {
    if (engine) {
        try {
            await engine.unload();
        } catch {
            // Ignore unload errors
        }
        engine = null;
    }

    isModelLoaded = false;
    currentModelId = null;
    analysisCache.clear();

    if (import.meta.env.DEV) {
        console.log('[LocalModel] Model unloaded');
    }
};

/**
 * Check if model is currently loaded
 */
export const getModelStatus = (): { loaded: boolean; modelId: string | null; localServerActive: boolean } => {
    return {
        loaded: isModelLoaded || isLocalServerAvailable,
        modelId: isLocalServerAvailable ? 'local:neurologg-gemma-1b' : currentModelId,
        localServerActive: isLocalServerAvailable
    };
};

/**
 * Get model information
 */
export const getModelInfo = (): ModelInfo => {
    return {
        id: MODEL_CONFIG.modelId,
        loaded: isModelLoaded,
        loadProgress: isModelLoaded ? 100 : 0,
        vramRequired: '~1.5 GB',
        contextLength: MODEL_CONFIG.contextWindowSize
    };
};

// =============================================================================
// INFERENCE
// =============================================================================

/**
 * Generate a response from the local model
 * Tries local llama-server first (if available), falls back to WebLLM
 */
export const generateResponse = async (
    systemPrompt: string,
    userPrompt: string,
    callbacks?: StreamCallbacks
): Promise<string> => {
    // Try local server first (for development with fine-tuned model)
    if (isLocalServerAvailable) {
        try {
            if (import.meta.env.DEV) {
                console.log('[LocalModel] Using local llama-server...');
            }
            return await callLocalServer(systemPrompt, userPrompt, callbacks);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('[LocalModel] Local server failed, falling back to WebLLM:', error);
            }
            // Fall through to WebLLM
        }
    }

    // Use WebLLM
    if (!engine || !isModelLoaded) {
        throw new Error('Model not loaded. Call loadModel() first.');
    }

    const messages: webllm.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    try {
        if (callbacks?.onChunk) {
            // Streaming mode
            let fullResponse = '';

            const asyncGenerator = await engine.chat.completions.create({
                messages,
                temperature: MODEL_CONFIG.temperature,
                top_p: MODEL_CONFIG.topP,
                max_tokens: MODEL_CONFIG.maxTokens,
                stream: true,
                response_format: { type: 'json_object' }
            });

            for await (const chunk of asyncGenerator) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    callbacks.onChunk(content);
                }
            }

            callbacks.onComplete?.(fullResponse);
            return fullResponse;

        } else {
            // Non-streaming mode
            const response = await engine.chat.completions.create({
                messages,
                temperature: MODEL_CONFIG.temperature,
                top_p: MODEL_CONFIG.topP,
                max_tokens: MODEL_CONFIG.maxTokens,
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from model');
            }

            return content;
        }

    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('[LocalModel] Generation error:', error);
        }
        throw new Error(`Generering feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
    }
};

// =============================================================================
// ANALYSIS API (matches ai.ts interface)
// =============================================================================

/**
 * Analyze logs using the local model
 * Matches the interface of analyzeLogs from ai.ts
 */
export const analyzeLogsWithLocalModel = async (
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = [],
    options: { forceRefresh?: boolean; childProfile?: ChildProfile | null } = {}
): Promise<AnalysisResult> => {
    // Validate input
    if (!logs || logs.length === 0) {
        throw new Error('Ingen logger å analysere');
    }

    // Check if model is loaded (either WebLLM or local server)
    if (!isModelLoaded && !isLocalServerAvailable) {
        throw new Error('Modell ikke lastet. Last ned AI-modellen først i innstillinger.');
    }

    // Check cache
    const logsHash = generateLogsHash(logs, crisisEvents);
    if (!options.forceRefresh) {
        const cached = analysisCache.get(logsHash, 'regular');
        if (cached) {
            if (import.meta.env.DEV) {
                console.log('[LocalModel] Returning cached analysis');
            }
            return cached;
        }
    }

    // Prepare data
    const { oldest: oldestDate, newest: newestDate } = getLogsDateRange(logs);
    const totalDays = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const preparedLogs = prepareLogsForAnalysis(logs, newestDate);
    const preparedCrisis = prepareCrisisEventsForAnalysis(crisisEvents, newestDate);

    // Build prompts
    const systemPrompt = buildSystemPrompt(options.childProfile);
    const userPrompt = buildUserPrompt(preparedLogs, preparedCrisis, totalDays);

    if (import.meta.env.DEV) {
        console.log(`[LocalModel] Analyzing ${logs.length} logs...`);
    }

    try {
        // Generate response
        const response = await generateResponse(systemPrompt, userPrompt);

        // Parse response
        const result = parseAnalysisResponse(response);

        // Add metadata
        result.dateRangeStart = oldestDate.toISOString();
        result.dateRangeEnd = newestDate.toISOString();
        result.isDeepAnalysis = false;
        result.modelUsed = 'local:' + MODEL_CONFIG.modelId;

        // Cache result
        analysisCache.set(result, logsHash, 'regular');

        if (import.meta.env.DEV) {
            console.log('[LocalModel] Analysis complete');
        }

        return result;

    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('[LocalModel] Analysis failed:', error);
        }
        throw new Error(`Analyse feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
    }
};

/**
 * Streaming analysis using the local model
 */
export const analyzeLogsStreamingWithLocalModel = async (
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = [],
    callbacks: StreamCallbacks,
    options: { childProfile?: ChildProfile | null } = {}
): Promise<AnalysisResult> => {
    // Validate input
    if (!logs || logs.length === 0) {
        throw new Error('Ingen logger å analysere');
    }

    // Check if model is loaded (either WebLLM or local server)
    if (!isModelLoaded && !isLocalServerAvailable) {
        throw new Error('Modell ikke lastet');
    }

    // Prepare data
    const { oldest: oldestDate, newest: newestDate } = getLogsDateRange(logs);
    const totalDays = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const preparedLogs = prepareLogsForAnalysis(logs, newestDate);
    const preparedCrisis = prepareCrisisEventsForAnalysis(crisisEvents, newestDate);

    // Build prompts
    const systemPrompt = buildSystemPrompt(options.childProfile);
    const userPrompt = buildUserPrompt(preparedLogs, preparedCrisis, totalDays);

    if (import.meta.env.DEV) {
        console.log(`[LocalModel] Streaming analysis of ${logs.length} logs...`);
    }

    try {
        // Generate with streaming
        const response = await generateResponse(systemPrompt, userPrompt, callbacks);

        // Parse response
        const result = parseAnalysisResponse(response);

        // Add metadata
        result.dateRangeStart = oldestDate.toISOString();
        result.dateRangeEnd = newestDate.toISOString();
        result.isDeepAnalysis = false;
        result.modelUsed = 'local:' + MODEL_CONFIG.modelId;

        // Cache result
        const logsHash = generateLogsHash(logs, crisisEvents);
        analysisCache.set(result, logsHash, 'regular');

        return result;

    } catch (error) {
        callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
        throw error;
    }
};

/**
 * Deep analysis using the local model (same as regular for now)
 * Local model doesn't have a "premium" tier, but we can use longer context
 */
export const analyzeLogsDeepWithLocalModel = async (
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = [],
    options: { childProfile?: ChildProfile | null } = {}
): Promise<AnalysisResult & { modelUsed?: string }> => {
    // For local model, deep analysis is the same as regular
    // but we add the deep analysis flag
    const result = await analyzeLogsWithLocalModel(logs, crisisEvents, {
        ...options,
        forceRefresh: true // Always fresh for deep analysis
    });

    result.isDeepAnalysis = true;

    return result as AnalysisResult & { modelUsed?: string };
};

/**
 * Clear local model cache
 */
export const clearLocalModelCache = (): void => {
    analysisCache.clear();
};
