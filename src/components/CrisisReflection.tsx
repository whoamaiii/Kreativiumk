/**
 * CrisisReflection Component
 *
 * A multi-step guided reflection form for post-crisis processing.
 * Features:
 * - Step-by-step guided questions
 * - Immediate state capture (arousal, energy, mood)
 * - Strategy effectiveness review
 * - Prevention idea capture
 * - Caregiver observation notes
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Heart,
    Lightbulb,
    Brain,
    MessageSquare,
    Smile,
    Meh,
    Battery,
    Zap,
    Moon,
    CloudRain,
    Sun,
    RefreshCw,
    X
} from 'lucide-react';
import type { CrisisReflection as CrisisReflectionType, ReflectionEmotionalState, CrisisEvent } from '../types';
import {
    SENSORY_TRIGGER_KEYS,
    CONTEXT_TRIGGER_KEYS,
    STRATEGY_KEYS,
    getSensoryTriggerLabel,
    getContextTriggerLabel,
    getStrategyLabel
} from '../utils/i18nMigration';

// =============================================================================
// TYPES
// =============================================================================

interface CrisisReflectionProps {
    /** The crisis event being reflected on */
    crisisEvent: CrisisEvent;
    /** Callback when reflection is completed */
    onComplete: (reflection: Omit<CrisisReflectionType, 'id' | 'timestamp'>) => void;
    /** Callback to skip reflection */
    onSkip?: () => void;
}

interface ReflectionStep {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EMOTIONAL_STATES: { value: ReflectionEmotionalState; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'calm', label: 'Rolig', icon: Sun },
    { value: 'tired', label: 'Sliten', icon: Battery },
    { value: 'anxious', label: 'Engstelig', icon: Zap },
    { value: 'sad', label: 'Trist', icon: CloudRain },
    { value: 'relieved', label: 'Lettet', icon: RefreshCw },
    { value: 'frustrated', label: 'Frustrert', icon: Moon }
];

const SUPPORT_OPTIONS = [
    'Fysisk nærhet',
    'Verbal beroligelse',
    'Stillhet/ro',
    'Trykkstimulering',
    'Favorittgjenstand',
    'Favorittaktivitet',
    'Tid alene',
    'Frisk luft',
    'Mat/drikke',
    'Annet'
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface SliderInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    labels?: { low: string; mid: string; high: string };
    colorScheme?: 'green-red' | 'red-green' | 'purple';
}

const SliderInput = ({
    value,
    onChange,
    min = 1,
    max = 10,
    labels = { low: 'Lav', mid: 'Middels', high: 'Høy' },
    colorScheme = 'green-red'
}: SliderInputProps) => {
    const getColor = (val: number) => {
        const normalized = (val - min) / (max - min);
        if (colorScheme === 'green-red') {
            if (normalized < 0.33) return 'bg-emerald-500';
            if (normalized < 0.67) return 'bg-amber-500';
            return 'bg-red-500';
        }
        if (colorScheme === 'red-green') {
            if (normalized < 0.33) return 'bg-red-500';
            if (normalized < 0.67) return 'bg-amber-500';
            return 'bg-emerald-500';
        }
        return 'bg-purple-500';
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/50 px-1">
                <span>{labels.low}</span>
                <span>{labels.mid}</span>
                <span>{labels.high}</span>
            </div>
            <div className="flex gap-1">
                {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((num) => (
                    <button
                        key={num}
                        onClick={() => onChange(num)}
                        className={`
                            flex-1 h-10 rounded-lg font-medium text-sm
                            transition-all duration-200
                            ${value === num
                                ? `${getColor(num)} text-white shadow-lg`
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }
                        `}
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface ChipSelectorProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    getLabel?: (key: string) => string;
    maxVisible?: number;
}

const ChipSelector = ({
    options,
    selected,
    onChange,
    getLabel = (k) => k,
    maxVisible = 6
}: ChipSelectorProps) => {
    const [showAll, setShowAll] = useState(false);
    const visibleOptions = showAll ? options : options.slice(0, maxVisible);

    const toggle = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {visibleOptions.map((option) => (
                    <button
                        key={option}
                        onClick={() => toggle(option)}
                        className={`
                            px-3 py-2 rounded-xl text-sm font-medium
                            transition-all duration-200
                            ${selected.includes(option)
                                ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-300'
                                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                            }
                            border
                        `}
                    >
                        {getLabel(option)}
                    </button>
                ))}
            </div>
            {options.length > maxVisible && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                    {showAll ? 'Vis færre' : `Vis alle (${options.length})`}
                </button>
            )}
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CrisisReflection = ({
    crisisEvent,
    onComplete,
    onSkip
}: CrisisReflectionProps) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);

    // Form state
    const [immediateArousal, setImmediateArousal] = useState(5);
    const [immediateEnergy, setImmediateEnergy] = useState(5);
    const [immediateValence, setImmediateValence] = useState(5);
    const [emotionalState, setEmotionalState] = useState<ReflectionEmotionalState | undefined>();
    const [mostHelpfulStrategy, setMostHelpfulStrategy] = useState<string | undefined>();
    const [strategiesThatHelped, setStrategiesThatHelped] = useState<string[]>([]);
    const [strategiesThatDidntHelp, setStrategiesThatDidntHelp] = useState<string[]>([]);
    const [mainTrigger, setMainTrigger] = useState<string | undefined>();
    const [preventionIdeas, setPreventionIdeas] = useState<string[]>([]);
    const [supportNeeded, setSupportNeeded] = useState<string[]>([]);
    const [caregiverObservations, setCaregiverObservations] = useState('');

    // Steps definition
    const steps: ReflectionStep[] = useMemo(() => [
        {
            id: 'state',
            title: t('reflection.step1.title', 'Nåværende tilstand'),
            description: t('reflection.step1.desc', 'Hvordan har barnet det nå?'),
            icon: Heart
        },
        {
            id: 'helped',
            title: t('reflection.step2.title', 'Hva hjalp?'),
            description: t('reflection.step2.desc', 'Hvilke strategier fungerte?'),
            icon: Lightbulb
        },
        {
            id: 'trigger',
            title: t('reflection.step3.title', 'Hovedutløser'),
            description: t('reflection.step3.desc', 'Hva tror du utløste krisen?'),
            icon: Brain
        },
        {
            id: 'observations',
            title: t('reflection.step4.title', 'Observasjoner'),
            description: t('reflection.step4.desc', 'Dine refleksjoner'),
            icon: MessageSquare
        }
    ], [t]);

    const currentStepData = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const progress = ((currentStep + 1) / steps.length) * 100;

    // Navigation
    const goNext = useCallback(() => {
        if (isLastStep) {
            onComplete({
                crisisId: crisisEvent.id,
                immediateArousal,
                immediateEnergy,
                immediateValence,
                currentEmotionalState: emotionalState,
                mostHelpfulStrategy,
                strategiesThatHelped: strategiesThatHelped.length > 0 ? strategiesThatHelped : undefined,
                strategiesThatDidntHelp: strategiesThatDidntHelp.length > 0 ? strategiesThatDidntHelp : undefined,
                mainTriggerIdentified: mainTrigger,
                preventionIdeas: preventionIdeas.length > 0 ? preventionIdeas : undefined,
                supportNeeded: supportNeeded.length > 0 ? supportNeeded : undefined,
                caregiverObservations: caregiverObservations || undefined
            });
        } else {
            setCurrentStep(s => s + 1);
        }
    }, [
        isLastStep, onComplete, crisisEvent.id,
        immediateArousal, immediateEnergy, immediateValence,
        emotionalState, mostHelpfulStrategy,
        strategiesThatHelped, strategiesThatDidntHelp,
        mainTrigger, preventionIdeas, supportNeeded, caregiverObservations
    ]);

    const goBack = useCallback(() => {
        setCurrentStep(s => Math.max(0, s - 1));
    }, []);

    // Get triggers from the crisis event for the trigger step
    const allTriggers = useMemo(() => {
        const triggers = [
            ...crisisEvent.sensoryTriggers,
            ...crisisEvent.contextTriggers
        ];
        // Also add common triggers if not already included
        const commonTriggers = [...SENSORY_TRIGGER_KEYS.slice(0, 4), ...CONTEXT_TRIGGER_KEYS.slice(0, 4)];
        return [...new Set([...triggers, ...commonTriggers])];
    }, [crisisEvent]);

    // Get strategies used from the crisis event
    const allStrategies = useMemo(() => {
        const strategies = [...crisisEvent.strategiesUsed];
        // Add common strategies if not already included
        const commonStrategies = STRATEGY_KEYS.slice(0, 6);
        return [...new Set([...strategies, ...commonStrategies])];
    }, [crisisEvent]);

    // Render step content
    const renderStepContent = () => {
        switch (currentStepData.id) {
            case 'state':
                return (
                    <div className="space-y-6">
                        {/* Arousal level */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.arousal', 'Aktiveringsnivå')}
                                </span>
                            </div>
                            <SliderInput
                                value={immediateArousal}
                                onChange={setImmediateArousal}
                                colorScheme="green-red"
                            />
                        </div>

                        {/* Energy level */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Battery className="w-4 h-4 text-cyan-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.energy', 'Energinivå')}
                                </span>
                            </div>
                            <SliderInput
                                value={immediateEnergy}
                                onChange={setImmediateEnergy}
                                colorScheme="purple"
                            />
                        </div>

                        {/* Mood */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.mood', 'Humør')}
                                </span>
                            </div>
                            <SliderInput
                                value={immediateValence}
                                onChange={setImmediateValence}
                                colorScheme="red-green"
                            />
                        </div>

                        {/* Emotional state */}
                        <div className="space-y-3">
                            <span className="text-white/80 text-sm font-medium">
                                {t('reflection.emotionalState', 'Følelsesmessig tilstand')}
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                {EMOTIONAL_STATES.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setEmotionalState(value)}
                                        className={`
                                            p-3 rounded-xl flex flex-col items-center gap-1
                                            transition-all duration-200
                                            ${emotionalState === value
                                                ? 'bg-cyan-500/30 border-cyan-500/50'
                                                : 'bg-white/10 border-white/20 hover:bg-white/20'
                                            }
                                            border
                                        `}
                                    >
                                        <Icon className={`w-5 h-5 ${emotionalState === value ? 'text-cyan-300' : 'text-white/60'}`} />
                                        <span className={`text-xs ${emotionalState === value ? 'text-cyan-300' : 'text-white/60'}`}>
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'helped':
                return (
                    <div className="space-y-6">
                        {/* Strategies that helped */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Smile className="w-4 h-4 text-emerald-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.strategiesHelped', 'Strategier som hjalp')}
                                </span>
                            </div>
                            <ChipSelector
                                options={allStrategies}
                                selected={strategiesThatHelped}
                                onChange={setStrategiesThatHelped}
                                getLabel={(k) => getStrategyLabel(k, t)}
                            />
                        </div>

                        {/* Most helpful strategy */}
                        {strategiesThatHelped.length > 1 && (
                            <div className="space-y-3">
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.mostHelpful', 'Hvilken hjalp mest?')}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {strategiesThatHelped.map((strategy) => (
                                        <button
                                            key={strategy}
                                            onClick={() => setMostHelpfulStrategy(strategy)}
                                            className={`
                                                px-3 py-2 rounded-xl text-sm font-medium
                                                transition-all duration-200
                                                ${mostHelpfulStrategy === strategy
                                                    ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                                                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                                                }
                                                border
                                            `}
                                        >
                                            {getStrategyLabel(strategy, t)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Strategies that didn't help */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Meh className="w-4 h-4 text-amber-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.strategiesDidntHelp', 'Strategier som ikke fungerte')}
                                </span>
                            </div>
                            <ChipSelector
                                options={allStrategies.filter(s => !strategiesThatHelped.includes(s))}
                                selected={strategiesThatDidntHelp}
                                onChange={setStrategiesThatDidntHelp}
                                getLabel={(k) => getStrategyLabel(k, t)}
                            />
                        </div>

                        {/* Support needed */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.supportNeeded', 'Hva trengte de?')}
                                </span>
                            </div>
                            <ChipSelector
                                options={SUPPORT_OPTIONS}
                                selected={supportNeeded}
                                onChange={setSupportNeeded}
                            />
                        </div>
                    </div>
                );

            case 'trigger':
                return (
                    <div className="space-y-6">
                        {/* Main trigger */}
                        <div className="space-y-3">
                            <span className="text-white/80 text-sm font-medium">
                                {t('reflection.mainTrigger', 'Hva tror du var hovedutløseren?')}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {allTriggers.map((trigger) => {
                                    const isSensory = SENSORY_TRIGGER_KEYS.includes(trigger as typeof SENSORY_TRIGGER_KEYS[number]);
                                    const label = isSensory
                                        ? getSensoryTriggerLabel(trigger, t)
                                        : getContextTriggerLabel(trigger, t);
                                    return (
                                        <button
                                            key={trigger}
                                            onClick={() => setMainTrigger(trigger)}
                                            className={`
                                                px-3 py-2 rounded-xl text-sm font-medium
                                                transition-all duration-200
                                                ${mainTrigger === trigger
                                                    ? 'bg-amber-500/30 border-amber-500/50 text-amber-300'
                                                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                                                }
                                                border
                                            `}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Prevention ideas */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-400" />
                                <span className="text-white/80 text-sm font-medium">
                                    {t('reflection.preventionIdeas', 'Ideer for å forebygge')}
                                </span>
                            </div>
                            <ChipSelector
                                options={[
                                    'Tidligere varsler',
                                    'Endret rutine',
                                    'Redusert stimuli',
                                    'Mer forberedelse',
                                    'Flere pauser',
                                    'Annen plassering',
                                    'Alternativ aktivitet',
                                    'Ekstra støtte'
                                ]}
                                selected={preventionIdeas}
                                onChange={setPreventionIdeas}
                            />
                        </div>
                    </div>
                );

            case 'observations':
                return (
                    <div className="space-y-6">
                        {/* Caregiver observations */}
                        <div className="space-y-3">
                            <span className="text-white/80 text-sm font-medium">
                                {t('reflection.observations', 'Dine observasjoner og refleksjoner')}
                            </span>
                            <textarea
                                value={caregiverObservations}
                                onChange={(e) => setCaregiverObservations(e.target.value)}
                                placeholder={t('reflection.observationsPlaceholder', 'Hva la du merke til? Hva ville du gjort annerledes?')}
                                className="
                                    w-full h-32 p-4 rounded-xl
                                    bg-white/10 border border-white/20
                                    text-white placeholder-white/40
                                    resize-none focus:outline-none focus:border-cyan-500/50
                                "
                            />
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <span className="text-white/60 text-sm">
                                {t('reflection.summary', 'Oppsummering')}
                            </span>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <div className="text-lg font-semibold text-amber-400">{immediateArousal}</div>
                                    <div className="text-xs text-white/40">Aktivering</div>
                                </div>
                                <div className="p-2 rounded-lg bg-white/5">
                                    <div className="text-lg font-semibold text-cyan-400">{immediateEnergy}</div>
                                    <div className="text-xs text-white/40">Energi</div>
                                </div>
                                <div className="p-2 rounded-lg bg-white/5">
                                    <div className="text-lg font-semibold text-pink-400">{immediateValence}</div>
                                    <div className="text-xs text-white/40">Humør</div>
                                </div>
                            </div>
                            {strategiesThatHelped.length > 0 && (
                                <div className="text-sm text-white/60 mt-2">
                                    <span className="text-emerald-400">{strategiesThatHelped.length}</span> strategier hjalp
                                </div>
                            )}
                            {mainTrigger && (
                                <div className="text-sm text-white/60">
                                    Hovedutløser: <span className="text-amber-400">
                                        {SENSORY_TRIGGER_KEYS.includes(mainTrigger as typeof SENSORY_TRIGGER_KEYS[number])
                                            ? getSensoryTriggerLabel(mainTrigger, t)
                                            : getContextTriggerLabel(mainTrigger, t)
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black p-4"
        >
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-white">
                        {t('reflection.title', 'Refleksjon')}
                    </h2>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="text-white/50 hover:text-white/80 p-2"
                            aria-label={t('reflection.skip', 'Hopp over')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Step header */}
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <div className="
                        w-10 h-10 rounded-full
                        bg-cyan-500/20 border border-cyan-500/40
                        flex items-center justify-center
                    ">
                        <currentStepData.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {currentStepData.title}
                        </h3>
                        <p className="text-sm text-white/60">
                            {currentStepData.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="mb-8"
                >
                    {renderStepContent()}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
                {currentStep > 0 && (
                    <button
                        onClick={goBack}
                        className="
                            flex-1 py-3 px-4 rounded-xl
                            bg-white/10 border border-white/20
                            text-white/80 font-medium
                            flex items-center justify-center gap-2
                            active:bg-white/20 transition-colors
                        "
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('reflection.back', 'Tilbake')}
                    </button>
                )}
                <button
                    onClick={goNext}
                    className={`
                        flex-1 py-3 px-4 rounded-xl
                        font-semibold
                        flex items-center justify-center gap-2
                        transition-colors
                        ${isLastStep
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                        }
                    `}
                >
                    {isLastStep ? (
                        <>
                            <Check className="w-4 h-4" />
                            {t('reflection.complete', 'Fullfør')}
                        </>
                    ) : (
                        <>
                            {t('reflection.next', 'Neste')}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default CrisisReflection;
