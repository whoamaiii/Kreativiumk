import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    itemCount?: number;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultExpanded = false,
    itemCount
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const contentId = useId();
    const headingId = useId();

    return (
        <div className="space-y-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-1 py-2 group rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-black"
                aria-expanded={isExpanded}
                aria-controls={contentId}
            >
                <div className="flex items-center gap-2">
                    <h2
                        id={headingId}
                        className="text-sm font-semibold text-slate-400 uppercase tracking-wider"
                    >
                        {title}
                    </h2>
                    {itemCount !== undefined && !isExpanded && (
                        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                            {itemCount}
                        </span>
                    )}
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-500 group-hover:text-slate-400 transition-colors"
                >
                    <ChevronDown size={18} />
                </motion.div>
            </button>

            <AnimatePresence initial={false} mode="sync">
                {isExpanded && (
                    <motion.div
                        id={contentId}
                        role="region"
                        aria-labelledby={headingId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
