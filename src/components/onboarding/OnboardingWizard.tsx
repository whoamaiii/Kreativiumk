/**
 * OnboardingWizard Component
 *
 * A streamlined 3-step onboarding flow for new users:
 * 1. Welcome - Quick value proposition with explore option
 * 2. Profile - Child's name (required)
 * 3. Personalize - Optional triggers/strategies setup
 * 4. Completion - Celebration and next steps
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StartStep } from './steps/StartStep';
import { ProfileStep } from './steps/ProfileStep';
import { PersonalizeStep } from './steps/PersonalizeStep';
import { CompletionStep } from './steps/CompletionStep';
import { useSettings } from '../../store';

type OnboardingStep = 'start' | 'profile' | 'personalize' | 'completion';

export const OnboardingWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('start');
    const navigate = useNavigate();
    const { completeOnboarding } = useSettings();

    // Step order for progress calculation
    const stepOrder: OnboardingStep[] = ['start', 'profile', 'personalize', 'completion'];
    const currentStepIndex = stepOrder.indexOf(currentStep);
    const progress = ((currentStepIndex) / (stepOrder.length - 1)) * 100;

    const handleQuickStart = () => {
        // User chose to explore without setup - complete onboarding
        completeOnboarding();
        navigate('/', { replace: true });
    };

    const handleComplete = () => {
        navigate('/', { replace: true });
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'start':
                return (
                    <StartStep
                        onNext={() => setCurrentStep('profile')}
                        onQuickStart={handleQuickStart}
                    />
                );
            case 'profile':
                return (
                    <ProfileStep
                        onNext={() => setCurrentStep('personalize')}
                        onBack={() => setCurrentStep('start')}
                    />
                );
            case 'personalize':
                return (
                    <PersonalizeStep
                        onNext={() => setCurrentStep('completion')}
                        onSkip={() => setCurrentStep('completion')}
                        onBack={() => setCurrentStep('profile')}
                    />
                );
            case 'completion':
                return (
                    <CompletionStep onComplete={handleComplete} />
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-black overflow-y-auto">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden -z-10">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.15, 0.25, 0.15]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"
                />
            </div>

            <div className="w-full max-w-md px-6 py-8 relative z-10">
                {/* Progress Bar - Only show after start */}
                {currentStep !== 'start' && currentStep !== 'completion' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex justify-between text-xs text-white/40 mb-2 px-1">
                            <span>Profil</span>
                            <span>Tilpasning</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col items-center"
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
