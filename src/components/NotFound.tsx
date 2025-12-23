import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const NotFound: React.FC = () => {
    const { t } = useTranslation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-[60vh] flex items-center justify-center p-4"
        >
            <div className="liquid-glass-card p-8 rounded-3xl max-w-md w-full text-center">
                <div className="bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="text-amber-400" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                    {t('notFound.title', '404')}
                </h1>
                <p className="text-slate-400 text-sm mb-6">
                    {t('notFound.message', 'Siden ble ikke funnet')}
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                >
                    <Home size={20} />
                    {t('notFound.homeLink', 'Gå til forsiden')}
                </Link>
            </div>
        </motion.div>
    );
};
