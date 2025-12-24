import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    loadValidatedArray,
    STORAGE_KEYS,
} from './StorageService';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _getStore: () => store,
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('StorageService', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('STORAGE_KEYS', () => {
        it('has all required keys', () => {
            expect(STORAGE_KEYS.LOGS).toBe('kreativium_logs');
            expect(STORAGE_KEYS.CRISIS_EVENTS).toBe('kreativium_crisis_events');
            expect(STORAGE_KEYS.SCHEDULE_ENTRIES).toBe('kreativium_schedule_entries');
            expect(STORAGE_KEYS.SCHEDULE_TEMPLATES).toBe('kreativium_schedule_templates');
            expect(STORAGE_KEYS.GOALS).toBe('kreativium_goals');
            expect(STORAGE_KEYS.CHILD_PROFILE).toBe('kreativium_child_profile');
            expect(STORAGE_KEYS.CURRENT_CONTEXT).toBe('kreativium_current_context');
        });
    });

    describe('getStorageItem', () => {
        const testSchema = z.object({
            id: z.string(),
            name: z.string(),
        });

        it('returns undefined for missing key', () => {
            const result = getStorageItem(STORAGE_KEYS.LOGS, testSchema);
            expect(result.success).toBe(true);
            expect(result.data).toBeUndefined();
        });

        it('parses and validates valid data', () => {
            const data = { id: '123', name: 'Test' };
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data));

            const result = getStorageItem(STORAGE_KEYS.LOGS, testSchema);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
        });

        it('returns error for invalid data', () => {
            const invalidData = { id: 123, name: 'Test' }; // id should be string
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(invalidData));

            const result = getStorageItem(STORAGE_KEYS.LOGS, testSchema);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Validation failed');
        });

        it('handles JSON parse errors', () => {
            localStorageMock.setItem(STORAGE_KEYS.LOGS, 'not valid json');

            const result = getStorageItem(STORAGE_KEYS.LOGS, testSchema);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Parse error');
        });
    });

    describe('setStorageItem', () => {
        it('stores data successfully', () => {
            const data = { key: 'value' };
            const result = setStorageItem(STORAGE_KEYS.LOGS, data);

            expect(result.success).toBe(true);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                STORAGE_KEYS.LOGS,
                JSON.stringify(data)
            );
        });

        it('handles quota exceeded error', () => {
            const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
            localStorageMock.setItem.mockImplementationOnce(() => { throw quotaError; });

            const result = setStorageItem(STORAGE_KEYS.LOGS, { large: 'data' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage quota exceeded');
        });

        it('handles other write errors', () => {
            localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Unknown error'); });

            const result = setStorageItem(STORAGE_KEYS.LOGS, { data: 'test' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Write error');
        });
    });

    describe('removeStorageItem', () => {
        it('removes item successfully', () => {
            localStorageMock.setItem(STORAGE_KEYS.LOGS, 'test');
            const result = removeStorageItem(STORAGE_KEYS.LOGS);

            expect(result.success).toBe(true);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.LOGS);
        });

        it('handles removal errors', () => {
            localStorageMock.removeItem.mockImplementationOnce(() => { throw new Error('Remove failed'); });

            const result = removeStorageItem(STORAGE_KEYS.LOGS);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Remove error');
        });
    });

    describe('loadValidatedArray', () => {
        const itemSchema = z.object({
            id: z.string(),
            value: z.number(),
        });
        const arraySchema = z.array(itemSchema);

        it('returns empty array for missing key', () => {
            const result = loadValidatedArray(STORAGE_KEYS.LOGS, arraySchema, itemSchema);
            expect(result).toEqual([]);
        });

        it('parses valid array data', () => {
            const data = [
                { id: '1', value: 10 },
                { id: '2', value: 20 },
            ];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data));

            const result = loadValidatedArray(STORAGE_KEYS.LOGS, arraySchema, itemSchema);
            expect(result).toEqual(data);
        });

        it('filters out invalid items', () => {
            const data = [
                { id: '1', value: 10 },
                { id: 2, value: 'invalid' }, // Invalid - id should be string, value should be number
                { id: '3', value: 30 },
            ];
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data));

            const result = loadValidatedArray(STORAGE_KEYS.LOGS, arraySchema, itemSchema);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('3');
        });

        it('returns empty array for non-array data', () => {
            localStorageMock.setItem(STORAGE_KEYS.LOGS, JSON.stringify({ not: 'array' }));

            const result = loadValidatedArray(STORAGE_KEYS.LOGS, arraySchema, itemSchema);
            expect(result).toEqual([]);
        });

        it('returns empty array for invalid JSON', () => {
            localStorageMock.setItem(STORAGE_KEYS.LOGS, 'not json');

            const result = loadValidatedArray(STORAGE_KEYS.LOGS, arraySchema, itemSchema);
            expect(result).toEqual([]);
        });
    });
});
