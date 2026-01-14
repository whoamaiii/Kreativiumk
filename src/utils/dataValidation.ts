/**
 * Data Validation Utilities
 * Validates log entries and detects suspicious patterns in data
 */

import type { LogEntry, CrisisEvent } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
    /** Whether the entry is valid */
    isValid: boolean;
    /** List of validation errors */
    errors: ValidationError[];
    /** List of warnings (valid but concerning) */
    warnings: ValidationWarning[];
}

export interface ValidationError {
    /** Field that failed validation */
    field: string;
    /** Error message */
    message: string;
    /** Error code for programmatic handling */
    code: string;
}

export interface ValidationWarning {
    /** Field with concerning value */
    field: string;
    /** Warning message */
    message: string;
    /** Warning code */
    code: string;
}

export interface SuspiciousPattern {
    /** Type of suspicious pattern detected */
    type: 'duplicate' | 'monotonous' | 'impossible_timestamp' | 'outlier_cluster';
    /** Description of the pattern */
    description: string;
    /** Severity: 'low' | 'medium' | 'high' */
    severity: 'low' | 'medium' | 'high';
    /** Affected entry IDs */
    affectedIds: string[];
    /** Recommendation for addressing the issue */
    recommendation: string;
}

export interface DataQualityReport {
    /** Total entries analyzed */
    totalEntries: number;
    /** Number of valid entries */
    validEntries: number;
    /** Number of entries with errors */
    errorEntries: number;
    /** Number of entries with warnings */
    warningEntries: number;
    /** Suspicious patterns detected */
    suspiciousPatterns: SuspiciousPattern[];
    /** Overall data quality score (0-100) */
    qualityScore: number;
    /** Summary message in Norwegian */
    summary: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const VALIDATION_CONFIG = {
    /** Minimum valid arousal/valence/energy value */
    minScaleValue: 1,
    /** Maximum valid arousal/valence/energy value */
    maxScaleValue: 10,
    /** Maximum age for a log entry (1 year in ms) */
    maxAgeMs: 365 * 24 * 60 * 60 * 1000,
    /** Minimum time between entries to be considered unique (5 minutes) */
    minTimeBetweenEntriesMs: 5 * 60 * 1000,
    /** Threshold for identical values to be suspicious */
    identicalValueThreshold: 10,
    /** Extreme arousal value that warrants confirmation */
    extremeArousalHigh: 10,
    /** Extreme energy value that warrants confirmation */
    extremeEnergyLow: 1,
    /** Minimum duration in minutes */
    minDuration: 1,
    /** Maximum duration in minutes (24 hours) */
    maxDuration: 24 * 60
} as const;

// =============================================================================
// LOG ENTRY VALIDATION
// =============================================================================

/**
 * Validate a single log entry
 */
export function validateLogEntry(entry: LogEntry): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field checks
    if (!entry.id || typeof entry.id !== 'string') {
        errors.push({
            field: 'id',
            message: 'ID mangler eller er ugyldig',
            code: 'MISSING_ID'
        });
    }

    if (!entry.timestamp) {
        errors.push({
            field: 'timestamp',
            message: 'Tidsstempel mangler',
            code: 'MISSING_TIMESTAMP'
        });
    } else {
        // Timestamp validation
        const entryDate = new Date(entry.timestamp);
        const now = new Date();

        if (isNaN(entryDate.getTime())) {
            errors.push({
                field: 'timestamp',
                message: 'Ugyldig tidsstempelformat',
                code: 'INVALID_TIMESTAMP_FORMAT'
            });
        } else if (entryDate > now) {
            errors.push({
                field: 'timestamp',
                message: 'Tidsstempel kan ikke være i fremtiden',
                code: 'FUTURE_TIMESTAMP'
            });
        } else if (now.getTime() - entryDate.getTime() > VALIDATION_CONFIG.maxAgeMs) {
            warnings.push({
                field: 'timestamp',
                message: 'Oppføring er over ett år gammel',
                code: 'OLD_ENTRY'
            });
        }
    }

    // Scale value validations
    const scaleFields = [
        { name: 'arousal', label: 'Aktivering' },
        { name: 'valence', label: 'Stemning' },
        { name: 'energy', label: 'Energi' }
    ];

    for (const { name, label } of scaleFields) {
        const value = entry[name as keyof LogEntry] as number | undefined;

        if (value === undefined || value === null) {
            errors.push({
                field: name,
                message: `${label} mangler`,
                code: `MISSING_${name.toUpperCase()}`
            });
        } else if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
                field: name,
                message: `${label} må være et tall`,
                code: `INVALID_${name.toUpperCase()}_TYPE`
            });
        } else if (value < VALIDATION_CONFIG.minScaleValue || value > VALIDATION_CONFIG.maxScaleValue) {
            errors.push({
                field: name,
                message: `${label} må være mellom ${VALIDATION_CONFIG.minScaleValue} og ${VALIDATION_CONFIG.maxScaleValue}`,
                code: `OUT_OF_RANGE_${name.toUpperCase()}`
            });
        }
    }

    // Extreme value warnings
    if (entry.arousal === VALIDATION_CONFIG.extremeArousalHigh) {
        warnings.push({
            field: 'arousal',
            message: 'Ekstrem aktiveringsverdi (10) registrert',
            code: 'EXTREME_AROUSAL'
        });
    }

    if (entry.energy === VALIDATION_CONFIG.extremeEnergyLow) {
        warnings.push({
            field: 'energy',
            message: 'Svært lav energi (1) registrert',
            code: 'EXTREME_ENERGY_LOW'
        });
    }

    // Duration validation (if present)
    if (entry.duration !== undefined) {
        if (typeof entry.duration !== 'number' || isNaN(entry.duration)) {
            errors.push({
                field: 'duration',
                message: 'Varighet må være et tall',
                code: 'INVALID_DURATION_TYPE'
            });
        } else if (entry.duration < VALIDATION_CONFIG.minDuration) {
            warnings.push({
                field: 'duration',
                message: 'Varighet er svært kort (under 1 minutt)',
                code: 'VERY_SHORT_DURATION'
            });
        } else if (entry.duration > VALIDATION_CONFIG.maxDuration) {
            warnings.push({
                field: 'duration',
                message: 'Varighet er uvanlig lang (over 24 timer)',
                code: 'VERY_LONG_DURATION'
            });
        }
    }

    // Array field validations
    const arrayFields = ['sensoryTriggers', 'contextTriggers', 'strategies'];
    for (const field of arrayFields) {
        const value = entry[field as keyof LogEntry];
        if (value !== undefined && !Array.isArray(value)) {
            errors.push({
                field,
                message: `${field} må være en liste`,
                code: `INVALID_${field.toUpperCase()}_TYPE`
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate a single crisis event
 */
export function validateCrisisEvent(event: CrisisEvent): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!event.id || typeof event.id !== 'string') {
        errors.push({
            field: 'id',
            message: 'ID mangler eller er ugyldig',
            code: 'MISSING_ID'
        });
    }

    if (!event.timestamp) {
        errors.push({
            field: 'timestamp',
            message: 'Tidsstempel mangler',
            code: 'MISSING_TIMESTAMP'
        });
    } else {
        const eventDate = new Date(event.timestamp);
        const now = new Date();

        if (isNaN(eventDate.getTime())) {
            errors.push({
                field: 'timestamp',
                message: 'Ugyldig tidsstempelformat',
                code: 'INVALID_TIMESTAMP_FORMAT'
            });
        } else if (eventDate > now) {
            errors.push({
                field: 'timestamp',
                message: 'Tidsstempel kan ikke være i fremtiden',
                code: 'FUTURE_TIMESTAMP'
            });
        }
    }

    // Type validation
    const validTypes = ['meltdown', 'shutdown', 'mixed'];
    if (!event.type) {
        errors.push({
            field: 'type',
            message: 'Krisetype mangler',
            code: 'MISSING_TYPE'
        });
    } else if (!validTypes.includes(event.type)) {
        errors.push({
            field: 'type',
            message: `Ugyldig krisetype: ${event.type}`,
            code: 'INVALID_TYPE'
        });
    }

    // Duration validation
    if (event.durationSeconds !== undefined) {
        if (typeof event.durationSeconds !== 'number' || event.durationSeconds < 0) {
            errors.push({
                field: 'durationSeconds',
                message: 'Varighet må være et positivt tall',
                code: 'INVALID_DURATION'
            });
        } else if (event.durationSeconds > 24 * 60 * 60) {
            warnings.push({
                field: 'durationSeconds',
                message: 'Krisens varighet er uvanlig lang (over 24 timer)',
                code: 'VERY_LONG_CRISIS'
            });
        }
    }

    // Peak intensity validation
    if (event.peakIntensity !== undefined) {
        if (typeof event.peakIntensity !== 'number' ||
            event.peakIntensity < VALIDATION_CONFIG.minScaleValue ||
            event.peakIntensity > VALIDATION_CONFIG.maxScaleValue) {
            errors.push({
                field: 'peakIntensity',
                message: `Toppintensitet må være mellom ${VALIDATION_CONFIG.minScaleValue} og ${VALIDATION_CONFIG.maxScaleValue}`,
                code: 'INVALID_PEAK_INTENSITY'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// =============================================================================
// SUSPICIOUS PATTERN DETECTION
// =============================================================================

/**
 * Detect suspicious patterns in log entries
 */
export function detectSuspiciousPatterns(logs: LogEntry[]): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    if (logs.length < 2) {
        return patterns;
    }

    // Sort by timestamp
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 1. Check for duplicate/near-duplicate entries
    const duplicatePattern = detectDuplicates(sortedLogs);
    if (duplicatePattern) {
        patterns.push(duplicatePattern);
    }

    // 2. Check for monotonous data (identical values)
    const monotonousPattern = detectMonotonousData(sortedLogs);
    if (monotonousPattern) {
        patterns.push(monotonousPattern);
    }

    // 3. Check for impossible timestamps
    const timestampPattern = detectImpossibleTimestamps(sortedLogs);
    if (timestampPattern) {
        patterns.push(timestampPattern);
    }

    // 4. Check for outlier clusters
    const outlierPattern = detectOutlierClusters(sortedLogs);
    if (outlierPattern) {
        patterns.push(outlierPattern);
    }

    return patterns;
}

/**
 * Detect entries that appear to be duplicates (same values within 5 minutes)
 */
function detectDuplicates(sortedLogs: LogEntry[]): SuspiciousPattern | null {
    const duplicateGroups: string[][] = [];

    for (let i = 0; i < sortedLogs.length - 1; i++) {
        const current = sortedLogs[i];
        const next = sortedLogs[i + 1];

        const timeDiff = Math.abs(
            new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()
        );

        const valuesMatch = current.arousal === next.arousal &&
            current.valence === next.valence &&
            current.energy === next.energy;

        if (timeDiff < VALIDATION_CONFIG.minTimeBetweenEntriesMs && valuesMatch) {
            // Find or create a group for these duplicates
            const existingGroup = duplicateGroups.find(g => g.includes(current.id));
            if (existingGroup) {
                if (!existingGroup.includes(next.id)) {
                    existingGroup.push(next.id);
                }
            } else {
                duplicateGroups.push([current.id, next.id]);
            }
        }
    }

    if (duplicateGroups.length === 0) {
        return null;
    }

    const affectedIds = duplicateGroups.flat();

    return {
        type: 'duplicate',
        description: `${affectedIds.length} oppføringer ser ut til å være duplikater (identiske verdier innen 5 minutter)`,
        severity: affectedIds.length > 5 ? 'high' : 'medium',
        affectedIds,
        recommendation: 'Vurder å slette duplikate oppføringer for mer nøyaktig analyse'
    };
}

/**
 * Detect when data is suspiciously monotonous (all same values)
 */
function detectMonotonousData(sortedLogs: LogEntry[]): SuspiciousPattern | null {
    if (sortedLogs.length < VALIDATION_CONFIG.identicalValueThreshold) {
        return null;
    }

    // Check for sequences of identical values
    let currentSequence: LogEntry[] = [sortedLogs[0]];
    const monotonousSequences: LogEntry[][] = [];

    for (let i = 1; i < sortedLogs.length; i++) {
        const current = sortedLogs[i];
        const previous = sortedLogs[i - 1];

        const valuesMatch = current.arousal === previous.arousal &&
            current.valence === previous.valence &&
            current.energy === previous.energy;

        if (valuesMatch) {
            currentSequence.push(current);
        } else {
            if (currentSequence.length >= VALIDATION_CONFIG.identicalValueThreshold) {
                monotonousSequences.push([...currentSequence]);
            }
            currentSequence = [current];
        }
    }

    // Check final sequence
    if (currentSequence.length >= VALIDATION_CONFIG.identicalValueThreshold) {
        monotonousSequences.push(currentSequence);
    }

    if (monotonousSequences.length === 0) {
        return null;
    }

    const affectedIds = monotonousSequences.flat().map(l => l.id);

    return {
        type: 'monotonous',
        description: `${affectedIds.length} oppføringer har identiske verdier (arousal, valence, energi)`,
        severity: 'high',
        affectedIds,
        recommendation: 'Mange identiske verdier kan indikere at data ikke reflekterer faktiske variasjoner. Vurder datakvaliteten.'
    };
}

/**
 * Detect impossible timestamps (entries claiming to be from the future, etc.)
 */
function detectImpossibleTimestamps(sortedLogs: LogEntry[]): SuspiciousPattern | null {
    const now = new Date();
    const impossibleEntries: string[] = [];

    for (const log of sortedLogs) {
        const timestamp = new Date(log.timestamp);

        // Future timestamps
        if (timestamp > now) {
            impossibleEntries.push(log.id);
            continue;
        }

        // Very old entries (before 2020 - app didn't exist)
        if (timestamp.getFullYear() < 2020) {
            impossibleEntries.push(log.id);
        }
    }

    if (impossibleEntries.length === 0) {
        return null;
    }

    return {
        type: 'impossible_timestamp',
        description: `${impossibleEntries.length} oppføringer har ugyldige tidsstempler (fremtidige eller før 2020)`,
        severity: 'high',
        affectedIds: impossibleEntries,
        recommendation: 'Korrigér eller slett oppføringer med ugyldige tidsstempler'
    };
}

/**
 * Detect clusters of outlier values (many extreme values in short time)
 */
function detectOutlierClusters(sortedLogs: LogEntry[]): SuspiciousPattern | null {
    const extremeEntries: LogEntry[] = [];

    // Find entries with extreme values
    for (const log of sortedLogs) {
        const isExtreme =
            log.arousal === 10 ||
            log.arousal === 1 ||
            log.energy === 1 ||
            log.energy === 10;

        if (isExtreme) {
            extremeEntries.push(log);
        }
    }

    if (extremeEntries.length < 3) {
        return null;
    }

    // Check if extreme values cluster in time (more than 3 within 1 hour)
    const clusters: LogEntry[][] = [];
    let currentCluster: LogEntry[] = [extremeEntries[0]];

    for (let i = 1; i < extremeEntries.length; i++) {
        const timeDiff = Math.abs(
            new Date(extremeEntries[i].timestamp).getTime() -
            new Date(currentCluster[currentCluster.length - 1].timestamp).getTime()
        );

        if (timeDiff < 60 * 60 * 1000) { // Within 1 hour
            currentCluster.push(extremeEntries[i]);
        } else {
            if (currentCluster.length >= 3) {
                clusters.push([...currentCluster]);
            }
            currentCluster = [extremeEntries[i]];
        }
    }

    if (currentCluster.length >= 3) {
        clusters.push(currentCluster);
    }

    if (clusters.length === 0) {
        return null;
    }

    const affectedIds = clusters.flat().map(l => l.id);

    return {
        type: 'outlier_cluster',
        description: `${clusters.length} klynge(r) med ekstreme verdier funnet (3+ ekstreme verdier innen 1 time)`,
        severity: 'medium',
        affectedIds,
        recommendation: 'Mange ekstreme verdier tett sammen kan indikere kriseepisoder eller datainntastingsfeil. Verifiser dataene.'
    };
}

// =============================================================================
// DATA QUALITY REPORT
// =============================================================================

/**
 * Generate a comprehensive data quality report
 */
export function generateDataQualityReport(logs: LogEntry[], crisisEvents?: CrisisEvent[]): DataQualityReport {
    let validEntries = 0;
    let errorEntries = 0;
    let warningEntries = 0;

    // Validate all log entries
    for (const log of logs) {
        const result = validateLogEntry(log);
        if (result.isValid) {
            validEntries++;
        } else {
            errorEntries++;
        }
        if (result.warnings.length > 0) {
            warningEntries++;
        }
    }

    // Validate crisis events if provided
    if (crisisEvents) {
        for (const crisis of crisisEvents) {
            const result = validateCrisisEvent(crisis);
            if (!result.isValid) {
                errorEntries++;
            }
            if (result.warnings.length > 0) {
                warningEntries++;
            }
        }
    }

    // Detect suspicious patterns
    const suspiciousPatterns = detectSuspiciousPatterns(logs);

    // Calculate quality score
    const totalEntries = logs.length + (crisisEvents?.length || 0);
    let qualityScore = 100;

    if (totalEntries > 0) {
        // Deduct for errors (up to -50 points)
        const errorRatio = errorEntries / totalEntries;
        qualityScore -= Math.min(50, errorRatio * 100);

        // Deduct for warnings (up to -20 points)
        const warningRatio = warningEntries / totalEntries;
        qualityScore -= Math.min(20, warningRatio * 50);

        // Deduct for suspicious patterns (up to -30 points)
        const patternPenalty = suspiciousPatterns.reduce((acc, p) => {
            switch (p.severity) {
                case 'high': return acc + 15;
                case 'medium': return acc + 10;
                case 'low': return acc + 5;
                default: return acc;
            }
        }, 0);
        qualityScore -= Math.min(30, patternPenalty);
    }

    qualityScore = Math.max(0, Math.round(qualityScore));

    // Generate summary in Norwegian
    let summary: string;
    if (qualityScore >= 90) {
        summary = 'Utmerket datakvalitet. Dataene er pålitelige for analyse.';
    } else if (qualityScore >= 70) {
        summary = 'God datakvalitet med noen advarsler. Vurder å gjennomgå flaggede oppføringer.';
    } else if (qualityScore >= 50) {
        summary = 'Moderat datakvalitet. Flere problemer ble funnet som kan påvirke analysenøyaktigheten.';
    } else {
        summary = 'Lav datakvalitet. Betydelige problemer ble funnet. Analyseresultater kan være upålitelige.';
    }

    return {
        totalEntries,
        validEntries,
        errorEntries,
        warningEntries,
        suspiciousPatterns,
        qualityScore,
        summary
    };
}

/**
 * Quick validation check - returns true if entry passes basic validation
 */
export function isValidEntry(entry: LogEntry): boolean {
    return validateLogEntry(entry).isValid;
}

/**
 * Filter out invalid entries from a list
 */
export function filterValidEntries(logs: LogEntry[]): LogEntry[] {
    return logs.filter(isValidEntry);
}

/**
 * Get a list of entries that need attention (errors or warnings)
 */
export function getEntriesNeedingAttention(logs: LogEntry[]): Array<{ entry: LogEntry; result: ValidationResult }> {
    return logs
        .map(entry => ({ entry, result: validateLogEntry(entry) }))
        .filter(({ result }) => !result.isValid || result.warnings.length > 0);
}
