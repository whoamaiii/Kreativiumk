/**
 * Smart Defaults Utility
 * Analyzes historical log data to suggest intelligent defaults for new entries
 */

import type { LogEntry, ContextType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface SmartDefaults {
    /** Suggested arousal based on time of day */
    suggestedArousal: number;
    /** Suggested valence based on time of day */
    suggestedValence: number;
    /** Suggested energy based on time of day */
    suggestedEnergy: number;
    /** Most frequently used sensory triggers */
    frequentSensoryTriggers: string[];
    /** Most frequently used context triggers */
    frequentContextTriggers: string[];
    /** Most effective strategies (helped > no_change > escalated) */
    effectiveStrategies: string[];
    /** Suggested context based on time */
    suggestedContext: ContextType;
    /** Confidence score (0-1) for these suggestions */
    confidence: number;
}

export interface TriggerFrequency {
    trigger: string;
    count: number;
    percentage: number;
}

export interface StrategyEffectiveness {
    strategy: string;
    helpedCount: number;
    usedCount: number;
    successRate: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SMART_DEFAULTS_CONFIG = {
    /** Minimum logs needed for reliable suggestions */
    minLogsForSuggestions: 5,
    /** Number of top triggers to suggest */
    topTriggersCount: 3,
    /** Number of top strategies to suggest */
    topStrategiesCount: 3,
    /** Minimum success rate to suggest a strategy */
    minStrategySuccessRate: 0.5,
    /** Minimum usage count to consider strategy */
    minStrategyUsageCount: 2,
    /** School hours (weekdays) */
    schoolHours: { start: 8, end: 15 },
    /** Time of day buckets */
    timeOfDayBuckets: {
        morning: { start: 6, end: 12 },
        afternoon: { start: 12, end: 18 },
        evening: { start: 18, end: 22 },
        night: { start: 22, end: 6 }
    }
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get time of day bucket for a given hour
 */
function getTimeOfDayBucket(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    const { timeOfDayBuckets } = SMART_DEFAULTS_CONFIG;

    if (hour >= timeOfDayBuckets.morning.start && hour < timeOfDayBuckets.morning.end) {
        return 'morning';
    }
    if (hour >= timeOfDayBuckets.afternoon.start && hour < timeOfDayBuckets.afternoon.end) {
        return 'afternoon';
    }
    if (hour >= timeOfDayBuckets.evening.start && hour < timeOfDayBuckets.evening.end) {
        return 'evening';
    }
    return 'night';
}

/**
 * Detect context based on current time
 */
export function detectContextFromTime(): ContextType {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend = home
    if (day === 0 || day === 6) {
        return 'home';
    }

    // Weekday school hours
    const { schoolHours } = SMART_DEFAULTS_CONFIG;
    if (hour >= schoolHours.start && hour < schoolHours.end) {
        return 'school';
    }

    return 'home';
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate average values for a specific time of day
 */
function getTimeBasedAverages(logs: LogEntry[], targetHour: number): {
    avgArousal: number;
    avgValence: number;
    avgEnergy: number;
    count: number;
} {
    const targetBucket = getTimeOfDayBucket(targetHour);

    const relevantLogs = logs.filter(log => {
        const logHour = new Date(log.timestamp).getHours();
        return getTimeOfDayBucket(logHour) === targetBucket;
    });

    if (relevantLogs.length === 0) {
        return { avgArousal: 5, avgValence: 5, avgEnergy: 5, count: 0 };
    }

    const sum = relevantLogs.reduce((acc, log) => ({
        arousal: acc.arousal + log.arousal,
        valence: acc.valence + log.valence,
        energy: acc.energy + log.energy
    }), { arousal: 0, valence: 0, energy: 0 });

    return {
        avgArousal: Math.round(sum.arousal / relevantLogs.length),
        avgValence: Math.round(sum.valence / relevantLogs.length),
        avgEnergy: Math.round(sum.energy / relevantLogs.length),
        count: relevantLogs.length
    };
}

/**
 * Get most frequently used triggers
 */
export function getFrequentTriggers(logs: LogEntry[], type: 'sensory' | 'context'): TriggerFrequency[] {
    const triggerCounts = new Map<string, number>();

    for (const log of logs) {
        const triggers = type === 'sensory' ? log.sensoryTriggers : log.contextTriggers;
        for (const trigger of triggers) {
            triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
        }
    }

    const total = logs.length;
    const frequencies: TriggerFrequency[] = [];

    for (const [trigger, count] of triggerCounts.entries()) {
        frequencies.push({
            trigger,
            count,
            percentage: Math.round((count / total) * 100)
        });
    }

    // Sort by count (descending)
    return frequencies.sort((a, b) => b.count - a.count);
}

/**
 * Get most effective strategies based on outcomes
 */
export function getEffectiveStrategies(logs: LogEntry[]): StrategyEffectiveness[] {
    const strategyStats = new Map<string, { helped: number; total: number }>();

    for (const log of logs) {
        if (!log.strategies || log.strategies.length === 0) continue;

        for (const strategy of log.strategies) {
            const current = strategyStats.get(strategy) || { helped: 0, total: 0 };
            current.total++;

            if (log.strategyEffectiveness === 'helped') {
                current.helped++;
            }

            strategyStats.set(strategy, current);
        }
    }

    const effectiveness: StrategyEffectiveness[] = [];

    for (const [strategy, stats] of strategyStats.entries()) {
        if (stats.total >= SMART_DEFAULTS_CONFIG.minStrategyUsageCount) {
            effectiveness.push({
                strategy,
                helpedCount: stats.helped,
                usedCount: stats.total,
                successRate: stats.helped / stats.total
            });
        }
    }

    // Sort by success rate (descending), then by usage count
    return effectiveness.sort((a, b) => {
        if (b.successRate !== a.successRate) {
            return b.successRate - a.successRate;
        }
        return b.usedCount - a.usedCount;
    });
}

/**
 * Calculate smart defaults based on historical data
 */
export function calculateSmartDefaults(logs: LogEntry[]): SmartDefaults {
    const now = new Date();
    const currentHour = now.getHours();

    // Default fallback values
    const defaults: SmartDefaults = {
        suggestedArousal: 5,
        suggestedValence: 5,
        suggestedEnergy: 5,
        frequentSensoryTriggers: [],
        frequentContextTriggers: [],
        effectiveStrategies: [],
        suggestedContext: detectContextFromTime(),
        confidence: 0
    };

    if (logs.length < SMART_DEFAULTS_CONFIG.minLogsForSuggestions) {
        return defaults;
    }

    // Calculate time-based averages
    const timeAverages = getTimeBasedAverages(logs, currentHour);
    if (timeAverages.count > 0) {
        defaults.suggestedArousal = timeAverages.avgArousal;
        defaults.suggestedValence = timeAverages.avgValence;
        defaults.suggestedEnergy = timeAverages.avgEnergy;
    }

    // Get frequent triggers
    const sensoryFrequencies = getFrequentTriggers(logs, 'sensory');
    defaults.frequentSensoryTriggers = sensoryFrequencies
        .slice(0, SMART_DEFAULTS_CONFIG.topTriggersCount)
        .map(f => f.trigger);

    const contextFrequencies = getFrequentTriggers(logs, 'context');
    defaults.frequentContextTriggers = contextFrequencies
        .slice(0, SMART_DEFAULTS_CONFIG.topTriggersCount)
        .map(f => f.trigger);

    // Get effective strategies
    const strategies = getEffectiveStrategies(logs);
    defaults.effectiveStrategies = strategies
        .filter(s => s.successRate >= SMART_DEFAULTS_CONFIG.minStrategySuccessRate)
        .slice(0, SMART_DEFAULTS_CONFIG.topStrategiesCount)
        .map(s => s.strategy);

    // Calculate confidence based on data quality
    const dataPoints = [
        timeAverages.count >= 3 ? 0.25 : 0,
        sensoryFrequencies.length > 0 ? 0.25 : 0,
        contextFrequencies.length > 0 ? 0.25 : 0,
        strategies.length > 0 ? 0.25 : 0
    ];
    defaults.confidence = dataPoints.reduce((a, b) => a + b, 0);

    return defaults;
}

/**
 * Get the last used context from recent logs
 */
export function getLastUsedContext(logs: LogEntry[]): ContextType | null {
    if (logs.length === 0) return null;

    // Sort by timestamp (most recent first)
    const sorted = [...logs].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted[0].context || null;
}

/**
 * Get suggested triggers for quick selection
 * Returns triggers that have been used in the current context and time of day
 */
export function getContextualTriggerSuggestions(
    logs: LogEntry[],
    context: ContextType,
    type: 'sensory' | 'context'
): string[] {
    const now = new Date();
    const currentBucket = getTimeOfDayBucket(now.getHours());

    // Filter logs by context and time of day
    const relevantLogs = logs.filter(log => {
        const logBucket = getTimeOfDayBucket(new Date(log.timestamp).getHours());
        return log.context === context && logBucket === currentBucket;
    });

    if (relevantLogs.length === 0) {
        // Fall back to all logs for this context
        const contextLogs = logs.filter(log => log.context === context);
        if (contextLogs.length === 0) {
            return [];
        }
        return getFrequentTriggers(contextLogs, type)
            .slice(0, SMART_DEFAULTS_CONFIG.topTriggersCount)
            .map(f => f.trigger);
    }

    return getFrequentTriggers(relevantLogs, type)
        .slice(0, SMART_DEFAULTS_CONFIG.topTriggersCount)
        .map(f => f.trigger);
}

/**
 * Get suggested strategies for the current situation
 * Prioritizes strategies that worked in similar conditions
 */
export function getContextualStrategySuggestions(
    logs: LogEntry[],
    context: ContextType,
    currentArousal?: number
): string[] {
    // Filter to similar situations
    const relevantLogs = logs.filter(log => {
        const matchesContext = log.context === context;
        const matchesArousal = currentArousal === undefined ||
            Math.abs(log.arousal - currentArousal) <= 2;
        return matchesContext && matchesArousal;
    });

    if (relevantLogs.length < SMART_DEFAULTS_CONFIG.minLogsForSuggestions) {
        // Fall back to overall effective strategies
        return getEffectiveStrategies(logs)
            .slice(0, SMART_DEFAULTS_CONFIG.topStrategiesCount)
            .map(s => s.strategy);
    }

    return getEffectiveStrategies(relevantLogs)
        .slice(0, SMART_DEFAULTS_CONFIG.topStrategiesCount)
        .map(s => s.strategy);
}
