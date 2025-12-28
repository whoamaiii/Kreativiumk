import { describe, it, expect } from 'vitest';
import {
    safeParseTimestamp,
    safeParseTimestampWithFallback,
    isValidTimestamp,
} from './dateUtils';

describe('dateUtils', () => {
    describe('safeParseTimestamp', () => {
        it('parses valid ISO string', () => {
            const isoString = '2025-01-15T10:30:00.000Z';
            const result = safeParseTimestamp(isoString);
            expect(result).toBe(new Date(isoString).getTime());
        });

        it('parses valid Date object', () => {
            const date = new Date('2025-01-15T10:30:00.000Z');
            const result = safeParseTimestamp(date);
            expect(result).toBe(date.getTime());
        });

        it('returns null for null input', () => {
            expect(safeParseTimestamp(null)).toBeNull();
        });

        it('returns null for undefined input', () => {
            expect(safeParseTimestamp(undefined)).toBeNull();
        });

        it('returns null for empty string', () => {
            expect(safeParseTimestamp('')).toBeNull();
        });

        it('returns null for invalid date string', () => {
            expect(safeParseTimestamp('not-a-date')).toBeNull();
        });

        it('returns null for invalid ISO string', () => {
            expect(safeParseTimestamp('2025-13-45T99:99:99.000Z')).toBeNull();
        });

        it('handles date-only string', () => {
            const result = safeParseTimestamp('2025-01-15');
            expect(result).not.toBeNull();
            expect(typeof result).toBe('number');
        });

        it('handles timestamp at epoch', () => {
            const result = safeParseTimestamp('1970-01-01T00:00:00.000Z');
            expect(result).toBe(0);
        });

        it('handles future dates', () => {
            const futureDate = '2099-12-31T23:59:59.999Z';
            const result = safeParseTimestamp(futureDate);
            expect(result).toBe(new Date(futureDate).getTime());
        });
    });

    describe('safeParseTimestampWithFallback', () => {
        it('returns parsed timestamp for valid input', () => {
            const isoString = '2025-01-15T10:30:00.000Z';
            const result = safeParseTimestampWithFallback(isoString);
            expect(result).toBe(new Date(isoString).getTime());
        });

        it('returns default fallback (0) for null', () => {
            expect(safeParseTimestampWithFallback(null)).toBe(0);
        });

        it('returns default fallback (0) for undefined', () => {
            expect(safeParseTimestampWithFallback(undefined)).toBe(0);
        });

        it('returns custom fallback for invalid input', () => {
            expect(safeParseTimestampWithFallback('invalid', -1)).toBe(-1);
        });

        it('returns custom fallback for null with custom value', () => {
            expect(safeParseTimestampWithFallback(null, 999)).toBe(999);
        });

        it('returns 0 for empty string with default fallback', () => {
            expect(safeParseTimestampWithFallback('')).toBe(0);
        });

        it('handles Date object input', () => {
            const date = new Date('2025-06-15T12:00:00.000Z');
            const result = safeParseTimestampWithFallback(date);
            expect(result).toBe(date.getTime());
        });
    });

    describe('isValidTimestamp', () => {
        it('returns true for valid ISO string', () => {
            expect(isValidTimestamp('2025-01-15T10:30:00.000Z')).toBe(true);
        });

        it('returns true for date-only string', () => {
            expect(isValidTimestamp('2025-01-15')).toBe(true);
        });

        it('returns false for null', () => {
            expect(isValidTimestamp(null)).toBe(false);
        });

        it('returns false for undefined', () => {
            expect(isValidTimestamp(undefined)).toBe(false);
        });

        it('returns false for invalid string', () => {
            expect(isValidTimestamp('not-a-date')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isValidTimestamp('')).toBe(false);
        });

        it('returns true for epoch timestamp', () => {
            expect(isValidTimestamp('1970-01-01T00:00:00.000Z')).toBe(true);
        });

        it('returns false for malformed date', () => {
            expect(isValidTimestamp('2025-99-99')).toBe(false);
        });
    });
});
