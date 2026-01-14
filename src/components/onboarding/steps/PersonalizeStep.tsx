/**
 * PersonalizeStep Component
 *
 * Optional step to set up triggers and strategies.
 * Combines the old TriggersStep and StrategiesStep into one
 * scrollable, skippable step.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, ArrowRight, ArrowLeft, Check, Zap, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { useChildProfile, useSettings } from '../../../store';

interface PersonalizeStepProps {
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

// Common triggers that parents often report
const COMMON_TRIGGERS = [
    { id: 'loud_sounds', label: 'Høye lyder' },
    { id: 'bright_lights', label: 'Sterkt lys' },
    { id: 'hunger', label: 'Sult' },
    { id: 'tiredness', label: 'Trøtthet' },
    { id: 'transitions', label: 'Overganger' },
    { id: 'unexpected_changes', label: 'Uventede endringer' },
    { id: 'social_pressure', label: 'Sosialt press' },
    { id: 'clothing_tags', label: 'Klesmerker' },
    { id: 'many_impressions', label: 'Mange inntrykk' },
    { id: 'demands', label: 'Krav' }
];

// Common strategies that work for many children
const COMMON_STRATEGIES = [
    { id: 'screen_time', label: 'Skjermtid' },
    { id: 'weighted_blanket', label: 'Tungt teppe' },
    { id: 'alone_time', label: 'Alenetid' },
    { id: 'deep_breathing', label: 'Dyp pust' },
    { id: 'squeeze_ball', label: 'Klemmeball' },
    { id: 'ear_defenders', label: 'Hørselvern' },
    { id: 'trampoline', label: 'Trampoline' },
    { id: 'warm_drink', label: 'Varm drikke' },
    { id: 'music', label: 'Musikk' },
    { id: 'reading', label: 'Lese bok' }
];

interface ChipButtonProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
    colorScheme: 'red' | 'green';
}

const ChipButton: React.FC<ChipButtonProps> = ({ label, isSelected, onClick, colorScheme }) => {
    const colors = colorScheme === 'red'
        ? 'bg-red-500/20 text-red-100 border-red-500/40'
        : 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40';

    return (
        <button
            onClick={onClick}
            className={`
                px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 border
                flex items-center gap-1.5
                ${isSelected
                    ? colors
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }
            `}
        >
            {isSelected && <Check className="w-3.5 h-3.5" />}
            {label}
        </button>
    );
};

interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    selectedCount: number;
    colorScheme: 'red' | 'green';
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    isExpanded,
    onToggle,
    children,
    selectedCount,
    colorScheme
}) => {
    const badgeColor = colorScheme === 'red' ? 'bg-red-500/30 text-red-200' : 'bg-emerald-500/30 text-emerald-200';

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-white font-medium">{title}</span>
                    {selectedCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                            {selectedCount}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                )}
            </button>
            <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <div className="p-4 pt-0">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

export const PersonalizeStep: React.FC<PersonalizeStepProps> = ({ onNext, onSkip, onBack }) => {
    const { childProfile, updateChildProfile } = useChildProfile();
    const { completeOnboarding } = useSettings();

    const [selectedTriggers, setSelectedTriggers] = useState<string[]>(
        childProfile?.sensorySensitivities || []
    );
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>(
        childProfile?.effectiveStrategies || []
    );
    const [triggersExpanded, setTriggersExpanded] = useState(true);
    const [strategiesExpanded, setStrategiesExpanded] = useState(false);

    const toggleTrigger = (triggerId: string) => {
        setSelectedTriggers(prev =>
            prev.includes(triggerId)
                ? prev.filter(t => t !== triggerId)
                : [...prev, triggerId]
        );
    };

    const toggleStrategy = (strategyId: string) => {
        setSelectedStrategies(prev =>
            prev.includes(strategyId)
                ? prev.filter(s => s !== strategyId)
                : [...prev, strategyId]
        );
    };

    const handleSaveAndContinue = () => {
        // Convert IDs to labels for storage
        const triggerLabels = selectedTriggers.map(id =>
            COMMON_TRIGGERS.find(t => t.id === id)?.label || id
        );
        const strategyLabels = selectedStrategies.map(id =>
            COMMON_STRATEGIES.find(s => s.id === id)?.label || id
        );

        updateChildProfile({
            sensorySensitivities: triggerLabels,
            effectiveStrategies: strategyLabels
        });
        completeOnboarding();
        onNext();
    };

    const handleSkip = () => {
        completeOnboarding();
        onSkip();
    };

    const hasSelections = selectedTriggers.length > 0 || selectedStrategies.length > 0;

    return (
        <div className="flex flex-col items-center text-center space-y-5 w-full">
            {/* Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-purple-500/30"
            >
                <Sliders className="text-purple-300 w-8 h-8" />
            </motion.div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
            >
                <h2 className="text-2xl font-bold text-white">
                    Tilpass til barnet
                </h2>
                <p className="text-white/60 text-sm">
                    Velg kjente triggere og strategier (valgfritt)
                </p>
            </motion.div>

            {/* Collapsible Sections */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full space-y-3"
            >
                {/* Triggers Section */}
                <CollapsibleSection
                    title="Vanlige triggere"
                    icon={<Zap className="w-5 h-5 text-red-400" />}
                    isExpanded={triggersExpanded}
                    onToggle={() => setTriggersExpanded(!triggersExpanded)}
                    selectedCount={selectedTriggers.length}
                    colorScheme="red"
                >
                    <div className="flex flex-wrap gap-2">
                        {COMMON_TRIGGERS.map(trigger => (
                            <ChipButton
                                key={trigger.id}
                                label={trigger.label}
                                isSelected={selectedTriggers.includes(trigger.id)}
                                onClick={() => toggleTrigger(trigger.id)}
                                colorScheme="red"
                            />
                        ))}
                    </div>
                </CollapsibleSection>

                {/* Strategies Section */}
                <CollapsibleSection
                    title="Beroligende strategier"
                    icon={<Heart className="w-5 h-5 text-emerald-400" />}
                    isExpanded={strategiesExpanded}
                    onToggle={() => setStrategiesExpanded(!strategiesExpanded)}
                    selectedCount={selectedStrategies.length}
                    colorScheme="green"
                >
                    <div className="flex flex-wrap gap-2">
                        {COMMON_STRATEGIES.map(strategy => (
                            <ChipButton
                                key={strategy.id}
                                label={strategy.label}
                                isSelected={selectedStrategies.includes(strategy.id)}
                                onClick={() => toggleStrategy(strategy.id)}
                                colorScheme="green"
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full space-y-3 pt-2"
            >
                <div className="flex gap-3">
                    {/* Back */}
                    <button
                        onClick={onBack}
                        className="
                            flex-shrink-0 p-3 rounded-xl
                            bg-white/5 border border-white/10
                            text-white/60 hover:text-white hover:bg-white/10
                            transition-all
                        "
                        aria-label="Tilbake"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Continue */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveAndContinue}
                        className={`
                            flex-1 py-3 px-6 rounded-xl
                            font-semibold
                            flex items-center justify-center gap-2
                            transition-all
                            ${hasSelections
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                            }
                        `}
                    >
                        {hasSelections ? 'Lagre og fortsett' : 'Fortsett'}
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>

                {/* Skip option */}
                <button
                    onClick={handleSkip}
                    className="
                        w-full py-2 text-sm
                        text-white/50 hover:text-white/80
                        transition-colors
                    "
                >
                    Hopp over, jeg gjør dette senere
                </button>
            </motion.div>
        </div>
    );
};
