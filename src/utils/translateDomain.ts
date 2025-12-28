import i18n from 'i18next';
import {
    SENSORY_TRIGGER_KEYS,
    CONTEXT_TRIGGER_KEYS,
    STRATEGY_KEYS,
    WARNING_SIGN_KEYS,
    type SensoryTriggerKey,
    type ContextTriggerKey,
    type StrategyKey,
    type WarningSignKey,
} from './i18nMigration';

/**
 * Translates domain-specific terms (triggers, strategies, warning signs) to the current language.
 * Supports both new key-based values (auditory, demands, etc.) and legacy Norwegian strings.
 * Falls back to the original value if no translation is found.
 */

/**
 * Translate a sensory trigger key to the current language
 */
export function translateSensoryTrigger(key: SensoryTriggerKey | string): string {
    // Try new key-based translation first
    if (SENSORY_TRIGGER_KEYS.includes(key as SensoryTriggerKey)) {
        const translationKey = `domain.sensory.${key}`;
        const translated = i18n.t(translationKey);
        if (translated !== translationKey) return translated;
    }

    // Try legacy Norwegian string translation
    const legacyKey = `domain.legacy.${key}`;
    const legacyTranslated = i18n.t(legacyKey);
    if (legacyTranslated !== legacyKey) return legacyTranslated;

    // Fallback to original value
    return key;
}

/**
 * Translate a context trigger key to the current language
 */
export function translateContextTrigger(key: ContextTriggerKey | string): string {
    // Try new key-based translation first
    if (CONTEXT_TRIGGER_KEYS.includes(key as ContextTriggerKey)) {
        const translationKey = `domain.context.${key}`;
        const translated = i18n.t(translationKey);
        if (translated !== translationKey) return translated;
    }

    // Try legacy Norwegian string translation
    const legacyKey = `domain.legacy.${key}`;
    const legacyTranslated = i18n.t(legacyKey);
    if (legacyTranslated !== legacyKey) return legacyTranslated;

    // Fallback to original value
    return key;
}

/**
 * Translate any trigger (sensory or context) - tries both
 */
export function translateTrigger(trigger: string): string {
    // Try sensory first
    if (SENSORY_TRIGGER_KEYS.includes(trigger as SensoryTriggerKey)) {
        return translateSensoryTrigger(trigger);
    }

    // Try context
    if (CONTEXT_TRIGGER_KEYS.includes(trigger as ContextTriggerKey)) {
        return translateContextTrigger(trigger);
    }

    // Try legacy
    const legacyKey = `domain.legacy.${trigger}`;
    const legacyTranslated = i18n.t(legacyKey);
    if (legacyTranslated !== legacyKey) return legacyTranslated;

    // Fallback
    return trigger;
}

/**
 * Translate a strategy key to the current language
 */
export function translateStrategy(key: StrategyKey | string): string {
    // Try new key-based translation first
    if (STRATEGY_KEYS.includes(key as StrategyKey)) {
        const translationKey = `domain.strategies.${key}`;
        const translated = i18n.t(translationKey);
        if (translated !== translationKey) return translated;
    }

    // Try legacy Norwegian string translation
    const legacyKey = `domain.legacy.${key}`;
    const legacyTranslated = i18n.t(legacyKey);
    if (legacyTranslated !== legacyKey) return legacyTranslated;

    // Fallback to original value
    return key;
}

/**
 * Translate a warning sign key to the current language
 */
export function translateWarningSign(key: WarningSignKey | string): string {
    // Try new key-based translation first
    if (WARNING_SIGN_KEYS.includes(key as WarningSignKey)) {
        const translationKey = `domain.warningSigns.${key}`;
        const translated = i18n.t(translationKey);
        if (translated !== translationKey) return translated;
    }

    // Try legacy Norwegian string translation
    const legacyKey = `domain.legacy.${key}`;
    const legacyTranslated = i18n.t(legacyKey);
    if (legacyTranslated !== legacyKey) return legacyTranslated;

    // Fallback to original value
    return key;
}

/**
 * Translates an array of triggers/strategies/warning signs
 */
export function translateTriggers(triggers: string[]): string[] {
    return triggers.map(translateTrigger);
}

export function translateSensoryTriggers(triggers: string[]): string[] {
    return triggers.map(translateSensoryTrigger);
}

export function translateContextTriggers(triggers: string[]): string[] {
    return triggers.map(translateContextTrigger);
}

export function translateStrategies(strategies: string[]): string[] {
    return strategies.map(translateStrategy);
}

export function translateWarningSigns(signs: string[]): string[] {
    return signs.map(translateWarningSign);
}
