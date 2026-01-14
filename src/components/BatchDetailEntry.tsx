/**
 * Batch Detail Entry Component
 * Allows users to enrich quick logs with triggers, strategies, and notes after the fact
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Clock,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    Smile,
    Meh,
    Frown,
    Sparkles,
    AlertCircle,
    Edit3,
    Save
} from 'lucide-react';
import { useLogs } from '../store';
import {
    SENSORY_TRIGGER_KEYS,
    CONTEXT_TRIGGER_KEYS,
    STRATEGY_KEYS
} from '../utils/i18nMigration';
import {
    getContextualTriggerSuggestions,
    getContextualStrategySuggestions
} from '../utils/smartDefaults';
import type { LogEntry, QuickLogLevel } from '../types';

// =============================================================================
// TYPES
// =============================================================================

interface BatchDetailEntryProps {
    /** Maximum hours to look back for quick logs */
    maxHoursBack?: number;
    /** Callback when all logs have been enriched */
    onComplete?: () => void;
    /** Whether to show as end-of-day review mode */
    endOfDayMode?: boolean;
}

interface LogEditState {
    sensoryTriggers: string[];
    contextTriggers: string[];
    strategies: string[];
    strategyEffectiveness?: 'helped' | 'no_change' | 'escalated';
    note: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a log needs enrichment (missing triggers/strategies)
 */
function needsEnrichment(log: LogEntry): boolean {
    // Has quick log level but missing details
    if (log.quickLogLevel) {
        const hasTriggers = log.sensoryTriggers.length > 0 || log.contextTriggers.length > 0;
        const hasStrategies = log.strategies.length > 0;
        return !hasTriggers && !hasStrategies;
    }
    return false;
}

/**
 * Format relative time (e.g., "2 timer siden")
 */
function formatRelativeTime(timestamp: string, t: (key: string, fallback: string) => string): string {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now.getTime() - logTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return t('batchDetail.justNow', 'Akkurat nå');
    if (diffMins < 60) return t('batchDetail.minutesAgo', '{{count}} min siden').replace('{{count}}', String(diffMins));
    if (diffHours === 1) return t('batchDetail.oneHourAgo', '1 time siden');
    return t('batchDetail.hoursAgo', '{{count}} timer siden').replace('{{count}}', String(diffHours));
}

/**
 * Get icon for quick log level
 */
function getLevelIcon(level: QuickLogLevel | undefined) {
    switch (level) {
        case 'good': return Smile;
        case 'struggling': return Meh;
        case 'crisis': return Frown;
        default: return Edit3;
    }
}

/**
 * Get color classes for quick log level
 */
function getLevelColors(level: QuickLogLevel | undefined): string {
    switch (level) {
        case 'good': return 'border-emerald-500/40 bg-emerald-500/10';
        case 'struggling': return 'border-amber-500/40 bg-amber-500/10';
        case 'crisis': return 'border-red-500/40 bg-red-500/10';
        default: return 'border-white/20 bg-white/5';
    }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const BatchDetailEntry: React.FC<BatchDetailEntryProps> = ({
    maxHoursBack = 24,
    onComplete,
    endOfDayMode = false
}) => {
    const { t } = useTranslation();
    const { logs, updateLog } = useLogs();

    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [editStates, setEditStates] = useState<Record<string, LogEditState>>({});
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    // Get logs that need enrichment within time window
    const logsToEnrich = useMemo(() => {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - maxHoursBack);

        return (logs as LogEntry[])
            .filter(log => {
                const logTime = new Date(log.timestamp);
                return logTime >= cutoffTime && needsEnrichment(log);
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, maxHoursBack]);

    // Get smart suggestions based on context
    const getSuggestions = useCallback((log: LogEntry) => {
        const sensory = getContextualTriggerSuggestions(logs, log.context, 'sensory');
        const context = getContextualTriggerSuggestions(logs, log.context, 'context');
        const strategies = getContextualStrategySuggestions(logs, log.context, log.arousal);
        return { sensory, context, strategies };
    }, [logs]);

    // Initialize edit state for a log
    const getEditState = useCallback((log: LogEntry): LogEditState => {
        if (editStates[log.id]) return editStates[log.id];
        return {
            sensoryTriggers: [...log.sensoryTriggers],
            contextTriggers: [...log.contextTriggers],
            strategies: [...log.strategies],
            strategyEffectiveness: log.strategyEffectiveness,
            note: log.note || ''
        };
    }, [editStates]);

    // Update edit state
    const updateEditState = useCallback((logId: string, updates: Partial<LogEditState>) => {
        setEditStates(prev => ({
            ...prev,
            [logId]: { ...getEditState(logs.find(l => l.id === logId) as LogEntry), ...updates }
        }));
    }, [getEditState, logs]);

    // Toggle item in array
    const toggleItem = useCallback((
        logId: string,
        field: 'sensoryTriggers' | 'contextTriggers' | 'strategies',
        item: string
    ) => {
        const currentState = getEditState(logs.find(l => l.id === logId) as LogEntry);
        const currentArray = currentState[field];
        const newArray = currentArray.includes(item)
            ? currentArray.filter(i => i !== item)
            : [...currentArray, item];
        updateEditState(logId, { [field]: newArray });
    }, [getEditState, updateEditState, logs]);

    // Save log changes
    const saveLog = useCallback((logId: string) => {
        const editState = editStates[logId];
        if (!editState) return;

        updateLog(logId, {
            sensoryTriggers: editState.sensoryTriggers,
            contextTriggers: editState.contextTriggers,
            strategies: editState.strategies,
            strategyEffectiveness: editState.strategyEffectiveness,
            note: editState.note
        });

        setSavedIds(prev => new Set([...prev, logId]));
        setExpandedLogId(null);

        // Clear saved indicator after animation
        setTimeout(() => {
            setSavedIds(prev => {
                const next = new Set(prev);
                next.delete(logId);
                return next;
            });
        }, 2000);

        // Check if all logs are enriched
        const remainingLogs = logsToEnrich.filter(l => l.id !== logId);
        if (remainingLogs.length === 0) {
            onComplete?.();
        }
    }, [editStates, updateLog, logsToEnrich, onComplete]);

    // Skip a log (mark as skipped by removing from list temporarily)
    const skipLog = useCallback(() => {
        setExpandedLogId(null);
        // Could add to a skipped list if needed
    }, []);

    if (logsToEnrich.length === 0) {
        return (
            <div className="p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-white/70">
                    {endOfDayMode
                        ? t('batchDetail.allEnriched', 'Alle logger er fullført!')
                        : t('batchDetail.noLogsToEnrich', 'Ingen logger trenger detaljer')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                    {endOfDayMode ? (
                        <>
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            {t('batchDetail.endOfDayTitle', 'Dagens gjennomgang')}
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            {t('batchDetail.title', 'Logger som trenger detaljer')}
                        </>
                    )}
                </h3>
                <span className="text-xs text-white/50">
                    {logsToEnrich.length} {t('batchDetail.remaining', 'igjen')}
                </span>
            </div>

            {/* Log Cards */}
            {logsToEnrich.map(log => {
                const isExpanded = expandedLogId === log.id;
                const isSaved = savedIds.has(log.id);
                const LevelIcon = getLevelIcon(log.quickLogLevel);
                const editState = getEditState(log);
                const suggestions = getSuggestions(log);

                return (
                    <motion.div
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`rounded-xl border ${getLevelColors(log.quickLogLevel)} overflow-hidden`}
                    >
                        {/* Card Header */}
                        <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getLevelColors(log.quickLogLevel)}`}>
                                    <LevelIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">
                                            {log.quickLogLevel === 'good' && t('quickLog.good', 'Bra')}
                                            {log.quickLogLevel === 'struggling' && t('quickLog.struggling', 'Sliter')}
                                            {log.quickLogLevel === 'crisis' && t('quickLog.crisis', 'Krise')}
                                            {!log.quickLogLevel && t('batchDetail.unknownLevel', 'Logg')}
                                        </span>
                                        {isSaved && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-emerald-400 text-xs flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" />
                                                {t('batchDetail.saved', 'Lagret')}
                                            </motion.span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                        <Clock className="w-3 h-3" />
                                        {formatRelativeTime(log.timestamp, t)}
                                        <span>•</span>
                                        <span>{log.context === 'home' ? t('quickLog.home', 'Hjemme') : t('quickLog.school', 'Skole')}</span>
                                    </div>
                                </div>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-white/50" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-white/50" />
                            )}
                        </button>

                        {/* Expanded Content */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 pt-0 space-y-4">
                                        {/* Sensory Triggers */}
                                        <TriggerSection
                                            title={t('batchDetail.sensoryTriggers', 'Sensoriske utløsere')}
                                            items={SENSORY_TRIGGER_KEYS as unknown as string[]}
                                            selected={editState.sensoryTriggers}
                                            suggestions={suggestions.sensory}
                                            onToggle={(item) => toggleItem(log.id, 'sensoryTriggers', item)}
                                            translationPrefix="domain.sensory"
                                        />

                                        {/* Context Triggers */}
                                        <TriggerSection
                                            title={t('batchDetail.contextTriggers', 'Kontekstuelle utløsere')}
                                            items={CONTEXT_TRIGGER_KEYS as unknown as string[]}
                                            selected={editState.contextTriggers}
                                            suggestions={suggestions.context}
                                            onToggle={(item) => toggleItem(log.id, 'contextTriggers', item)}
                                            translationPrefix="domain.context"
                                        />

                                        {/* Strategies */}
                                        <TriggerSection
                                            title={t('batchDetail.strategies', 'Strategier brukt')}
                                            items={STRATEGY_KEYS as unknown as string[]}
                                            selected={editState.strategies}
                                            suggestions={suggestions.strategies}
                                            onToggle={(item) => toggleItem(log.id, 'strategies', item)}
                                            translationPrefix="domain.strategies"
                                        />

                                        {/* Strategy Effectiveness */}
                                        {editState.strategies.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-white/60">
                                                    {t('batchDetail.effectiveness', 'Fungerte strategiene?')}
                                                </label>
                                                <div className="flex gap-2">
                                                    {(['helped', 'no_change', 'escalated'] as const).map(eff => (
                                                        <button
                                                            key={eff}
                                                            onClick={() => updateEditState(log.id, { strategyEffectiveness: eff })}
                                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                                                                editState.strategyEffectiveness === eff
                                                                    ? eff === 'helped'
                                                                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                                                        : eff === 'no_change'
                                                                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                                                        : 'bg-red-500/30 text-red-300 border border-red-500/50'
                                                                    : 'bg-white/5 text-white/60 border border-white/10'
                                                            }`}
                                                        >
                                                            {eff === 'helped' && t('logEntry.effectiveness.helped', 'Hjalp')}
                                                            {eff === 'no_change' && t('logEntry.effectiveness.noChange', 'Uendret')}
                                                            {eff === 'escalated' && t('logEntry.effectiveness.escalated', 'Eskalerte')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-white/60">
                                                {t('batchDetail.note', 'Notat (valgfritt)')}
                                            </label>
                                            <textarea
                                                value={editState.note}
                                                onChange={(e) => updateEditState(log.id, { note: e.target.value })}
                                                placeholder={t('batchDetail.notePlaceholder', 'Hva skjedde? Hva husker du?')}
                                                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                                rows={2}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={skipLog}
                                                className="flex-1 py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                                {t('batchDetail.skip', 'Hopp over')}
                                            </button>
                                            <button
                                                onClick={() => saveLog(log.id)}
                                                className="flex-1 py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Save className="w-4 h-4" />
                                                {t('batchDetail.save', 'Lagre')}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TriggerSectionProps {
    title: string;
    items: string[];
    selected: string[];
    suggestions: string[];
    onToggle: (item: string) => void;
    translationPrefix: string;
}

const TriggerSection: React.FC<TriggerSectionProps> = ({
    title,
    items,
    selected,
    suggestions,
    onToggle,
    translationPrefix
}) => {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);

    // Show suggestions first, then other items
    const sortedItems = useMemo(() => {
        const suggestionSet = new Set(suggestions);
        const suggested = items.filter(item => suggestionSet.has(item));
        const others = items.filter(item => !suggestionSet.has(item));
        return [...suggested, ...others];
    }, [items, suggestions]);

    const displayItems = showAll ? sortedItems : sortedItems.slice(0, 6);
    const hasMore = sortedItems.length > 6;

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">{title}</label>
            <div className="flex flex-wrap gap-1.5">
                {displayItems.map(item => {
                    const isSelected = selected.includes(item);
                    const isSuggested = suggestions.includes(item);
                    return (
                        <button
                            key={item}
                            onClick={() => onToggle(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                isSelected
                                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                    : isSuggested
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {isSuggested && !isSelected && (
                                <Sparkles className="w-3 h-3 inline mr-1" />
                            )}
                            {t(`${translationPrefix}.${item}`, item)}
                        </button>
                    );
                })}
                {hasMore && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        {showAll ? t('batchDetail.showLess', 'Vis færre') : t('batchDetail.showMore', 'Vis flere')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default BatchDetailEntry;
