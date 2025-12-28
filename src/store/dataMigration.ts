/**
 * Data Migration Utility
 *
 * Handles schema migrations for localStorage data.
 * Version 1 → 2: Migrate Norwegian display strings to i18n keys
 */

import { STORAGE_KEYS } from '../constants/storage';
import {
    migrateSensoryTrigger,
    migrateContextTrigger,
    migrateStrategy,
    migrateWarningSign,
    isLegacyValue,
} from '../utils/i18nMigration';

// Schema version tracking
export const CURRENT_SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'kreativium_schema_version';

/**
 * Get the current stored schema version
 */
function getStoredSchemaVersion(): number {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    return version ? parseInt(version, 10) : 1;
}

/**
 * Set the schema version in localStorage
 */
function setSchemaVersion(version: number): void {
    localStorage.setItem(SCHEMA_VERSION_KEY, version.toString());
}

/**
 * Migrate a single log entry from legacy Norwegian to keys
 */
function migrateLogEntry(entry: Record<string, unknown>): Record<string, unknown> {
    const migrated = { ...entry };

    // Migrate sensory triggers
    if (Array.isArray(entry.sensoryTriggers)) {
        migrated.sensoryTriggers = entry.sensoryTriggers.map((t: string) =>
            migrateSensoryTrigger(t)
        );
    }

    // Migrate context triggers
    if (Array.isArray(entry.contextTriggers)) {
        migrated.contextTriggers = entry.contextTriggers.map((t: string) =>
            migrateContextTrigger(t)
        );
    }

    // Migrate strategies used
    if (Array.isArray(entry.strategies)) {
        migrated.strategies = entry.strategies.map((s: string) =>
            migrateStrategy(s)
        );
    }

    return migrated;
}

/**
 * Migrate a single crisis event from legacy Norwegian to keys
 */
function migrateCrisisEvent(event: Record<string, unknown>): Record<string, unknown> {
    const migrated = { ...event };

    // Migrate triggers
    if (Array.isArray(event.triggers)) {
        migrated.triggers = event.triggers.map((t: string) => {
            // Try sensory first, then context
            if (isLegacyValue(t)) {
                const sensory = migrateSensoryTrigger(t);
                if (sensory !== 'auditory' || t === 'Auditiv') return sensory;
                return migrateContextTrigger(t);
            }
            return t;
        });
    }

    // Migrate warning signs observed
    if (Array.isArray(event.warningSignsObserved)) {
        migrated.warningSignsObserved = event.warningSignsObserved.map((w: string) =>
            migrateWarningSign(w)
        );
    }

    // Migrate resolution strategies
    if (Array.isArray(event.resolutionStrategies)) {
        migrated.resolutionStrategies = event.resolutionStrategies.map((s: string) =>
            migrateStrategy(s)
        );
    }

    return migrated;
}

/**
 * Migrate child profile from legacy Norwegian to keys
 */
function migrateChildProfile(profile: Record<string, unknown>): Record<string, unknown> {
    const migrated = { ...profile };

    // Migrate sensory sensitivities
    if (Array.isArray(profile.sensorySensitivities)) {
        migrated.sensorySensitivities = profile.sensorySensitivities.map((s: string) =>
            migrateSensoryTrigger(s)
        );
    }

    // Migrate seeking sensory behaviors
    if (Array.isArray(profile.seekingSensory)) {
        migrated.seekingSensory = profile.seekingSensory.map((s: string) =>
            migrateSensoryTrigger(s)
        );
    }

    // Migrate effective strategies
    if (Array.isArray(profile.effectiveStrategies)) {
        migrated.effectiveStrategies = profile.effectiveStrategies.map((s: string) =>
            migrateStrategy(s)
        );
    }

    return migrated;
}

/**
 * Migrate logs from localStorage
 */
function migrateLogs(): void {
    try {
        const logsJson = localStorage.getItem(STORAGE_KEYS.LOGS);
        if (!logsJson) return;

        const logs = JSON.parse(logsJson);
        if (!Array.isArray(logs)) return;

        // Check if any logs need migration
        const needsMigration = logs.some((log: Record<string, unknown>) => {
            const triggers = [
                ...(Array.isArray(log.sensoryTriggers) ? log.sensoryTriggers : []),
                ...(Array.isArray(log.contextTriggers) ? log.contextTriggers : []),
            ];
            return triggers.some((t: string) => isLegacyValue(t));
        });

        if (!needsMigration) return;

        const migratedLogs = logs.map(migrateLogEntry);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(migratedLogs));

        if (import.meta.env.DEV) {
            console.log('[Migration] Migrated', logs.length, 'log entries to i18n keys');
        }
    } catch (error) {
        console.error('[Migration] Failed to migrate logs:', error);
    }
}

/**
 * Migrate crisis events from localStorage
 */
function migrateCrisisEvents(): void {
    try {
        const eventsJson = localStorage.getItem(STORAGE_KEYS.CRISIS_EVENTS);
        if (!eventsJson) return;

        const events = JSON.parse(eventsJson);
        if (!Array.isArray(events)) return;

        // Check if any events need migration
        const needsMigration = events.some((event: Record<string, unknown>) => {
            const allValues = [
                ...(Array.isArray(event.triggers) ? event.triggers : []),
                ...(Array.isArray(event.warningSignsObserved) ? event.warningSignsObserved : []),
                ...(Array.isArray(event.resolutionStrategies) ? event.resolutionStrategies : []),
            ];
            return allValues.some((v: string) => isLegacyValue(v));
        });

        if (!needsMigration) return;

        const migratedEvents = events.map(migrateCrisisEvent);
        localStorage.setItem(STORAGE_KEYS.CRISIS_EVENTS, JSON.stringify(migratedEvents));

        if (import.meta.env.DEV) {
            console.log('[Migration] Migrated', events.length, 'crisis events to i18n keys');
        }
    } catch (error) {
        console.error('[Migration] Failed to migrate crisis events:', error);
    }
}

/**
 * Migrate child profile from localStorage
 */
function migrateChildProfileData(): void {
    try {
        const profileJson = localStorage.getItem(STORAGE_KEYS.CHILD_PROFILE);
        if (!profileJson) return;

        const profile = JSON.parse(profileJson);
        if (!profile || typeof profile !== 'object') return;

        // Check if profile needs migration
        const allValues = [
            ...(Array.isArray(profile.sensorySensitivities) ? profile.sensorySensitivities : []),
            ...(Array.isArray(profile.seekingSensory) ? profile.seekingSensory : []),
            ...(Array.isArray(profile.effectiveStrategies) ? profile.effectiveStrategies : []),
        ];

        const needsMigration = allValues.some((v: string) => isLegacyValue(v));
        if (!needsMigration) return;

        const migratedProfile = migrateChildProfile(profile);
        localStorage.setItem(STORAGE_KEYS.CHILD_PROFILE, JSON.stringify(migratedProfile));

        if (import.meta.env.DEV) {
            console.log('[Migration] Migrated child profile to i18n keys');
        }
    } catch (error) {
        console.error('[Migration] Failed to migrate child profile:', error);
    }
}

/**
 * Run all migrations
 * Called once at app startup before React renders
 */
export function runDataMigrations(): void {
    const storedVersion = getStoredSchemaVersion();

    if (storedVersion >= CURRENT_SCHEMA_VERSION) {
        return; // Already up to date
    }

    if (import.meta.env.DEV) {
        console.log('[Migration] Starting migration from v' + storedVersion + ' to v' + CURRENT_SCHEMA_VERSION);
    }

    // Version 1 → 2: Migrate Norwegian strings to i18n keys
    if (storedVersion < 2) {
        migrateLogs();
        migrateCrisisEvents();
        migrateChildProfileData();
    }

    // Update the stored version
    setSchemaVersion(CURRENT_SCHEMA_VERSION);

    if (import.meta.env.DEV) {
        console.log('[Migration] Migration complete');
    }
}
