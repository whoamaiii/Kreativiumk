import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        useReducedMotion: () => true, // Always prefer reduced motion in tests
    };
});

// Mock react-i18next with withTranslation HOC
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | object) => {
            if (typeof fallback === 'object' && fallback !== null) {
                return key;
            }
            return typeof fallback === 'string' ? fallback : key;
        },
        i18n: {
            language: 'no',
            changeLanguage: vi.fn(),
        },
    }),
    withTranslation: () => <T extends React.ComponentType<unknown>>(Component: T) => Component,
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
        type: '3rdParty',
        init: vi.fn(),
    },
}));

// Mock localStorage for tests with dynamic length property
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};

    const mock = {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };

    // Make length a getter that dynamically returns the store size
    Object.defineProperty(mock, 'length', {
        get: () => Object.keys(store).length,
        enumerable: true,
        configurable: true
    });

    return mock;
};

const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock crypto.randomUUID for generating valid test UUIDs
// Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
Object.defineProperty(crypto, 'randomUUID', {
    value: vi.fn(() => {
        // Generate a valid UUID v4 format
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }),
});
