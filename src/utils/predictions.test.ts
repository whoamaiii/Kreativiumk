import { describe, it, expect } from 'vitest';
import { calculateRiskForecast } from './predictions';
import type { LogEntry } from '../types';

describe('calculateRiskForecast', () => {
    it('returns low risk with empty logs', () => {
        const result = calculateRiskForecast([]);
        expect(result.level).toBe('low');
        expect(result.score).toBe(0);
        expect(result.contributingFactors).toEqual([]);
    });

    it('returns not enough data message with few logs', () => {
        const logs: LogEntry[] = [
            createMockLog(5, new Date()),
            createMockLog(3, new Date()),
        ];
        const result = calculateRiskForecast(logs);
        expect(result.level).toBe('low');
        expect(result.contributingFactors[0].key).toBe('risk.factors.notEnoughData');
    });

    it('detects high arousal patterns', () => {
        const now = new Date();
        const logs: LogEntry[] = [];

        // Create 5 logs on same day of week within 30-day window, all with high arousal
        for (let i = 0; i < 5; i++) {
            const date = new Date(now.getTime() - (7 * i * 24 * 60 * 60 * 1000)); // Same day of week, going back weeks
            logs.push(createMockLog(8, date)); // High arousal
        }

        const result = calculateRiskForecast(logs);
        expect(result.score).toBeGreaterThan(50);
    });

    it('only considers logs from the last 30 days', () => {
        const now = new Date();
        const logs: LogEntry[] = [];

        // Create 5 logs at 35 days ago (should be excluded from analysis)
        for (let i = 0; i < 5; i++) {
            const date = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000));
            date.setHours(date.getHours() + i); // Spread them out slightly
            logs.push(createMockLog(9, date)); // Very high arousal
        }

        const result = calculateRiskForecast(logs);
        // Should return not enough data since all logs are outside 30-day window
        expect(result.contributingFactors[0].key).toBe('risk.factors.notEnoughData');
    });

    it('returns calm period factor when arousal is low', () => {
        const now = new Date();
        const logs: LogEntry[] = [];

        // Create 5 logs on same day of week with low arousal
        for (let i = 0; i < 5; i++) {
            const date = new Date(now.getTime() - (7 * i * 24 * 60 * 60 * 1000));
            logs.push(createMockLog(3, date)); // Low arousal
        }

        const result = calculateRiskForecast(logs);
        expect(result.level).toBe('low');
        expect(result.contributingFactors[0].key).toBe('risk.factors.calmPeriod');
    });
});

function createMockLog(arousal: number, timestamp: Date): LogEntry {
    return {
        id: crypto.randomUUID(),
        timestamp: timestamp.toISOString(),
        context: 'home',
        arousal,
        valence: 5,
        energy: 5,
        sensoryTriggers: [],
        contextTriggers: [],
        strategies: [],
        strategyEffectiveness: 'helped',
        duration: 30,
        note: '',
        dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][timestamp.getDay()] as LogEntry['dayOfWeek'],
        timeOfDay: 'afternoon',
        hourOfDay: timestamp.getHours(),
    };
}
