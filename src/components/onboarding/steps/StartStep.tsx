/**
 * StartStep Component
 *
 * Welcome screen with two options:
 * 1. Start guided setup (2 min)
 * 2. Quick start to explore
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, BarChart3, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StartStepProps {
    onNext: () => void;
    onQuickStart: () => void;
}

const FeatureItem: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({ icon, text, delay }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="flex items-center gap-3 text-white/70 text-sm"
    >
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            {icon}
        </div>
        <span>{text}</span>
    </motion.div>
);

export const StartStep: React.FC<StartStepProps> = ({ onNext, onQuickStart }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center text-center space-y-6 w-full">
            {/* Logo/Icon */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg"
            >
                <Sparkles className="text-cyan-300 w-10 h-10" />
            </motion.div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
            >
                <h1 className="text-3xl font-bold text-white">
                    {t('onboarding.appName')}
                </h1>
                <p className="text-white/60 text-lg">
                    {t('onboarding.tagline')}
                </p>
            </motion.div>

            {/* Features */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full space-y-3 py-4"
            >
                <FeatureItem
                    icon={<Zap className="w-4 h-4 text-amber-400" />}
                    text={t('onboarding.features.quickLogging')}
                    delay={0.4}
                />
                <FeatureItem
                    icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
                    text={t('onboarding.features.patterns')}
                    delay={0.5}
                />
                <FeatureItem
                    icon={<Shield className="w-4 h-4 text-emerald-400" />}
                    text={t('onboarding.features.privacy')}
                    delay={0.6}
                />
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="w-full space-y-3 pt-4"
            >
                {/* Primary: Start Setup */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onNext}
                    className="
                        w-full py-4 px-6 rounded-xl
                        bg-gradient-to-r from-cyan-500 to-cyan-600
                        text-white font-semibold text-lg
                        flex items-center justify-center gap-2
                        shadow-lg shadow-cyan-500/25
                        transition-all hover:shadow-cyan-500/40
                    "
                >
                    {t('onboarding.startSetup')}
                    <ArrowRight className="w-5 h-5" />
                </motion.button>

                <p className="text-white/40 text-xs">
                    {t('onboarding.setupTime')}
                </p>

                {/* Secondary: Quick Start */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onQuickStart}
                    className="
                        w-full py-3 px-6 rounded-xl
                        bg-white/5 border border-white/10
                        text-white/70 font-medium
                        transition-all hover:bg-white/10 hover:text-white
                    "
                >
                    {t('onboarding.exploreFirst')}
                </motion.button>
            </motion.div>
        </div>
    );
};
