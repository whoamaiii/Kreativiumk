/**
 * ProfileStep Component
 *
 * Collects the child's name - the only required field.
 * Simple and focused.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useChildProfile } from '../../../store';
import { useTranslation } from 'react-i18next';

interface ProfileStepProps {
    onNext: () => void;
    onBack: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ onNext, onBack }) => {
    const { childProfile, setChildProfile } = useChildProfile();
    const { t } = useTranslation();
    const [name, setName] = useState(childProfile?.name || '');
    const [isFocused, setIsFocused] = useState(false);
    const [showError, setShowError] = useState(false);
    const [hasAttempted, setHasAttempted] = useState(false);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        // Clear error when user starts typing
        if (e.target.value.trim()) {
            setShowError(false);
        }
    };

    const handleNext = () => {
        setHasAttempted(true);
        if (!name.trim()) {
            setShowError(true);
            return;
        }

        setChildProfile({
            id: childProfile?.id || crypto.randomUUID(),
            name: name.trim(),
            diagnoses: childProfile?.diagnoses || [],
            communicationStyle: childProfile?.communicationStyle || 'verbal',
            sensorySensitivities: childProfile?.sensorySensitivities || [],
            seekingSensory: childProfile?.seekingSensory || [],
            effectiveStrategies: childProfile?.effectiveStrategies || [],
            createdAt: childProfile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        onNext();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && name.trim()) {
            handleNext();
        }
    };

    return (
        <div className="flex flex-col items-center text-center space-y-6 w-full">
            {/* Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-blue-500/30"
            >
                <User className="text-blue-300 w-8 h-8" />
            </motion.div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
            >
                <h2 className="text-2xl font-bold text-white">
                    {t('onboarding.profile.title')}
                </h2>
                <p className="text-white/60">
                    {t('onboarding.profile.subtitle', 'We personalize the app for your child')}
                </p>
            </motion.div>

            {/* Input */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full space-y-2"
            >
                <label className="block text-left text-sm text-white/60 mb-1">
                    {t('onboarding.profile.nameLabel')}
                </label>
                <div
                    className={`
                        bg-white/5 border rounded-xl p-1 transition-all duration-300
                        ${showError
                            ? 'border-red-500/50 shadow-lg shadow-red-500/10'
                            : isFocused
                                ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                                : 'border-white/10'
                        }
                    `}
                >
                    <input
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('onboarding.profile.namePlaceholder')}
                        aria-invalid={showError}
                        aria-describedby={showError ? 'name-error' : undefined}
                        className="
                            w-full bg-transparent px-4 py-3
                            text-white text-lg text-center
                            placeholder:text-white/30
                            focus:outline-none
                        "
                        autoFocus
                    />
                </div>

                {/* Error message */}
                <AnimatePresence>
                    {showError && (
                        <motion.div
                            id="name-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-center gap-2 text-red-400 text-sm"
                            role="alert"
                        >
                            <AlertCircle size={14} />
                            <span>{t('onboarding.profile.nameRequired')}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showError && (
                    <p className="text-white/40 text-xs">
                        {t('onboarding.profile.hint', 'You can change this in settings later')}
                    </p>
                )}
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full flex gap-3 pt-4"
            >
                {/* Back */}
                <button
                    onClick={onBack}
                    className="
                        flex-shrink-0 p-3 rounded-xl
                        bg-white/5 border border-white/10
                        text-white/60 hover:text-white hover:bg-white/10
                        transition-all
                    "
                    aria-label={t('onboarding.profile.back')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Next - clickable even when empty to show validation error */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    className={`
                        flex-1 py-3 px-6 rounded-xl
                        font-semibold text-lg
                        flex items-center justify-center gap-2
                        transition-all
                        ${name.trim()
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                            : hasAttempted && !name.trim()
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-gradient-to-r from-cyan-500/50 to-cyan-600/50 text-white/70 shadow-lg shadow-cyan-500/15'
                        }
                    `}
                >
                    {t('onboarding.profile.next')}
                    <ArrowRight className="w-5 h-5" />
                </motion.button>
            </motion.div>
        </div>
    );
};
