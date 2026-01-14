/**
 * CrisisFloatingButton Component
 *
 * A floating action button (FAB) for instant crisis mode access from any screen.
 * Features:
 * - One-tap access with confirmation dialog
 * - Pre-fills context from AppContext
 * - High visibility red button with pulse animation
 * - Accessible with proper ARIA labels
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '../utils/platform';

// =============================================================================
// TYPES
// =============================================================================

interface CrisisFloatingButtonProps {
    /** Position of the button */
    position?: 'bottom-right' | 'bottom-left';
    /** Whether to show the button */
    visible?: boolean;
    /** Custom class name */
    className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CrisisFloatingButton = ({
    position = 'bottom-right',
    visible = true,
    className = ''
}: CrisisFloatingButtonProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Trigger haptic feedback helper
    const triggerHaptic = useCallback(async (type: 'warning' | 'success' | 'heavy') => {
        try {
            if (isNative()) {
                if (type === 'warning') {
                    await Haptics.notification({ type: NotificationType.Warning });
                } else if (type === 'success') {
                    await Haptics.notification({ type: NotificationType.Success });
                } else {
                    await Haptics.impact({ style: ImpactStyle.Heavy });
                }
            } else if ('vibrate' in navigator) {
                navigator.vibrate(type === 'heavy' ? [50, 30, 50] : 30);
            }
        } catch {
            // Haptics not available, silently ignore
        }
    }, []);

    // Handle initial button click - show confirmation
    const handleClick = useCallback(() => {
        triggerHaptic('warning');
        setShowConfirmation(true);
    }, [triggerHaptic]);

    // Handle confirmation - navigate to crisis mode
    const handleConfirm = useCallback(() => {
        triggerHaptic('heavy');
        setShowConfirmation(false);
        navigate('/crisis');
    }, [navigate, triggerHaptic]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        setShowConfirmation(false);
    }, []);

    // Position classes
    const positionClasses = position === 'bottom-right'
        ? 'right-4 bottom-20'
        : 'left-4 bottom-20';

    if (!visible) return null;

    return (
        <>
            {/* Main FAB Button */}
            <AnimatePresence>
                {!showConfirmation && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleClick}
                        className={`
                            fixed ${positionClasses} z-50
                            w-14 h-14 rounded-full
                            bg-gradient-to-br from-red-500 to-red-700
                            shadow-lg shadow-red-500/40
                            flex items-center justify-center
                            border-2 border-red-400/50
                            ${className}
                        `}
                        aria-label={t('crisis.fab.label', 'Start krisemodus')}
                    >
                        {/* Pulse Animation Ring */}
                        <span className="absolute inset-0 rounded-full animate-ping bg-red-400/30" />
                        <AlertTriangle className="w-6 h-6 text-white relative z-10" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Confirmation Dialog Overlay */}
            <AnimatePresence>
                {showConfirmation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4 bg-black/60"
                        onClick={handleCancel}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="
                                w-full max-w-sm p-4
                                bg-gradient-to-br from-red-900/95 to-gray-900/95
                                backdrop-blur-xl rounded-2xl
                                border border-red-500/30
                                shadow-xl shadow-red-500/20
                            "
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="
                                    w-10 h-10 rounded-full
                                    bg-red-500/20 border border-red-500/40
                                    flex items-center justify-center
                                ">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {t('crisis.fab.confirmTitle', 'Start krisemodus?')}
                                    </h3>
                                    <p className="text-sm text-white/60">
                                        {t('crisis.fab.confirmSubtitle', 'Timeren starter umiddelbart')}
                                    </p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="
                                        flex-1 py-3 px-4 rounded-xl
                                        bg-white/10 border border-white/20
                                        text-white/80 font-medium
                                        flex items-center justify-center gap-2
                                        active:bg-white/20 transition-colors
                                    "
                                    aria-label={t('crisis.fab.cancel', 'Avbryt')}
                                >
                                    <X className="w-4 h-4" />
                                    {t('crisis.fab.cancel', 'Avbryt')}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="
                                        flex-1 py-3 px-4 rounded-xl
                                        bg-gradient-to-r from-red-500 to-red-600
                                        text-white font-semibold
                                        flex items-center justify-center gap-2
                                        active:from-red-600 active:to-red-700 transition-colors
                                        shadow-lg shadow-red-500/30
                                    "
                                    aria-label={t('crisis.fab.confirm', 'Start')}
                                >
                                    <Check className="w-4 h-4" />
                                    {t('crisis.fab.confirm', 'Start')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CrisisFloatingButton;
