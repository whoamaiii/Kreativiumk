import React, { useMemo } from 'react';
import { useLogs, useSettings } from '../store';
import { calculateRiskForecast } from '../utils/predictions';
import { CloudRain, CloudSun, Sun, AlertOctagon, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const RiskForecast: React.FC = () => {
    const { logs } = useLogs();
    const { analysisSettings } = useSettings();
    const { t } = useTranslation();

    const forecast = useMemo(() => {
        try {
            // Use user's analysis settings for decay half-life (with fallback to default 7 days)
            return calculateRiskForecast(logs, {
                recencyDecayHalfLife: analysisSettings?.recencyDecayHalfLife ?? 7,
            });
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Error calculating risk forecast:', error);
            }
            return {
                level: 'low' as const,
                score: 0,
                contributingFactors: [{ key: 'risk.error.calculation' }]
            };
        }
    }, [logs, analysisSettings]);

    const getIcon = () => {
        switch (forecast.level) {
            case 'high': return <CloudRain className="text-white" size={48} />;
            case 'moderate': return <CloudSun className="text-white" size={48} />;
            case 'low': return <Sun className="text-yellow-300" size={48} />;
        }
    };

    const getGlassClass = () => {
        switch (forecast.level) {
            case 'high': return 'liquid-glass-red';
            case 'moderate': return 'liquid-glass-orange';
            case 'low': return 'liquid-glass-blue';
        }
    };

    const getTitle = () => {
        switch (forecast.level) {
            case 'high': return t('risk.level.high');
            case 'moderate': return t('risk.level.moderate');
            case 'low': return t('risk.level.low');
        }
    };

    const getIconGlow = () => {
        switch (forecast.level) {
            case 'high': return 'drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]';
            case 'moderate': return 'drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]';
            case 'low': return 'drop-shadow-[0_0_25px_rgba(250,204,21,0.7)]';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${getGlassClass()}`}
        >
            {/* Texture overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 filter contrast-125" />

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md w-fit">
                        <span className="text-xs font-bold uppercase tracking-wide">{t('risk.title.today')}</span>
                    </div>

                    <h2 className="text-2xl font-bold mt-2 mb-1 shadow-black/10 drop-shadow-md">
                        {getTitle()}
                    </h2>

                    {forecast.predictedHighArousalTime && (
                        <div className="flex items-center gap-2 mt-2 text-white/90 font-medium bg-black/10 px-3 py-1.5 rounded-lg w-fit">
                            <AlertOctagon size={16} />
                            <span>{t('risk.obs', { time: forecast.predictedHighArousalTime })}</span>
                        </div>
                    )}
                </div>

                {/* Floating icon with glow effect */}
                <div className={`${getIconGlow()} transition-all`}>
                    {getIcon()}
                </div>
            </div>

            <div className="relative z-10 mt-4 pt-3 border-t border-white/20">
                <div className="flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0 opacity-70" />
                    <p className="text-sm font-medium leading-relaxed opacity-80">
                        {forecast.contributingFactors?.[0]
                            ? t(forecast.contributingFactors[0].key, forecast.contributingFactors[0].params)
                            : t('risk.factors.unknown')
                        }
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
