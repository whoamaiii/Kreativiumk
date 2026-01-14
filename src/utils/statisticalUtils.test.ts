/**
 * Comprehensive tests for statistical utilities
 * These tests verify correctness against known statistical values
 */

import { describe, it, expect } from 'vitest';
import {
    chiSquaredPValue,
    bonferroniCorrection,
    benjaminiHochbergCorrection,
    wilsonScoreInterval,
    bootstrapMeanCI,
    calculateQuantileThresholds,
    assignToBin,
    mannKendallTest,
    detectOutliersIQR,
    detectDataQualityIssues,
    cohensD,
    interpretEffectSize,
    trainTestSplit,
    calibrationCheck
} from './statisticalUtils';

// ============================================
// CHI-SQUARED P-VALUE TESTS
// ============================================

describe('chiSquaredPValue', () => {
    it('should return 1 for chi-squared = 0', () => {
        expect(chiSquaredPValue(0, 1)).toBe(1);
    });

    it('should return 1 for negative chi-squared', () => {
        expect(chiSquaredPValue(-1, 1)).toBe(1);
    });

    it('should return 1 for invalid df', () => {
        expect(chiSquaredPValue(5, 0)).toBe(1);
        expect(chiSquaredPValue(5, -1)).toBe(1);
    });

    // Known values from chi-squared distribution tables (df=1)
    // χ² = 3.841 corresponds to p = 0.05
    it('should return approximately 0.05 for chi-squared = 3.841 (df=1)', () => {
        const pValue = chiSquaredPValue(3.841, 1);
        expect(pValue).toBeGreaterThan(0.045);
        expect(pValue).toBeLessThan(0.055);
    });

    // χ² = 6.635 corresponds to p = 0.01
    it('should return approximately 0.01 for chi-squared = 6.635 (df=1)', () => {
        const pValue = chiSquaredPValue(6.635, 1);
        expect(pValue).toBeGreaterThan(0.008);
        expect(pValue).toBeLessThan(0.012);
    });

    // χ² = 10.828 corresponds to p = 0.001
    it('should return approximately 0.001 for chi-squared = 10.828 (df=1)', () => {
        const pValue = chiSquaredPValue(10.828, 1);
        expect(pValue).toBeGreaterThan(0.0005);
        expect(pValue).toBeLessThan(0.002);
    });

    // Large chi-squared should give very small p-value
    it('should return very small p-value for large chi-squared', () => {
        const pValue = chiSquaredPValue(20, 1);
        expect(pValue).toBeLessThan(0.0001);
    });

    // Test with df > 1
    // χ² = 5.991 corresponds to p = 0.05 for df=2
    it('should return approximately 0.05 for chi-squared = 5.991 (df=2)', () => {
        const pValue = chiSquaredPValue(5.991, 2);
        expect(pValue).toBeGreaterThan(0.04);
        expect(pValue).toBeLessThan(0.06);
    });
});

// ============================================
// MULTIPLE COMPARISON CORRECTION TESTS
// ============================================

describe('bonferroniCorrection', () => {
    it('should correctly divide significance level by number of tests', () => {
        const pValues = [0.009, 0.02, 0.03, 0.04, 0.05]; // 0.009 < 0.01, others >= 0.01
        const result = bonferroniCorrection(pValues, 0.05);

        expect(result.correctedAlpha).toBe(0.01); // 0.05 / 5
        expect(result.significant).toEqual([true, false, false, false, false]); // Only first is < 0.01
    });

    it('should handle single test', () => {
        const pValues = [0.03];
        const result = bonferroniCorrection(pValues, 0.05);

        expect(result.correctedAlpha).toBe(0.05);
        expect(result.significant).toEqual([true]);
    });

    it('should handle all significant results', () => {
        const pValues = [0.001, 0.002, 0.003];
        const result = bonferroniCorrection(pValues, 0.05);

        expect(result.correctedAlpha).toBeCloseTo(0.0167, 3);
        expect(result.significant).toEqual([true, true, true]);
    });

    it('should handle all non-significant results', () => {
        const pValues = [0.5, 0.6, 0.7];
        const result = bonferroniCorrection(pValues, 0.05);

        expect(result.significant).toEqual([false, false, false]);
    });
});

describe('benjaminiHochbergCorrection', () => {
    it('should correctly apply FDR correction', () => {
        // Example from Benjamini-Hochberg 1995 paper
        const pValues = [0.001, 0.008, 0.039, 0.041, 0.042, 0.060, 0.074, 0.205];
        const result = benjaminiHochbergCorrection(pValues, 0.05);

        // With FDR = 0.05, first 4 should be significant
        // p[1] = 0.001 < 0.05 * 1/8 = 0.00625 ✓
        // p[2] = 0.008 < 0.05 * 2/8 = 0.0125 ✓
        // p[3] = 0.039 < 0.05 * 3/8 = 0.01875 ✗ (but adjusted)
        // The step-up procedure gives different results
        expect(result.significant[0]).toBe(true);  // 0.001
        expect(result.significant[1]).toBe(true);  // 0.008
    });

    it('should handle empty array', () => {
        const result = benjaminiHochbergCorrection([], 0.05);
        expect(result.adjustedPValues).toEqual([]);
        expect(result.significant).toEqual([]);
    });

    it('should handle single p-value', () => {
        const result = benjaminiHochbergCorrection([0.03], 0.05);
        expect(result.adjustedPValues[0]).toBe(0.03);
        expect(result.significant[0]).toBe(true);
    });

    it('should not produce adjusted p-values greater than 1', () => {
        const pValues = [0.1, 0.2, 0.3, 0.4, 0.5];
        const result = benjaminiHochbergCorrection(pValues, 0.05);

        result.adjustedPValues.forEach(p => {
            expect(p).toBeLessThanOrEqual(1);
        });
    });

    it('should preserve order monotonicity in adjusted p-values', () => {
        const pValues = [0.001, 0.01, 0.02, 0.05, 0.10];
        const result = benjaminiHochbergCorrection(pValues, 0.05);

        // Adjusted p-values should be monotonically non-decreasing
        for (let i = 1; i < result.adjustedPValues.length; i++) {
            expect(result.adjustedPValues[i]).toBeGreaterThanOrEqual(
                result.adjustedPValues[i - 1]
            );
        }
    });

    it('should be less conservative than Bonferroni', () => {
        const pValues = [0.001, 0.008, 0.020, 0.030, 0.040];

        const bhResult = benjaminiHochbergCorrection(pValues, 0.05);
        const bfResult = bonferroniCorrection(pValues, 0.05);

        // Count significant results
        const bhSignificant = bhResult.significant.filter(s => s).length;
        const bfSignificant = bfResult.significant.filter(s => s).length;

        // B-H should find at least as many significant results as Bonferroni
        expect(bhSignificant).toBeGreaterThanOrEqual(bfSignificant);
    });
});

// ============================================
// CONFIDENCE INTERVAL TESTS
// ============================================

describe('wilsonScoreInterval', () => {
    it('should return [0, 1] for total = 0', () => {
        const result = wilsonScoreInterval(0, 0, 0.95);
        expect(result.lower).toBe(0);
        expect(result.upper).toBe(1);
        expect(result.point).toBe(0);
    });

    it('should calculate correct point estimate', () => {
        const result = wilsonScoreInterval(30, 100, 0.95);
        expect(result.point).toBe(0.3);
    });

    it('should contain the true proportion', () => {
        // For 50/100 successes, the 95% CI should contain 0.5
        const result = wilsonScoreInterval(50, 100, 0.95);
        expect(result.lower).toBeLessThan(0.5);
        expect(result.upper).toBeGreaterThan(0.5);
    });

    it('should handle 0 successes correctly', () => {
        const result = wilsonScoreInterval(0, 100, 0.95);
        expect(result.lower).toBe(0);
        expect(result.upper).toBeGreaterThan(0);
        expect(result.upper).toBeLessThan(0.1); // Should be small but not zero
    });

    it('should handle 100% successes correctly', () => {
        const result = wilsonScoreInterval(100, 100, 0.95);
        expect(result.lower).toBeGreaterThan(0.9);
        expect(result.lower).toBeLessThan(1);
        expect(result.upper).toBe(1);
    });

    it('should narrow with larger sample sizes', () => {
        const small = wilsonScoreInterval(5, 10, 0.95);
        const large = wilsonScoreInterval(50, 100, 0.95);

        const smallWidth = small.upper - small.lower;
        const largeWidth = large.upper - large.lower;

        expect(largeWidth).toBeLessThan(smallWidth);
    });

    it('should widen with higher confidence levels', () => {
        const ci95 = wilsonScoreInterval(30, 100, 0.95);
        const ci99 = wilsonScoreInterval(30, 100, 0.99);

        const width95 = ci95.upper - ci95.lower;
        const width99 = ci99.upper - ci99.lower;

        expect(width99).toBeGreaterThan(width95);
    });

    // Verify against known values
    // For n=100, k=50, 95% CI should be approximately [0.40, 0.60]
    it('should match known Wilson interval values', () => {
        const result = wilsonScoreInterval(50, 100, 0.95);
        expect(result.lower).toBeGreaterThan(0.39);
        expect(result.lower).toBeLessThan(0.42);
        expect(result.upper).toBeGreaterThan(0.58);
        expect(result.upper).toBeLessThan(0.61);
    });
});

describe('bootstrapMeanCI', () => {
    it('should return same value for single data point', () => {
        const result = bootstrapMeanCI([5], 0.95, 100);
        expect(result.lower).toBe(5);
        expect(result.upper).toBe(5);
        expect(result.point).toBe(5);
    });

    it('should return zeros for empty array', () => {
        const result = bootstrapMeanCI([], 0.95, 100);
        expect(result.lower).toBe(0);
        expect(result.upper).toBe(0);
        expect(result.point).toBe(0);
    });

    it('should calculate correct point estimate', () => {
        const data = [1, 2, 3, 4, 5];
        const result = bootstrapMeanCI(data, 0.95, 1000);
        expect(result.point).toBe(3);
    });

    it('should contain the true mean with high probability', () => {
        // Generate data with known mean
        const data = Array.from({ length: 50 }, () => Math.random() * 10);
        const trueMean = data.reduce((a, b) => a + b, 0) / data.length;
        const result = bootstrapMeanCI(data, 0.95, 1000);

        expect(result.lower).toBeLessThanOrEqual(trueMean);
        expect(result.upper).toBeGreaterThanOrEqual(trueMean);
    });

    it('should produce narrower intervals with more data', () => {
        const small = [1, 2, 3, 4, 5];
        const large = Array.from({ length: 100 }, (_, i) => (i % 5) + 1);

        const smallResult = bootstrapMeanCI(small, 0.95, 500);
        const largeResult = bootstrapMeanCI(large, 0.95, 500);

        const smallWidth = smallResult.upper - smallResult.lower;
        const largeWidth = largeResult.upper - largeResult.lower;

        expect(largeWidth).toBeLessThan(smallWidth);
    });
});

// ============================================
// QUANTILE DISCRETIZATION TESTS
// ============================================

describe('calculateQuantileThresholds', () => {
    it('should return empty array for empty input', () => {
        expect(calculateQuantileThresholds([], 3)).toEqual([]);
    });

    it('should return correct thresholds for uniform data', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const thresholds = calculateQuantileThresholds(values, 3);

        // Should split into 3 equal groups
        expect(thresholds.length).toBe(2);
        expect(thresholds[0]).toBeLessThanOrEqual(4);
        expect(thresholds[1]).toBeLessThanOrEqual(7);
    });

    it('should handle single value', () => {
        const thresholds = calculateQuantileThresholds([5], 3);
        expect(thresholds.length).toBe(2);
    });

    it('should produce correct number of thresholds', () => {
        const values = Array.from({ length: 100 }, (_, i) => i);

        expect(calculateQuantileThresholds(values, 2).length).toBe(1);
        expect(calculateQuantileThresholds(values, 3).length).toBe(2);
        expect(calculateQuantileThresholds(values, 4).length).toBe(3);
        expect(calculateQuantileThresholds(values, 5).length).toBe(4);
    });
});

describe('assignToBin', () => {
    it('should assign to first bin for values below first threshold', () => {
        const thresholds = [3, 6];
        expect(assignToBin(1, thresholds)).toBe(0);
        expect(assignToBin(2, thresholds)).toBe(0);
    });

    it('should assign to middle bin for values between thresholds', () => {
        const thresholds = [3, 6];
        expect(assignToBin(3, thresholds)).toBe(1);
        expect(assignToBin(4, thresholds)).toBe(1);
        expect(assignToBin(5, thresholds)).toBe(1);
    });

    it('should assign to last bin for values at or above last threshold', () => {
        const thresholds = [3, 6];
        expect(assignToBin(6, thresholds)).toBe(2);
        expect(assignToBin(10, thresholds)).toBe(2);
    });

    it('should handle empty thresholds', () => {
        expect(assignToBin(5, [])).toBe(0);
    });
});

// ============================================
// MANN-KENDALL TREND TEST
// ============================================

describe('mannKendallTest', () => {
    it('should return no trend for too few data points', () => {
        const result = mannKendallTest([1, 2, 3]);
        expect(result.trend).toBe('no_trend');
        expect(result.pValue).toBe(1);
    });

    it('should detect increasing trend', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = mannKendallTest(data);

        expect(result.trend).toBe('increasing');
        expect(result.tau).toBeGreaterThan(0);
        expect(result.pValue).toBeLessThan(0.05);
    });

    it('should detect decreasing trend', () => {
        const data = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        const result = mannKendallTest(data);

        expect(result.trend).toBe('decreasing');
        expect(result.tau).toBeLessThan(0);
        expect(result.pValue).toBeLessThan(0.05);
    });

    it('should return no trend for random data', () => {
        // Alternating high and low values
        const data = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6];
        const result = mannKendallTest(data);

        // tau should be close to 0 for no trend
        expect(Math.abs(result.tau)).toBeLessThan(0.5);
    });

    it('should return tau = 1 for perfectly increasing sequence', () => {
        const data = [1, 2, 3, 4, 5];
        const result = mannKendallTest(data);

        expect(result.tau).toBe(1);
    });

    it('should return tau = -1 for perfectly decreasing sequence', () => {
        const data = [5, 4, 3, 2, 1];
        const result = mannKendallTest(data);

        expect(result.tau).toBe(-1);
    });

    it('should handle ties correctly', () => {
        const data = [1, 2, 2, 3, 3, 3, 4];
        const result = mannKendallTest(data);

        // Should still detect increasing trend despite ties
        expect(result.tau).toBeGreaterThan(0);
    });
});

// ============================================
// OUTLIER DETECTION TESTS
// ============================================

describe('detectOutliersIQR', () => {
    it('should return empty for small datasets', () => {
        const result = detectOutliersIQR([1, 2, 3]);
        expect(result.outliers).toEqual([]);
        expect(result.indices).toEqual([]);
    });

    it('should detect obvious outliers', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]; // 100 is outlier
        const result = detectOutliersIQR(values, 1.5);

        expect(result.outliers).toContain(100);
    });

    it('should return correct indices', () => {
        const values = [1, 2, 3, 4, 100, 5, 6, 7]; // 100 at index 4
        const result = detectOutliersIQR(values, 1.5);

        const outlierIndex = result.indices[result.outliers.indexOf(100)];
        expect(outlierIndex).toBe(4);
    });

    it('should respect multiplier parameter', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15];

        const strict = detectOutliersIQR(values, 1.5);
        const lenient = detectOutliersIQR(values, 3.0);

        expect(strict.outliers.length).toBeGreaterThanOrEqual(lenient.outliers.length);
    });

    it('should calculate correct bounds', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const result = detectOutliersIQR(values, 1.5);

        // Q1 ≈ 2.5, Q3 ≈ 7.5, IQR = 5
        // Lower bound = 2.5 - 1.5*5 = -5
        // Upper bound = 7.5 + 1.5*5 = 15
        expect(result.bounds.lower).toBeLessThan(0);
        expect(result.bounds.upper).toBeGreaterThan(10);
    });
});

describe('detectDataQualityIssues', () => {
    it('should detect constant arousal', () => {
        const logs = Array.from({ length: 15 }, (_, i) => ({
            id: `log-${i}`,
            timestamp: new Date().toISOString(),
            arousal: 5,
            duration: 10,
            context: 'home'
        }));

        const issues = detectDataQualityIssues(logs);
        const constantIssue = issues.find(i => i.type === 'constant_arousal');

        expect(constantIssue).toBeDefined();
        expect(constantIssue!.severity).toBe('high');
    });

    it('should detect invalid timestamps', () => {
        const logs = [
            { id: '1', timestamp: 'invalid', arousal: 5, duration: 10 },
            { id: '2', timestamp: new Date().toISOString(), arousal: 5, duration: 10 }
        ];

        const issues = detectDataQualityIssues(logs);
        const timestampIssue = issues.find(i => i.type === 'invalid_timestamp');

        expect(timestampIssue).toBeDefined();
        expect(timestampIssue!.affectedLogIds).toContain('1');
    });

    it('should detect missing context', () => {
        const logs = Array.from({ length: 10 }, (_, i) => ({
            id: `log-${i}`,
            timestamp: new Date().toISOString(),
            arousal: i + 1, // Varying arousal to avoid constant detection
            duration: 10,
            context: i < 2 ? undefined : 'home' // 20% missing
        }));

        const issues = detectDataQualityIssues(logs);
        const contextIssue = issues.find(i => i.type === 'missing_context');

        expect(contextIssue).toBeDefined();
        expect(contextIssue!.severity).toBe('medium');
    });

    it('should not flag normal data', () => {
        const logs = Array.from({ length: 10 }, (_, i) => ({
            id: `log-${i}`,
            timestamp: new Date(Date.now() + i * 3600000).toISOString(),
            arousal: (i % 10) + 1, // Varying 1-10
            duration: 10 + i,
            context: 'home'
        }));

        const issues = detectDataQualityIssues(logs);

        // Should be no issues or only minor ones
        const highSeverityIssues = issues.filter(i => i.severity === 'high');
        expect(highSeverityIssues.length).toBe(0);
    });
});

// ============================================
// EFFECT SIZE TESTS
// ============================================

describe('cohensD', () => {
    it('should return 0 for empty groups', () => {
        expect(cohensD([], [1, 2, 3])).toBe(0);
        expect(cohensD([1, 2, 3], [])).toBe(0);
    });

    it('should return 0 for identical groups', () => {
        const group = [1, 2, 3, 4, 5];
        const d = cohensD(group, group);
        expect(d).toBe(0);
    });

    it('should return positive d when group1 > group2', () => {
        const group1 = [10, 11, 12, 13, 14];
        const group2 = [1, 2, 3, 4, 5];
        const d = cohensD(group1, group2);
        expect(d).toBeGreaterThan(0);
    });

    it('should return negative d when group1 < group2', () => {
        const group1 = [1, 2, 3, 4, 5];
        const group2 = [10, 11, 12, 13, 14];
        const d = cohensD(group1, group2);
        expect(d).toBeLessThan(0);
    });

    // Known example: groups with means 10 and 5, SD = 2
    // d = (10-5)/2 = 2.5
    it('should calculate correct effect size for known values', () => {
        const group1 = [8, 9, 10, 11, 12]; // mean = 10, SD ≈ 1.58
        const group2 = [3, 4, 5, 6, 7];   // mean = 5, SD ≈ 1.58
        const d = cohensD(group1, group2);

        // Should be approximately 3.16 (mean diff / pooled SD)
        expect(Math.abs(d)).toBeGreaterThan(2);
        expect(Math.abs(d)).toBeLessThan(4);
    });
});

describe('interpretEffectSize', () => {
    it('should classify negligible effects', () => {
        expect(interpretEffectSize(0)).toBe('negligible');
        expect(interpretEffectSize(0.1)).toBe('negligible');
        expect(interpretEffectSize(0.19)).toBe('negligible');
        expect(interpretEffectSize(-0.1)).toBe('negligible');
    });

    it('should classify small effects', () => {
        expect(interpretEffectSize(0.2)).toBe('small');
        expect(interpretEffectSize(0.3)).toBe('small');
        expect(interpretEffectSize(0.49)).toBe('small');
        expect(interpretEffectSize(-0.3)).toBe('small');
    });

    it('should classify medium effects', () => {
        expect(interpretEffectSize(0.5)).toBe('medium');
        expect(interpretEffectSize(0.6)).toBe('medium');
        expect(interpretEffectSize(0.79)).toBe('medium');
        expect(interpretEffectSize(-0.6)).toBe('medium');
    });

    it('should classify large effects', () => {
        expect(interpretEffectSize(0.8)).toBe('large');
        expect(interpretEffectSize(1.0)).toBe('large');
        expect(interpretEffectSize(2.0)).toBe('large');
        expect(interpretEffectSize(-1.0)).toBe('large');
    });
});

// ============================================
// CROSS-VALIDATION TESTS
// ============================================

describe('trainTestSplit', () => {
    it('should split data according to ratio', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const { train, test } = trainTestSplit(data, 0.2);

        expect(train.length).toBe(8);
        expect(test.length).toBe(2);
    });

    it('should include all data in splits', () => {
        const data = [1, 2, 3, 4, 5];
        const { train, test } = trainTestSplit(data, 0.4);

        const combined = [...train, ...test];
        expect(combined.sort()).toEqual(data.sort());
    });

    it('should produce reproducible results with seed', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        const split1 = trainTestSplit(data, 0.2, 42);
        const split2 = trainTestSplit(data, 0.2, 42);

        expect(split1.train).toEqual(split2.train);
        expect(split1.test).toEqual(split2.test);
    });

    it('should handle empty array', () => {
        const { train, test } = trainTestSplit([], 0.2);
        expect(train).toEqual([]);
        expect(test).toEqual([]);
    });
});

// ============================================
// CALIBRATION CHECK TESTS
// ============================================

describe('calibrationCheck', () => {
    it('should return perfect score for empty predictions', () => {
        const result = calibrationCheck([]);
        expect(result.brierScore).toBe(0);
        expect(result.isCalibrated).toBe(true);
    });

    it('should calculate correct Brier score for perfect predictions', () => {
        const predictions = [
            { predicted: 1, actual: true },
            { predicted: 0, actual: false },
            { predicted: 1, actual: true },
            { predicted: 0, actual: false }
        ];

        const result = calibrationCheck(predictions);
        expect(result.brierScore).toBe(0);
    });

    it('should calculate correct Brier score for worst predictions', () => {
        const predictions = [
            { predicted: 1, actual: false },
            { predicted: 0, actual: true },
            { predicted: 1, actual: false },
            { predicted: 0, actual: true }
        ];

        const result = calibrationCheck(predictions);
        expect(result.brierScore).toBe(1);
    });

    it('should detect well-calibrated predictions', () => {
        // Create calibrated predictions: when we predict 0.7, ~70% should be true
        const predictions = [
            // 10 predictions at ~0.7 with 7 true
            ...Array(7).fill({ predicted: 0.7, actual: true }),
            ...Array(3).fill({ predicted: 0.7, actual: false }),
            // 10 predictions at ~0.3 with 3 true
            ...Array(3).fill({ predicted: 0.3, actual: true }),
            ...Array(7).fill({ predicted: 0.3, actual: false })
        ];

        const result = calibrationCheck(predictions);
        expect(result.brierScore).toBeLessThan(0.3);
    });

    it('should create correct number of bins', () => {
        const predictions = Array.from({ length: 100 }, (_, i) => ({
            predicted: i / 100,
            actual: Math.random() > 0.5
        }));

        const result = calibrationCheck(predictions);
        expect(result.calibrationBins.length).toBe(10);
    });
});
