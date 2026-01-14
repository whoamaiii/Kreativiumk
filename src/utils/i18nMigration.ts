/**
 * i18n Migration Utility
 *
 * Maps legacy Norwegian display strings to translation keys.
 * Used for backwards compatibility when migrating stored data.
 */

// Type for i18next translation function - uses generic to accept TFunction from i18next
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- i18next TFunction has complex overloads
type TranslationFunction = (...args: any[]) => any;

// ============================================
// SENSORY TRIGGERS
// ============================================
export const SENSORY_TRIGGER_KEYS = [
    'auditory', 'visual', 'tactile', 'vestibular', 'interoception',
    'smell', 'taste', 'light', 'temperature', 'crowding'
] as const;

export type SensoryTriggerKey = typeof SENSORY_TRIGGER_KEYS[number];

export const LEGACY_SENSORY_TRIGGER_MAP: Record<string, SensoryTriggerKey> = {
    'Auditiv': 'auditory',
    'Visuell': 'visual',
    'Taktil': 'tactile',
    'Vestibulær': 'vestibular',
    'Interosepsjon': 'interoception',
    'Lukt': 'smell',
    'Smak': 'taste',
    'Lys': 'light',
    'Temperatur': 'temperature',
    'Trengsel': 'crowding',
};

// ============================================
// CONTEXT TRIGGERS
// ============================================
export const CONTEXT_TRIGGER_KEYS = [
    'demands', 'transition', 'social', 'unexpected_event', 'tired',
    'hungry', 'waiting', 'group_work', 'test', 'new_situation'
] as const;

export type ContextTriggerKey = typeof CONTEXT_TRIGGER_KEYS[number];

export const LEGACY_CONTEXT_TRIGGER_MAP: Record<string, ContextTriggerKey> = {
    'Krav': 'demands',
    'Overgang': 'transition',
    'Sosialt': 'social',
    'Uventet Hendelse': 'unexpected_event',
    'Sliten': 'tired',
    'Sult': 'hungry',
    'Ventetid': 'waiting',
    'Gruppearbeid': 'group_work',
    'Prøve/Test': 'test',
    'Ny Situasjon': 'new_situation',
};

// ============================================
// STRATEGIES
// ============================================
export const STRATEGY_KEYS = [
    'shielding', 'deep_pressure', 'co_regulation', 'breathing', 'own_room',
    'weighted_blanket', 'headphones', 'fidget', 'movement', 'dark_room',
    'familiar_activity', 'music', 'timer_visual_support'
] as const;

export type StrategyKey = typeof STRATEGY_KEYS[number];

export const LEGACY_STRATEGY_MAP: Record<string, StrategyKey> = {
    'Skjerming': 'shielding',
    'Dypt Trykk': 'deep_pressure',
    'Samregulering': 'co_regulation',
    'Pusting': 'breathing',
    'Eget Rom': 'own_room',
    'Vektteppe': 'weighted_blanket',
    'Hodetelefoner': 'headphones',
    'Fidget': 'fidget',
    'Bevegelse': 'movement',
    'Mørkt Rom': 'dark_room',
    'Kjent Aktivitet': 'familiar_activity',
    'Musikk': 'music',
    'Timer/Visuell Støtte': 'timer_visual_support',
};

// ============================================
// WARNING SIGNS
// ============================================
export const WARNING_SIGN_KEYS = [
    'motor_restlessness', 'verbal_escalation', 'withdrawal',
    'repetitive_movements', 'covers_ears', 'avoids_eye_contact',
    'flushing_sweating', 'clinging', 'refuses_instructions', 'crying'
] as const;

export type WarningSignKey = typeof WARNING_SIGN_KEYS[number];

export const LEGACY_WARNING_SIGN_MAP: Record<string, WarningSignKey> = {
    'Økt motorisk uro': 'motor_restlessness',
    'Verbal eskalering': 'verbal_escalation',
    'Tilbaketrekning': 'withdrawal',
    'Repetitive bevegelser': 'repetitive_movements',
    'Dekker ører': 'covers_ears',
    'Unngår øyekontakt': 'avoids_eye_contact',
    'Rødme/svetting': 'flushing_sweating',
    'Klamrer seg': 'clinging',
    'Nekter instrukser': 'refuses_instructions',
    'Gråt': 'crying',
};

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Migrate a sensory trigger from legacy Norwegian to key
 */
export function migrateSensoryTrigger(value: string): SensoryTriggerKey {
    if (SENSORY_TRIGGER_KEYS.includes(value as SensoryTriggerKey)) {
        return value as SensoryTriggerKey;
    }
    return LEGACY_SENSORY_TRIGGER_MAP[value] ?? 'auditory';
}

/**
 * Migrate a context trigger from legacy Norwegian to key
 */
export function migrateContextTrigger(value: string): ContextTriggerKey {
    if (CONTEXT_TRIGGER_KEYS.includes(value as ContextTriggerKey)) {
        return value as ContextTriggerKey;
    }
    return LEGACY_CONTEXT_TRIGGER_MAP[value] ?? 'demands';
}

/**
 * Migrate a strategy from legacy Norwegian to key
 */
export function migrateStrategy(value: string): StrategyKey {
    if (STRATEGY_KEYS.includes(value as StrategyKey)) {
        return value as StrategyKey;
    }
    return LEGACY_STRATEGY_MAP[value] ?? 'shielding';
}

/**
 * Migrate a warning sign from legacy Norwegian to key
 */
export function migrateWarningSign(value: string): WarningSignKey {
    if (WARNING_SIGN_KEYS.includes(value as WarningSignKey)) {
        return value as WarningSignKey;
    }
    return LEGACY_WARNING_SIGN_MAP[value] ?? 'motor_restlessness';
}

/**
 * Check if a value is a legacy Norwegian trigger/strategy
 */
export function isLegacyValue(value: string): boolean {
    return (
        value in LEGACY_SENSORY_TRIGGER_MAP ||
        value in LEGACY_CONTEXT_TRIGGER_MAP ||
        value in LEGACY_STRATEGY_MAP ||
        value in LEGACY_WARNING_SIGN_MAP
    );
}

// ============================================
// REVERSE MAPPING (for backwards compat display)
// ============================================

export const KEY_TO_LEGACY_SENSORY: Record<SensoryTriggerKey, string> = Object.fromEntries(
    Object.entries(LEGACY_SENSORY_TRIGGER_MAP).map(([k, v]) => [v, k])
) as Record<SensoryTriggerKey, string>;

export const KEY_TO_LEGACY_CONTEXT: Record<ContextTriggerKey, string> = Object.fromEntries(
    Object.entries(LEGACY_CONTEXT_TRIGGER_MAP).map(([k, v]) => [v, k])
) as Record<ContextTriggerKey, string>;

export const KEY_TO_LEGACY_STRATEGY: Record<StrategyKey, string> = Object.fromEntries(
    Object.entries(LEGACY_STRATEGY_MAP).map(([k, v]) => [v, k])
) as Record<StrategyKey, string>;

export const KEY_TO_LEGACY_WARNING: Record<WarningSignKey, string> = Object.fromEntries(
    Object.entries(LEGACY_WARNING_SIGN_MAP).map(([k, v]) => [v, k])
) as Record<WarningSignKey, string>;

// ============================================
// LABEL GETTERS (for display purposes)
// ============================================

/**
 * Get display label for a sensory trigger key
 * Optionally uses i18n translation function if provided
 */
export function getSensoryTriggerLabel(key: string, t?: TranslationFunction): string {
    // Try i18n key if translation function provided
    if (t && typeof t === 'function') {
        const i18nKey = `sensoryTriggers.${key}`;
        const translated = t(i18nKey, '');
        if (translated && translated !== i18nKey) {
            return translated;
        }
    }

    if (key in KEY_TO_LEGACY_SENSORY) {
        return KEY_TO_LEGACY_SENSORY[key as SensoryTriggerKey];
    }
    // Already a Norwegian legacy value
    if (key in LEGACY_SENSORY_TRIGGER_MAP) {
        return key;
    }
    return key;
}

/**
 * Get display label for a context trigger key
 * Optionally uses i18n translation function if provided
 */
export function getContextTriggerLabel(key: string, t?: TranslationFunction): string {
    // Try i18n key if translation function provided
    if (t && typeof t === 'function') {
        const i18nKey = `contextTriggers.${key}`;
        const translated = t(i18nKey, '');
        if (translated && translated !== i18nKey) {
            return translated;
        }
    }

    if (key in KEY_TO_LEGACY_CONTEXT) {
        return KEY_TO_LEGACY_CONTEXT[key as ContextTriggerKey];
    }
    // Already a Norwegian legacy value
    if (key in LEGACY_CONTEXT_TRIGGER_MAP) {
        return key;
    }
    return key;
}

/**
 * Get display label for a strategy key
 * Optionally uses i18n translation function if provided
 */
export function getStrategyLabel(key: string, t?: TranslationFunction): string {
    // Try i18n key if translation function provided
    if (t && typeof t === 'function') {
        const i18nKey = `strategies.${key}`;
        const translated = t(i18nKey, '');
        if (translated && translated !== i18nKey) {
            return translated;
        }
    }

    if (key in KEY_TO_LEGACY_STRATEGY) {
        return KEY_TO_LEGACY_STRATEGY[key as StrategyKey];
    }
    // Already a Norwegian legacy value
    if (key in LEGACY_STRATEGY_MAP) {
        return key;
    }
    return key;
}

/**
 * Get display label for a warning sign key
 * Optionally uses i18n translation function if provided
 */
export function getWarningSignLabel(key: string, t?: TranslationFunction): string {
    // Try i18n key if translation function provided
    if (t && typeof t === 'function') {
        const i18nKey = `warningSigns.${key}`;
        const translated = t(i18nKey, '');
        if (translated && translated !== i18nKey) {
            return translated;
        }
    }

    if (key in KEY_TO_LEGACY_WARNING) {
        return KEY_TO_LEGACY_WARNING[key as WarningSignKey];
    }
    // Already a Norwegian legacy value
    if (key in LEGACY_WARNING_SIGN_MAP) {
        return key;
    }
    return key;
}
