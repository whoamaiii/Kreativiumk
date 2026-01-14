/**
 * Storage Health Indicator Component
 * Displays storage usage and warns users when storage is running low
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HardDrive,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Download
} from 'lucide-react';
import {
    getStorageHealth,
    getCleanupSuggestions,
    onStorageChange,
    type StorageHealthStatus,
    type StorageUsage,
    type CleanupSuggestion
} from '../utils/storageHealth';

// =============================================================================
// TYPES
// =============================================================================

interface StorageHealthIndicatorProps {
    /** Whether to show detailed breakdown */
    showDetails?: boolean;
    /** Callback when export is requested */
    onExportRequest?: () => void;
    /** Compact mode for header/navbar display */
    compact?: boolean;
}

// =============================================================================
// STATUS ICON COMPONENT
// =============================================================================

function StatusIcon({ status }: { status: StorageHealthStatus['status'] }) {
    switch (status) {
        case 'healthy':
            return <CheckCircle className="w-5 h-5 text-green-400" />;
        case 'warning':
            return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
        case 'critical':
            return <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />;
        case 'error':
            return <AlertCircle className="w-5 h-5 text-gray-400" />;
        default:
            return <HardDrive className="w-5 h-5 text-gray-400" />;
    }
}

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

function StorageProgressBar({ usage }: { usage: StorageUsage }) {
    const getBarColor = (percent: number): string => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 70) return 'bg-yellow-500';
        return 'bg-cyan-500';
    };

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{usage.usedFormatted} brukt</span>
                <span>{usage.quotaFormatted} totalt</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full ${getBarColor(usage.usagePercent)} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usage.usagePercent, 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
            <div className="text-xs text-white/40 mt-1 text-right">
                {usage.usagePercent}% brukt
            </div>
        </div>
    );
}

// =============================================================================
// BREAKDOWN COMPONENT
// =============================================================================

function StorageBreakdown({ breakdown }: { breakdown: StorageUsage['breakdown'] }) {
    const { t } = useTranslation();

    const categories = [
        { key: 'logs', label: t('storage.logs', 'Logger'), color: 'bg-cyan-500' },
        { key: 'crisis', label: t('storage.crisis', 'Krisehendelser'), color: 'bg-purple-500' },
        { key: 'schedule', label: t('storage.schedule', 'Timeplan'), color: 'bg-green-500' },
        { key: 'goals', label: t('storage.goals', 'Mål'), color: 'bg-yellow-500' },
        { key: 'profile', label: t('storage.profile', 'Profil'), color: 'bg-blue-500' },
        { key: 'settings', label: t('storage.settings', 'Innstillinger'), color: 'bg-gray-500' },
        { key: 'other', label: t('storage.other', 'Annet'), color: 'bg-white/20' },
    ];

    // Calculate total for percentage
    const total = Object.values(breakdown).reduce((sum, cat) => sum + cat.bytes, 0);

    return (
        <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium text-white/80">
                {t('storage.breakdown', 'Fordeling')}
            </h4>
            {categories.map(({ key, label, color }) => {
                const data = breakdown[key];
                if (!data || data.bytes === 0) return null;

                const percent = total > 0 ? Math.round((data.bytes / total) * 100) : 0;

                return (
                    <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-sm text-white/70 flex-1">{label}</span>
                        <span className="text-xs text-white/50">
                            {data.count} {t('storage.items', 'elementer')}
                        </span>
                        <span className="text-xs text-white/60 w-12 text-right">
                            {percent}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// SUGGESTIONS COMPONENT
// =============================================================================

function CleanupSuggestions({
    suggestions,
    onExportRequest
}: {
    suggestions: CleanupSuggestion[];
    onExportRequest?: () => void;
}) {
    const { t } = useTranslation();

    if (suggestions.length === 0) return null;

    return (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">
                {t('storage.suggestions', 'Forslag for å frigjøre plass')}
            </h4>
            <ul className="space-y-2">
                {suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-white/70">
                        <span className="font-medium">{suggestion.category}:</span>{' '}
                        {suggestion.suggestion}
                        <span className="text-green-400 ml-1">
                            (~{suggestion.potentialSavings})
                        </span>
                    </li>
                ))}
            </ul>
            {onExportRequest && (
                <button
                    onClick={onExportRequest}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors"
                >
                    <Download className="w-4 h-4" />
                    {t('storage.exportData', 'Eksporter data')}
                </button>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StorageHealthIndicator({
    showDetails = false,
    onExportRequest,
    compact = false
}: StorageHealthIndicatorProps) {
    const { t } = useTranslation();
    // Use lazy initialization to avoid setState during render/effect
    const [health, setHealth] = useState<StorageHealthStatus | null>(() => getStorageHealth());
    const [expanded, setExpanded] = useState(showDetails);
    // Initialize suggestions if already expanded
    const [suggestions, setSuggestions] = useState<CleanupSuggestion[]>(() =>
        showDetails ? getCleanupSuggestions() : []
    );

    // Set up storage change listener (no initial setState needed)
    useEffect(() => {
        const cleanup = onStorageChange(() => {
            setHealth(getStorageHealth());
        });
        return cleanup;
    }, []);

    // Toggle expanded state and load suggestions when expanding
    const handleToggleExpanded = useCallback(() => {
        setExpanded(prev => {
            if (!prev) {
                // About to expand - load suggestions
                setSuggestions(getCleanupSuggestions());
            }
            return !prev;
        });
    }, []);

    const refreshHealth = useCallback(() => {
        setHealth(getStorageHealth());
        if (expanded) {
            setSuggestions(getCleanupSuggestions());
        }
    }, [expanded]);

    if (!health) {
        return null;
    }

    // Compact mode for header display
    if (compact) {
        if (health.status === 'healthy') {
            return null; // Don't show when healthy in compact mode
        }

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg"
            >
                <StatusIcon status={health.status} />
                <span className="text-xs text-white/70">
                    {health.usage.usagePercent}%
                </span>
            </motion.div>
        );
    }

    // Full component
    return (
        <div className="liquid-glass-card rounded-xl p-4">
            {/* Header */}
            <button
                onClick={handleToggleExpanded}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                        <HardDrive className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-medium text-white">
                            {t('storage.title', 'Lagringsplass')}
                        </h3>
                        <p className="text-xs text-white/60">
                            {health.message}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusIcon status={health.status} />
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                </div>
            </button>

            {/* Progress Bar */}
            <div className="mt-4">
                <StorageProgressBar usage={health.usage} />
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {/* Breakdown */}
                        <StorageBreakdown breakdown={health.usage.breakdown} />

                        {/* Recommendations */}
                        {health.recommendation && (
                            <div className="mt-4 p-3 bg-white/5 rounded-lg">
                                <p className="text-sm text-white/70">
                                    <span className="font-medium text-white/90">
                                        {t('storage.recommendation', 'Anbefaling')}:
                                    </span>{' '}
                                    {health.recommendation}
                                </p>
                            </div>
                        )}

                        {/* Cleanup Suggestions */}
                        <CleanupSuggestions
                            suggestions={suggestions}
                            onExportRequest={onExportRequest}
                        />

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={refreshHealth}
                                className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm transition-colors"
                            >
                                {t('storage.refresh', 'Oppdater')}
                            </button>
                            {health.shouldPromptExport && onExportRequest && (
                                <button
                                    onClick={onExportRequest}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('storage.export', 'Eksporter')}
                                </button>
                            )}
                        </div>

                        {/* Warning for critical */}
                        {health.status === 'critical' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
                            >
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-400">
                                            {t('storage.criticalWarning', 'Kritisk lav lagringsplass')}
                                        </p>
                                        <p className="text-xs text-white/60 mt-1">
                                            {t(
                                                'storage.criticalMessage',
                                                'Nye logger kan ikke lagres hvis plassen går tom. Eksporter data nå for å unngå datatap.'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default StorageHealthIndicator;
