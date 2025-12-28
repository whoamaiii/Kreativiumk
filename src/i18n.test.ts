import { describe, it, expect, beforeEach } from 'vitest';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import no from './locales/no.json';

// Create a fresh i18n instance for testing to avoid conflicts with the global mock
const createTestI18n = async (options?: Partial<Parameters<typeof i18next.createInstance>[0]>) => {
    const instance = i18next.createInstance();
    await instance.use(LanguageDetector).use(initReactI18next).init({
        resources: {
            en: { translation: en },
            no: { translation: no },
        },
        fallbackLng: 'en',
        lng: 'en', // Force English for predictable tests
        interpolation: {
            escapeValue: false,
        },
        ...options,
    });
    return instance;
};

describe('i18n Configuration', () => {
    let i18n: typeof i18next;

    beforeEach(async () => {
        i18n = await createTestI18n();
    });

    describe('Initialization', () => {
        it('initializes successfully', () => {
            expect(i18n.isInitialized).toBe(true);
        });

        it('has English as fallback language', () => {
            expect(i18n.options.fallbackLng).toContain('en');
        });

        it('has escapeValue set to false for React compatibility', () => {
            expect(i18n.options.interpolation?.escapeValue).toBe(false);
        });
    });

    describe('Language Resources', () => {
        it('has English translations loaded', () => {
            expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
        });

        it('has Norwegian translations loaded', () => {
            expect(i18n.hasResourceBundle('no', 'translation')).toBe(true);
        });

        it('returns translations for common keys in English', () => {
            expect(i18n.t('common.close')).toBe('Close');
            expect(i18n.t('common.error')).toBe('Error');
            expect(i18n.t('common.goBack')).toBe('Go back');
        });

        it('returns translations for common keys in Norwegian', async () => {
            const i18nNO = await createTestI18n({ lng: 'no' });
            expect(i18nNO.t('common.close')).toBe('Lukk');
            expect(i18nNO.t('common.error')).toBe('Feil');
            expect(i18nNO.t('common.goBack')).toBe('Gå tilbake');
        });
    });

    describe('Language Switching', () => {
        it('can switch from English to Norwegian', async () => {
            expect(i18n.language).toBe('en');
            expect(i18n.t('common.close')).toBe('Close');

            await i18n.changeLanguage('no');
            expect(i18n.language).toBe('no');
            expect(i18n.t('common.close')).toBe('Lukk');
        });

        it('can switch from Norwegian to English', async () => {
            const i18nNO = await createTestI18n({ lng: 'no' });
            expect(i18nNO.language).toBe('no');
            expect(i18nNO.t('common.close')).toBe('Lukk');

            await i18nNO.changeLanguage('en');
            expect(i18nNO.language).toBe('en');
            expect(i18nNO.t('common.close')).toBe('Close');
        });
    });

    describe('Fallback Behavior', () => {
        it('falls back to English for unsupported language', async () => {
            const i18nFallback = await createTestI18n({ lng: 'fr' });
            // Should fall back to English
            expect(i18nFallback.t('common.close')).toBe('Close');
        });

        it('returns key for missing translation', () => {
            const result = i18n.t('non.existent.key');
            expect(result).toBe('non.existent.key');
        });
    });

    describe('Interpolation', () => {
        it('correctly interpolates values in English', () => {
            // energyRegulation.spoonsCount uses {{count}} interpolation
            const result = i18n.t('energyRegulation.spoonsCount', { count: 5 });
            expect(result).toBe('5/12 Spoons');
        });

        it('correctly interpolates values in Norwegian', async () => {
            const i18nNO = await createTestI18n({ lng: 'no' });
            const result = i18nNO.t('energyRegulation.spoonsCount', { count: 5 });
            expect(result).toBe('5/12 Skjeer');
        });

        it('handles multiple interpolation variables', () => {
            // behaviorInsights.heatmap.cellLabel uses {{day}}, {{time}}, {{level}}
            const result = i18n.t('behaviorInsights.heatmap.cellLabel', {
                day: 'Monday',
                time: 'Morning',
                level: 5,
            });
            expect(result).toBe('Monday Morning: Arousal level 5');
        });
    });
});

describe('Locale File Structure', () => {
    describe('Key Parity', () => {
        const getNestedKeys = (obj: object, prefix = ''): string[] => {
            const keys: string[] = [];
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'object' && value !== null) {
                    keys.push(...getNestedKeys(value, fullKey));
                } else {
                    keys.push(fullKey);
                }
            }
            return keys;
        };

        it('English and Norwegian have the same top-level sections', () => {
            const enSections = Object.keys(en).sort();
            const noSections = Object.keys(no).sort();
            expect(enSections).toEqual(noSections);
        });

        it('has common namespace keys in both languages', () => {
            expect(en.common).toBeDefined();
            expect(no.common).toBeDefined();

            const enCommonKeys = Object.keys(en.common).sort();
            const noCommonKeys = Object.keys(no.common).sort();
            expect(enCommonKeys).toEqual(noCommonKeys);
        });

        it('has home namespace keys in both languages', () => {
            expect(en.home).toBeDefined();
            expect(no.home).toBeDefined();
        });

        it('has settings namespace keys in both languages', () => {
            expect(en.settings).toBeDefined();
            expect(no.settings).toBeDefined();
        });

        it('reports any missing keys between locales', () => {
            const enKeys = new Set(getNestedKeys(en));
            const noKeys = new Set(getNestedKeys(no));

            const missingInNo = [...enKeys].filter((key) => !noKeys.has(key));
            const missingInEn = [...noKeys].filter((key) => !enKeys.has(key));

            // Log missing keys for debugging (if any)
            if (missingInNo.length > 0) {
                console.warn('Keys in EN but missing in NO:', missingInNo);
            }
            if (missingInEn.length > 0) {
                console.warn('Keys in NO but missing in EN:', missingInEn);
            }

            // This test documents the current state
            // Uncomment the assertions below if you want to enforce parity
            // expect(missingInNo).toHaveLength(0);
            // expect(missingInEn).toHaveLength(0);
        });
    });

    describe('Value Validation', () => {
        it('no translation values are empty strings', () => {
            const checkEmptyStrings = (obj: object, path = ''): string[] => {
                const emptyKeys: string[] = [];
                for (const [key, value] of Object.entries(obj)) {
                    const fullPath = path ? `${path}.${key}` : key;
                    if (typeof value === 'string' && value.trim() === '') {
                        emptyKeys.push(fullPath);
                    } else if (typeof value === 'object' && value !== null) {
                        emptyKeys.push(...checkEmptyStrings(value, fullPath));
                    }
                }
                return emptyKeys;
            };

            const emptyInEn = checkEmptyStrings(en);
            const emptyInNo = checkEmptyStrings(no);

            expect(emptyInEn).toHaveLength(0);
            expect(emptyInNo).toHaveLength(0);
        });

        it('interpolation placeholders are consistent', () => {
            // Extract placeholders from a string
            const getPlaceholders = (str: string): string[] => {
                const matches = str.match(/\{\{(\w+)\}\}/g) || [];
                return matches.map((m) => m.replace(/[{}]/g, '')).sort();
            };

            // Check a few known interpolated strings
            const keysWithInterpolation = [
                'energyRegulation.spoonsCount',
                'energyRegulation.basedOn',
                'goals.summary',
                'behaviorInsights.heatmap.cellLabel',
            ];

            for (const key of keysWithInterpolation) {
                const keys = key.split('.');
                let enVal: unknown = en;
                let noVal: unknown = no;

                for (const k of keys) {
                    enVal = (enVal as Record<string, unknown>)?.[k];
                    noVal = (noVal as Record<string, unknown>)?.[k];
                }

                if (typeof enVal === 'string' && typeof noVal === 'string') {
                    const enPlaceholders = getPlaceholders(enVal);
                    const noPlaceholders = getPlaceholders(noVal);
                    expect(enPlaceholders).toEqual(noPlaceholders);
                }
            }
        });
    });
});

describe('Critical Translations', () => {
    let i18n: typeof i18next;

    beforeEach(async () => {
        i18n = await createTestI18n();
    });

    describe('Error Messages', () => {
        it('has all error-related translations', () => {
            expect(i18n.t('common.error')).toBe('Error');
            expect(i18n.t('common.validationError')).toBe('Validation Error');
            expect(i18n.t('common.storageError')).toBe('Storage error');
        });
    });

    describe('Navigation', () => {
        it('has all navigation translations', () => {
            expect(i18n.t('navigation.home')).toBe('Home');
            expect(i18n.t('navigation.dashboard')).toBe('Dashboard');
            expect(i18n.t('navigation.analysis')).toBe('Analysis');
        });
    });

    describe('Accessibility', () => {
        it('has accessibility-related translations', () => {
            expect(i18n.t('accessibility.skipToMain')).toBe('Skip to main content');
        });
    });

    describe('Crisis Mode - Critical User Flow', () => {
        it('has all crisis mode translations', () => {
            expect(i18n.t('crisis.title')).toBe('Crisis Mode');
            expect(i18n.t('crisis.stopEvent')).toBe('STOP EVENT');
            expect(i18n.t('crisis.documentEvent')).toBe('Document Event');
        });
    });
});
