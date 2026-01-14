/**
 * AI Insight Validation Layer
 * Validates AI-generated claims against computed statistics to detect hallucinations
 * Adds data citations to provide transparency about insight reliability
 */

import type { LogEntry, CrisisEvent, AnalysisResult } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ComputedStatistics {
    /** Total number of logs analyzed */
    logCount: number;
    /** Total number of crisis events analyzed */
    crisisCount: number;
    /** Average arousal level */
    avgArousal: number;
    /** Average energy level */
    avgEnergy: number;
    /** Average valence level */
    avgValence: number;
    /** Percentage of logs with high arousal (>=7) */
    highArousalPercentage: number;
    /** Percentage of logs with low energy (<=3) */
    lowEnergyPercentage: number;
    /** Trigger frequencies as percentages */
    triggerPercentages: Record<string, number>;
    /** Strategy effectiveness rates */
    strategyEffectiveness: Record<string, { successRate: number; usageCount: number }>;
    /** Context distribution */
    contextPercentages: { home: number; school: number };
    /** Average crisis duration in minutes */
    avgCrisisDuration?: number;
    /** Average recovery time in minutes */
    avgRecoveryTime?: number;
}

export interface ClaimValidation {
    /** The numerical claim extracted from AI response */
    claim: string;
    /** The claimed value */
    claimedValue: number;
    /** The computed actual value */
    actualValue: number;
    /** Percentage difference between claimed and actual */
    discrepancyPercent: number;
    /** Whether the claim is within acceptable tolerance */
    isValid: boolean;
    /** Category of the claim */
    category: 'percentage' | 'average' | 'count' | 'duration';
}

export interface ValidationResult {
    /** Overall validation passed */
    isValid: boolean;
    /** Total claims validated */
    totalClaims: number;
    /** Number of claims that passed validation */
    validClaims: number;
    /** Individual claim validations */
    claimValidations: ClaimValidation[];
    /** Warning messages for the user */
    warnings: string[];
    /** Computed statistics used for validation */
    computedStats: ComputedStatistics;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const VALIDATION_CONFIG = {
    /** Maximum acceptable discrepancy for percentages (e.g., 10 = 10%) */
    maxPercentageDiscrepancy: 15,
    /** Maximum acceptable discrepancy for averages (on 1-10 scale) */
    maxAverageDiscrepancy: 1.5,
    /** Maximum acceptable discrepancy for counts */
    maxCountDiscrepancy: 2,
    /** Maximum acceptable discrepancy for durations (in minutes) */
    maxDurationDiscrepancy: 10,
    /** Minimum claims that must be valid for overall validation to pass */
    minValidClaimRatio: 0.7,
} as const;

// =============================================================================
// STATISTICS COMPUTATION
// =============================================================================

/**
 * Computes statistics from log entries for validation
 */
export function computeStatistics(
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = []
): ComputedStatistics {
    if (logs.length === 0) {
        return {
            logCount: 0,
            crisisCount: crisisEvents.length,
            avgArousal: 0,
            avgEnergy: 0,
            avgValence: 0,
            highArousalPercentage: 0,
            lowEnergyPercentage: 0,
            triggerPercentages: {},
            strategyEffectiveness: {},
            contextPercentages: { home: 0, school: 0 },
        };
    }

    // Basic averages
    const avgArousal = logs.reduce((sum, l) => sum + l.arousal, 0) / logs.length;
    const avgEnergy = logs.reduce((sum, l) => sum + l.energy, 0) / logs.length;
    const avgValence = logs.reduce((sum, l) => sum + l.valence, 0) / logs.length;

    // High arousal and low energy percentages
    const highArousalCount = logs.filter(l => l.arousal >= 7).length;
    const lowEnergyCount = logs.filter(l => l.energy <= 3).length;

    // Trigger frequencies
    const triggerCounts: Record<string, number> = {};
    logs.forEach(log => {
        [...log.sensoryTriggers, ...log.contextTriggers].forEach(trigger => {
            triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
        });
    });
    const triggerPercentages: Record<string, number> = {};
    Object.entries(triggerCounts).forEach(([trigger, count]) => {
        triggerPercentages[trigger] = Math.round((count / logs.length) * 100);
    });

    // Strategy effectiveness
    const strategyCounts: Record<string, { helped: number; total: number }> = {};
    logs.forEach(log => {
        log.strategies.forEach(strategy => {
            if (!strategyCounts[strategy]) {
                strategyCounts[strategy] = { helped: 0, total: 0 };
            }
            strategyCounts[strategy].total++;
            if (log.strategyEffectiveness === 'helped') {
                strategyCounts[strategy].helped++;
            }
        });
    });
    const strategyEffectiveness: Record<string, { successRate: number; usageCount: number }> = {};
    Object.entries(strategyCounts).forEach(([strategy, counts]) => {
        strategyEffectiveness[strategy] = {
            successRate: counts.total > 0 ? Math.round((counts.helped / counts.total) * 100) : 0,
            usageCount: counts.total
        };
    });

    // Context distribution
    const homeCount = logs.filter(l => l.context === 'home').length;
    const schoolCount = logs.filter(l => l.context === 'school').length;

    // Crisis statistics
    let avgCrisisDuration: number | undefined;
    let avgRecoveryTime: number | undefined;

    if (crisisEvents.length > 0) {
        avgCrisisDuration = crisisEvents.reduce((sum, c) => sum + c.durationSeconds, 0) /
            crisisEvents.length / 60; // Convert to minutes

        const crisesWithRecovery = crisisEvents.filter(c => c.recoveryTimeMinutes !== undefined);
        if (crisesWithRecovery.length > 0) {
            avgRecoveryTime = crisesWithRecovery.reduce(
                (sum, c) => sum + (c.recoveryTimeMinutes || 0), 0
            ) / crisesWithRecovery.length;
        }
    }

    return {
        logCount: logs.length,
        crisisCount: crisisEvents.length,
        avgArousal: Math.round(avgArousal * 10) / 10,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        avgValence: Math.round(avgValence * 10) / 10,
        highArousalPercentage: Math.round((highArousalCount / logs.length) * 100),
        lowEnergyPercentage: Math.round((lowEnergyCount / logs.length) * 100),
        triggerPercentages,
        strategyEffectiveness,
        contextPercentages: {
            home: Math.round((homeCount / logs.length) * 100),
            school: Math.round((schoolCount / logs.length) * 100)
        },
        avgCrisisDuration: avgCrisisDuration ? Math.round(avgCrisisDuration) : undefined,
        avgRecoveryTime: avgRecoveryTime ? Math.round(avgRecoveryTime) : undefined,
    };
}

// =============================================================================
// CLAIM EXTRACTION
// =============================================================================

interface ExtractedClaim {
    originalText: string;
    value: number;
    category: 'percentage' | 'average' | 'count' | 'duration';
    context: string;
}

/**
 * Extracts numerical claims from AI response text
 * Looks for patterns like "X%", "average of X", "X occurrences", etc.
 */
function extractNumericalClaims(text: string): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];

    // Pattern for percentages: "X%", "X prosent", "X percent"
    const percentagePatterns = [
        /(\d+(?:[.,]\d+)?)\s*%/gi,
        /(\d+(?:[.,]\d+)?)\s*prosent/gi,
        /(\d+(?:[.,]\d+)?)\s*percent/gi,
    ];

    percentagePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const value = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(value) && value >= 0 && value <= 100) {
                // Get surrounding context (50 chars before and after)
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + match[0].length + 50);
                const context = text.slice(start, end);

                claims.push({
                    originalText: match[0],
                    value,
                    category: 'percentage',
                    context
                });
            }
        }
    });

    // Pattern for averages: "gjennomsnitt X", "average X", "snitt X"
    const averagePatterns = [
        /gjennomsnitt(?:lig)?\s*(?:på|:)?\s*(\d+(?:[.,]\d+)?)/gi,
        /snitt\s*(?:på|:)?\s*(\d+(?:[.,]\d+)?)/gi,
        /average\s*(?:of|:)?\s*(\d+(?:[.,]\d+)?)/gi,
        /(\d+(?:[.,]\d+)?)\s*\/\s*10/gi, // X/10 format
    ];

    averagePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const value = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(value) && value >= 0 && value <= 10) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + match[0].length + 50);
                const context = text.slice(start, end);

                claims.push({
                    originalText: match[0],
                    value,
                    category: 'average',
                    context
                });
            }
        }
    });

    // Pattern for counts: "X hendelser", "X tilfeller", "X logs", "X ganger"
    const countPatterns = [
        /(\d+)\s*hendelser?/gi,
        /(\d+)\s*tilfeller?/gi,
        /(\d+)\s*logger?/gi,
        /(\d+)\s*ganger/gi,
        /(\d+)\s*(?:crisis|crises|krise)/gi,
    ];

    countPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const value = parseInt(match[1], 10);
            if (!isNaN(value) && value >= 0) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + match[0].length + 50);
                const context = text.slice(start, end);

                claims.push({
                    originalText: match[0],
                    value,
                    category: 'count',
                    context
                });
            }
        }
    });

    // Pattern for durations: "X minutter", "X min", "X timer"
    const durationPatterns = [
        /(\d+)\s*minutter?/gi,
        /(\d+)\s*min(?:utt)?/gi,
        /(\d+)\s*timer?/gi,
    ];

    durationPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            let value = parseInt(match[1], 10);
            // Convert hours to minutes if needed
            if (/timer?/i.test(match[0])) {
                value *= 60;
            }
            if (!isNaN(value) && value >= 0) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(text.length, match.index + match[0].length + 50);
                const context = text.slice(start, end);

                claims.push({
                    originalText: match[0],
                    value,
                    category: 'duration',
                    context
                });
            }
        }
    });

    // Deduplicate claims (same value and category)
    const seen = new Set<string>();
    return claims.filter(claim => {
        const key = `${claim.category}:${claim.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// =============================================================================
// CLAIM VALIDATION
// =============================================================================

/**
 * Validates an extracted claim against computed statistics
 */
function validateClaim(
    claim: ExtractedClaim,
    stats: ComputedStatistics
): ClaimValidation | null {
    let actualValue: number | null = null;
    let maxDiscrepancy: number;

    const contextLower = claim.context.toLowerCase();

    switch (claim.category) {
        case 'percentage':
            maxDiscrepancy = VALIDATION_CONFIG.maxPercentageDiscrepancy;

            // Try to match against known percentage statistics
            if (contextLower.includes('høy') && contextLower.includes('arousal')) {
                actualValue = stats.highArousalPercentage;
            } else if (contextLower.includes('lav') && contextLower.includes('energi')) {
                actualValue = stats.lowEnergyPercentage;
            } else if (contextLower.includes('hjemme') || contextLower.includes('home')) {
                actualValue = stats.contextPercentages.home;
            } else if (contextLower.includes('skole') || contextLower.includes('school')) {
                actualValue = stats.contextPercentages.school;
            } else {
                // Check for trigger percentages
                for (const [trigger, pct] of Object.entries(stats.triggerPercentages)) {
                    if (contextLower.includes(trigger.toLowerCase())) {
                        actualValue = pct;
                        break;
                    }
                }
                // Check for strategy effectiveness
                if (actualValue === null) {
                    for (const [strategy, data] of Object.entries(stats.strategyEffectiveness)) {
                        if (contextLower.includes(strategy.toLowerCase())) {
                            actualValue = data.successRate;
                            break;
                        }
                    }
                }
            }
            break;

        case 'average':
            maxDiscrepancy = VALIDATION_CONFIG.maxAverageDiscrepancy;

            if (contextLower.includes('arousal') || contextLower.includes('aktivering')) {
                actualValue = stats.avgArousal;
            } else if (contextLower.includes('energi') || contextLower.includes('energy')) {
                actualValue = stats.avgEnergy;
            } else if (contextLower.includes('valens') || contextLower.includes('stemning')) {
                actualValue = stats.avgValence;
            }
            break;

        case 'count':
            maxDiscrepancy = VALIDATION_CONFIG.maxCountDiscrepancy;

            if (contextLower.includes('logg') || contextLower.includes('log')) {
                actualValue = stats.logCount;
            } else if (contextLower.includes('krise') || contextLower.includes('crisis')) {
                actualValue = stats.crisisCount;
            }
            break;

        case 'duration':
            maxDiscrepancy = VALIDATION_CONFIG.maxDurationDiscrepancy;

            if (contextLower.includes('krise') || contextLower.includes('crisis')) {
                actualValue = stats.avgCrisisDuration ?? null;
            } else if (contextLower.includes('recovery') || contextLower.includes('gjenopprett')) {
                actualValue = stats.avgRecoveryTime ?? null;
            }
            break;

        default:
            return null;
    }

    // If we couldn't find a matching statistic, skip validation
    if (actualValue === null) {
        return null;
    }

    const discrepancy = Math.abs(claim.value - actualValue);
    const discrepancyPercent = actualValue !== 0
        ? Math.round((discrepancy / actualValue) * 100)
        : (claim.value === 0 ? 0 : 100);

    return {
        claim: claim.originalText,
        claimedValue: claim.value,
        actualValue,
        discrepancyPercent,
        isValid: discrepancy <= maxDiscrepancy,
        category: claim.category
    };
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validates an AI analysis result against computed statistics
 * Returns validation results including warnings for potential hallucinations
 */
export function validateAIInsights(
    analysisResult: AnalysisResult,
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = []
): ValidationResult {
    const stats = computeStatistics(logs, crisisEvents);

    // Combine all text from the analysis
    const allText = [
        analysisResult.triggerAnalysis,
        analysisResult.strategyEvaluation,
        analysisResult.interoceptionPatterns,
        analysisResult.summary,
        ...(analysisResult.correlations?.map(c => c.description) || []),
        ...(analysisResult.recommendations || [])
    ].join(' ');

    // Extract and validate claims
    const extractedClaims = extractNumericalClaims(allText);
    const claimValidations: ClaimValidation[] = [];

    for (const claim of extractedClaims) {
        const validation = validateClaim(claim, stats);
        if (validation) {
            claimValidations.push(validation);
        }
    }

    // Generate warnings for invalid claims
    const warnings: string[] = [];
    const invalidClaims = claimValidations.filter(v => !v.isValid);

    if (invalidClaims.length > 0) {
        warnings.push(
            `${invalidClaims.length} av ${claimValidations.length} AI-påstander avviker fra faktiske data.`
        );

        // Add specific warnings for large discrepancies
        invalidClaims
            .filter(v => v.discrepancyPercent > 30)
            .forEach(v => {
                warnings.push(
                    `AI hevder "${v.claim}" men faktisk verdi er ${v.actualValue} (${v.discrepancyPercent}% avvik)`
                );
            });
    }

    // Calculate overall validity
    const validClaims = claimValidations.filter(v => v.isValid).length;
    const validRatio = claimValidations.length > 0
        ? validClaims / claimValidations.length
        : 1;
    const isValid = validRatio >= VALIDATION_CONFIG.minValidClaimRatio;

    if (!isValid && claimValidations.length > 0) {
        warnings.unshift(
            'AI-analysen inneholder flere påstander som ikke samsvarer med dataene. Tolkning bør gjøres med forsiktighet.'
        );
    }

    return {
        isValid,
        totalClaims: claimValidations.length,
        validClaims,
        claimValidations,
        warnings,
        computedStats: stats
    };
}

// =============================================================================
// CITATION GENERATION
// =============================================================================

/**
 * Generates a citation string based on the data analyzed
 * Format: "[Basert på N logger over M dager]"
 */
export function generateDataCitation(logs: LogEntry[], crisisEvents: CrisisEvent[] = []): string {
    if (logs.length === 0) {
        return '[Ingen data tilgjengelig]';
    }

    const parts: string[] = [];
    parts.push(`${logs.length} logger`);

    if (crisisEvents.length > 0) {
        parts.push(`${crisisEvents.length} krisehendelser`);
    }

    // Calculate date range
    const timestamps = logs.map(l => new Date(l.timestamp).getTime());
    const oldest = new Date(Math.min(...timestamps));
    const newest = new Date(Math.max(...timestamps));
    const daysDiff = Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (daysDiff > 1) {
        parts.push(`${daysDiff} dager`);
    }

    return `[Basert på ${parts.join(', ')}]`;
}

/**
 * Adds data citations to an analysis result
 * Modifies the summary and recommendations to include sample size context
 */
export function addCitationsToResult(
    result: AnalysisResult,
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = []
): AnalysisResult {
    const citation = generateDataCitation(logs, crisisEvents);

    return {
        ...result,
        // Add citation to summary
        summary: `${result.summary}\n\n${citation}`,
        // Add citation to each recommendation
        recommendations: result.recommendations?.map((rec, i) =>
            i === result.recommendations!.length - 1
                ? `${rec} ${citation}`
                : rec
        )
    };
}

// =============================================================================
// ENHANCED ANALYSIS WITH VALIDATION
// =============================================================================

export interface ValidatedAnalysisResult extends AnalysisResult {
    /** Validation results */
    validation?: ValidationResult;
    /** Whether insights should be trusted */
    trustworthy: boolean;
    /** Data citation string */
    citation: string;
}

/**
 * Wraps an analysis result with validation and citation information
 */
export function createValidatedResult(
    result: AnalysisResult,
    logs: LogEntry[],
    crisisEvents: CrisisEvent[] = []
): ValidatedAnalysisResult {
    const validation = validateAIInsights(result, logs, crisisEvents);
    const citation = generateDataCitation(logs, crisisEvents);

    return {
        ...result,
        validation,
        trustworthy: validation.isValid,
        citation
    };
}
