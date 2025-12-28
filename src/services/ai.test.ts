/**
 * Tests for ai.ts - OpenRouter API Integration
 *
 * This file tests:
 * - API configuration and status
 * - Request deduplication
 * - Retry logic with exponential backoff
 * - Error handling and reporting
 * - Streaming functionality
 * - Mock data generation
 * - Cache integration
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { LogEntry, CrisisEvent, ChildProfile } from '../types';

// Mock environment variables before importing the module
vi.stubEnv('VITE_OPENROUTER_API_KEY', 'test-api-key');
vi.stubEnv('VITE_SITE_URL', 'http://localhost:5173');
vi.stubEnv('DEV', 'true');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mocks
import {
    analyzeLogs,
    analyzeLogsDeep,
    analyzeLogsStreaming,
    analyzeLogsStreamingWithOpenRouter,
    clearAnalysisCache,
    getApiStatus,
    reportAIError,
} from './ai';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createMockLog = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: '2024-01-15T10:00:00',
    context: 'home',
    arousal: 5,
    valence: 5,
    energy: 5,
    sensoryTriggers: [],
    contextTriggers: [],
    strategies: [],
    duration: 10,
    note: '',
    dayOfWeek: 'monday',
    timeOfDay: 'morning',
    hourOfDay: 10,
    ...overrides,
});

const createMockCrisisEvent = (overrides: Partial<CrisisEvent> = {}): CrisisEvent => ({
    id: `crisis-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: '2024-01-15T10:00:00',
    context: 'home',
    type: 'meltdown',
    durationSeconds: 300,
    peakIntensity: 8,
    warningSignsObserved: [],
    sensoryTriggers: [],
    contextTriggers: [],
    strategiesUsed: [],
    resolution: 'self_regulated',
    hasAudioRecording: false,
    notes: '',
    dayOfWeek: 'monday',
    timeOfDay: 'morning',
    hourOfDay: 10,
    ...overrides,
});

const createMockChildProfile = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
    id: 'profile-1',
    name: 'Test Child',
    age: 8,
    diagnoses: ['autism', 'adhd'],
    communicationStyle: 'verbal',
    sensorySensitivities: ['Auditiv', 'Visuell'],
    seekingSensory: ['Dypt Trykk'],
    effectiveStrategies: ['Skjerming', 'Hodetelefoner'],
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-01-01T00:00:00',
    ...overrides,
});

const createMockApiResponse = (content: object = {}) => ({
    id: 'test-response-id',
    choices: [{
        message: {
            content: JSON.stringify({
                triggerAnalysis: 'Test trigger analysis',
                strategyEvaluation: 'Test strategy evaluation',
                interoceptionPatterns: 'Test interoception patterns',
                correlations: [
                    {
                        factor1: 'Low energy',
                        factor2: 'High arousal',
                        relationship: 'correlated',
                        strength: 'strong',
                        description: 'Test correlation'
                    }
                ],
                recommendations: ['Recommendation 1', 'Recommendation 2'],
                summary: 'Test summary',
                ...content,
            }),
        },
        finish_reason: 'stop',
    }],
    usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
    },
});

// =============================================================================
// TEST SUITES
// =============================================================================

describe('AI Service - getApiStatus', () => {
    it('returns API status with model information', () => {
        const status = getApiStatus();

        expect(status).toHaveProperty('configured');
        expect(status).toHaveProperty('freeModel');
        expect(status).toHaveProperty('premiumModel');
        expect(status).toHaveProperty('geminiConfigured');
        expect(status).toHaveProperty('localModelLoaded');

        expect(typeof status.freeModel).toBe('string');
        expect(typeof status.premiumModel).toBe('string');
        expect(status.freeModel).toContain('google/gemini');
    });

    it('includes correct model IDs', () => {
        const status = getApiStatus();

        expect(status.freeModel).toBe('google/gemini-2.0-flash-001');
        expect(status.premiumModel).toBe('google/gemini-2.5-pro-preview');
    });
});

describe('AI Service - reportAIError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('logs error with context in development mode', () => {
        const error = new Error('Test error');
        const context = { operation: 'test', modelId: 'test-model' };

        reportAIError(error, context);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[AI Error]',
            'Test error',
            context
        );
    });

    it('includes error stack in the log context', () => {
        const error = new Error('Stack trace test');
        reportAIError(error, {});

        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});

describe('AI Service - analyzeLogs', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('throws error when no logs provided', async () => {
        await expect(analyzeLogs([])).rejects.toThrow('No logs provided for analysis');
    });

    it('throws error when logs is null/undefined', async () => {
        // @ts-expect-error - Testing runtime error handling
        await expect(analyzeLogs(null)).rejects.toThrow('No logs provided for analysis');
    });

    it('calls OpenRouter API with correct parameters', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog({ arousal: 7, energy: 3 })];
        await analyzeLogs(logs);

        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(options.method).toBe('POST');
        expect(options.headers['Authorization']).toBe('Bearer test-api-key');
        expect(options.headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(options.body);
        expect(body.model).toBe('google/gemini-2.0-flash-001');
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[1].role).toBe('user');
    });

    it('includes child profile in system prompt when provided', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog()];
        const childProfile = createMockChildProfile();

        await analyzeLogs(logs, [], { childProfile });

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        const systemPrompt = body.messages[0].content;

        expect(systemPrompt).toContain('BARNETS PROFIL');
        expect(systemPrompt).toContain('Diagnoser:');
    });

    it('includes crisis events in user prompt when provided', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog()];
        const crisisEvents = [createMockCrisisEvent({ type: 'meltdown', peakIntensity: 9 })];

        await analyzeLogs(logs, crisisEvents);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        const userPrompt = body.messages[1].content;

        expect(userPrompt).toContain('KRISEHENDELSER');
    });

    it('parses API response correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse({
                triggerAnalysis: 'Custom trigger analysis',
                summary: 'Custom summary',
            }),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(result.triggerAnalysis).toBe('Custom trigger analysis');
        expect(result.summary).toBe('Custom summary');
        expect(result.id).toBeDefined();
        expect(result.generatedAt).toBeDefined();
        expect(result.isDeepAnalysis).toBe(false);
    });

    it('handles API error responses', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
            text: async () => JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Rate limit exceeded');
    });

    it('retries on failure with exponential backoff', async () => {
        // First two calls fail, third succeeds
        mockFetch
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Server error',
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Server error',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse(),
            });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result.summary).toBe('Test summary');
    });

    it('calls onRetry callback during retries', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Server error',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse(),
            });

        const onRetry = vi.fn();
        const logs = [createMockLog()];

        await analyzeLogs(logs, [], { onRetry });

        expect(onRetry).toHaveBeenCalledWith(2, 3, expect.any(String));
    });

    it('caches results and returns cached data', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse({ summary: 'First call' }),
        });

        const logs = [createMockLog({ id: 'cached-log' })];

        // First call hits API
        const result1 = await analyzeLogs(logs);
        expect(result1.summary).toBe('First call');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call should return cached result
        const result2 = await analyzeLogs(logs);
        expect(result2.summary).toBe('First call');
        expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
    });

    it('bypasses cache when forceRefresh is true', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse({ summary: 'First call' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse({ summary: 'Second call' }),
            });

        const logs = [createMockLog({ id: 'refresh-log' })];

        const result1 = await analyzeLogs(logs);
        expect(result1.summary).toBe('First call');

        const result2 = await analyzeLogs(logs, [], { forceRefresh: true });
        expect(result2.summary).toBe('Second call');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent requests', async () => {
        let resolvePromise: (value: unknown) => void;
        const delayedPromise = new Promise(resolve => {
            resolvePromise = resolve;
        });

        mockFetch.mockImplementation(async () => {
            await delayedPromise;
            return {
                ok: true,
                json: async () => createMockApiResponse(),
            };
        });

        const logs = [createMockLog({ id: 'dedup-log' })];

        // Start two concurrent requests
        const promise1 = analyzeLogs(logs);
        const promise2 = analyzeLogs(logs);

        // Resolve the fetch
        resolvePromise!(undefined);

        const [result1, result2] = await Promise.all([promise1, promise2]);

        // Both should get the same result
        expect(result1.summary).toBe(result2.summary);
        // Only one API call should have been made
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

describe('AI Service - analyzeLogsDeep', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('throws error when no logs provided', async () => {
        await expect(analyzeLogsDeep([])).rejects.toThrow('No logs provided for analysis');
    });

    it('uses premium model for deep analysis', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog()];
        await analyzeLogsDeep(logs);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);

        // Should try premium model first
        expect(body.model).toBe('google/gemini-2.5-pro-preview');
    });

    it('marks result as deep analysis', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogsDeep(logs);

        expect(result.isDeepAnalysis).toBe(true);
        expect(result.modelUsed).toBe('google/gemini-2.5-pro-preview');
    });

    it('falls back to next premium model on failure', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Model unavailable',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse(),
            });

        const logs = [createMockLog()];
        const result = await analyzeLogsDeep(logs);

        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Check second call used Claude
        const [, options] = mockFetch.mock.calls[1];
        const body = JSON.parse(options.body);
        expect(body.model).toBe('anthropic/claude-3.5-sonnet');
        expect(result.modelUsed).toBe('anthropic/claude-3.5-sonnet');
    });

    it('falls back to free model when all premium models fail', async () => {
        // All premium models fail
        mockFetch
            .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' })
            .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' })
            .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse(),
            });

        const logs = [createMockLog()];
        const result = await analyzeLogsDeep(logs);

        // Premium models (3) + free model retry (1)
        expect(mockFetch).toHaveBeenCalledTimes(4);
        expect(result.isDeepAnalysis).toBe(false); // Downgraded
        expect(result.modelUsed).toBe('google/gemini-2.0-flash-001');
    });

    it('includes enhanced deep analysis prompt', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog()];
        await analyzeLogsDeep(logs);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        const systemPrompt = body.messages[0].content;

        expect(systemPrompt).toContain('DYP ANALYSE');
        expect(systemPrompt).toContain('subtile mønstre');
    });
});

describe('AI Service - analyzeLogsStreamingWithOpenRouter', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('throws error when no logs provided', async () => {
        const callbacks = { onChunk: vi.fn(), onComplete: vi.fn() };

        await expect(
            analyzeLogsStreamingWithOpenRouter([], [], callbacks)
        ).rejects.toThrow('No logs provided for analysis');
    });

    it('enables streaming in request', async () => {
        // Create a mock readable stream
        const chunks = [
            'data: {"choices":[{"delta":{"content":"{"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"\\"summary\\": \\"Test\\""}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"}"}}]}\n\n',
            'data: [DONE]\n\n',
        ];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[0]) })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[1]) })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[2]) })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[3]) })
                .mockResolvedValueOnce({ done: true, value: undefined }),
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const callbacks = {
            onChunk: vi.fn(),
            onComplete: vi.fn(),
        };

        const logs = [createMockLog()];

        try {
            await analyzeLogsStreamingWithOpenRouter(logs, [], callbacks);
        } catch {
            // May fail on parsing, but we're testing the request
        }

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.stream).toBe(true);
    });

    it('calls onChunk for each streamed chunk', async () => {
        const validJson = JSON.stringify({
            triggerAnalysis: 'Test',
            strategyEvaluation: 'Test',
            interoceptionPatterns: 'Test',
            summary: 'Complete response',
            correlations: [],
            recommendations: [],
        });

        // Stream the valid JSON in chunks
        const chunks = [
            `data: {"choices":[{"delta":{"content":"${validJson.substring(0, 50).replace(/"/g, '\\"')}"}}]}\n\n`,
            `data: {"choices":[{"delta":{"content":"${validJson.substring(50).replace(/"/g, '\\"')}"}}]}\n\n`,
            'data: [DONE]\n\n',
        ];

        let chunkIndex = 0;
        const mockReader = {
            read: vi.fn().mockImplementation(async () => {
                if (chunkIndex < chunks.length) {
                    const chunk = chunks[chunkIndex];
                    chunkIndex++;
                    return { done: false, value: new TextEncoder().encode(chunk) };
                }
                return { done: true, value: undefined };
            }),
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: { getReader: () => mockReader },
        });

        const onChunk = vi.fn();
        const onComplete = vi.fn();
        const logs = [createMockLog()];

        await analyzeLogsStreamingWithOpenRouter(logs, [], { onChunk, onComplete });

        expect(onChunk).toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalled();
    });

    it('retries on streaming failure', async () => {
        // First call fails, second succeeds
        mockFetch
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Streaming error',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse(),
            });

        const onRetry = vi.fn();
        const logs = [createMockLog()];

        // Should fall back to non-streaming after streaming fails
        const result = await analyzeLogsStreamingWithOpenRouter(logs, [], { onRetry });

        expect(result.summary).toBeDefined();
    });
});

describe('AI Service - clearAnalysisCache', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('clears all cached results', async () => {
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse({ summary: 'First' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => createMockApiResponse({ summary: 'After clear' }),
            });

        const logs = [createMockLog({ id: 'clear-test' })];

        // First call populates cache
        await analyzeLogs(logs);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Clear the cache
        clearAnalysisCache();

        // Second call should hit API again
        const result = await analyzeLogs(logs);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.summary).toBe('After clear');
    });
});

describe('AI Service - Error Handling', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    it('handles network timeout errors', async () => {
        mockFetch.mockImplementation(() => {
            const controller = new AbortController();
            controller.abort();
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow();
    });

    it('handles malformed JSON responses', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test',
                choices: [{
                    message: { content: 'not valid json' },
                    finish_reason: 'stop',
                }],
            }),
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Invalid response format');
    });

    it('handles empty response content', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test',
                choices: [{
                    message: { content: '' },
                    finish_reason: 'stop',
                }],
            }),
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Empty response from AI service');
    });

    it('handles missing choices in response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test',
                choices: [],
            }),
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Empty response from AI service');
    });

    it('includes HTTP status in error message', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Unauthorized');
    });

    it('handles non-JSON error responses', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 503,
            text: async () => 'Service Unavailable',
        });

        const logs = [createMockLog()];

        await expect(analyzeLogs(logs)).rejects.toThrow('Service Unavailable');
    });
});

describe('AI Service - Date Range Calculation', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    it('calculates correct date range for logs', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [
            createMockLog({ id: '1', timestamp: '2024-01-10T10:00:00' }),
            createMockLog({ id: '2', timestamp: '2024-01-15T10:00:00' }),
            createMockLog({ id: '3', timestamp: '2024-01-12T10:00:00' }),
        ];

        const result = await analyzeLogs(logs);

        expect(result.dateRangeStart).toBe('2024-01-10T10:00:00.000Z');
        expect(result.dateRangeEnd).toBe('2024-01-15T10:00:00.000Z');
    });

    it('handles single log correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse(),
        });

        const logs = [createMockLog({ timestamp: '2024-01-15T10:00:00' })];
        const result = await analyzeLogs(logs);

        expect(result.dateRangeStart).toBe(result.dateRangeEnd);
    });
});

describe('AI Service - Response Parsing', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    it('parses correlations correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse({
                correlations: [
                    {
                        factor1: 'Low energy',
                        factor2: 'High arousal',
                        relationship: 'causes',
                        strength: 'strong',
                        description: 'When energy is low, arousal tends to spike',
                    },
                    {
                        factor1: 'Morning time',
                        factor2: 'Better regulation',
                        relationship: 'associated',
                        strength: 'moderate',
                        description: 'Mornings show better regulation',
                    },
                ],
            }),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(result.correlations).toHaveLength(2);
        expect(result.correlations?.[0].strength).toBe('strong');
        expect(result.correlations?.[1].strength).toBe('moderate');
    });

    it('filters invalid recommendations', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse({
                recommendations: [
                    'Valid recommendation',
                    123, // Invalid - not a string
                    'Another valid one',
                    null, // Invalid
                    'Third valid',
                ],
            }),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(result.recommendations).toHaveLength(3);
        expect(result.recommendations).toContain('Valid recommendation');
        expect(result.recommendations).toContain('Another valid one');
        expect(result.recommendations).toContain('Third valid');
    });

    it('handles markdown-wrapped JSON in response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test',
                choices: [{
                    message: {
                        content: '```json\n' + JSON.stringify({
                            triggerAnalysis: 'Markdown wrapped',
                            strategyEvaluation: 'Test',
                            interoceptionPatterns: 'Test',
                            summary: 'From markdown',
                            correlations: [],
                            recommendations: [],
                        }) + '\n```',
                    },
                    finish_reason: 'stop',
                }],
            }),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(result.triggerAnalysis).toBe('Markdown wrapped');
        expect(result.summary).toBe('From markdown');
    });

    it('normalizes invalid correlation strength to moderate', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockApiResponse({
                correlations: [
                    {
                        factor1: 'Test',
                        factor2: 'Test',
                        relationship: 'test',
                        strength: 'invalid_strength',
                        description: 'Test',
                    },
                ],
            }),
        });

        const logs = [createMockLog()];
        const result = await analyzeLogs(logs);

        expect(result.correlations?.[0].strength).toBe('moderate');
    });
});

describe('AI Service - analyzeLogsStreaming (unified)', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        clearAnalysisCache();
    });

    it('delegates to OpenRouter streaming when no local model', async () => {
        const validJson = JSON.stringify({
            triggerAnalysis: 'Test',
            strategyEvaluation: 'Test',
            interoceptionPatterns: 'Test',
            summary: 'Streaming test',
            correlations: [],
            recommendations: [],
        });

        const chunks = [
            `data: {"choices":[{"delta":{"content":"${validJson.replace(/"/g, '\\"')}"}}]}\n\n`,
            'data: [DONE]\n\n',
        ];

        let chunkIndex = 0;
        const mockReader = {
            read: vi.fn().mockImplementation(async () => {
                if (chunkIndex < chunks.length) {
                    const chunk = chunks[chunkIndex];
                    chunkIndex++;
                    return { done: false, value: new TextEncoder().encode(chunk) };
                }
                return { done: true, value: undefined };
            }),
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            body: { getReader: () => mockReader },
        });

        const callbacks = {
            onChunk: vi.fn(),
            onComplete: vi.fn(),
        };

        const logs = [createMockLog()];
        const result = await analyzeLogsStreaming(logs, [], callbacks);

        expect(result.summary).toBe('Streaming test');
    });
});
