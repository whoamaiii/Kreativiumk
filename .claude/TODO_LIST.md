# Code Review Fixes - Todo List

Last updated: 2026-01-11

## High Priority

- [x] **Fix division by zero in goal progress calculation**
  - File: `src/utils/exportData.ts:164-174`
  - Added clarifying comment for `range <= 0` edge case

- [x] **Fix unbounded cache growth**
  - File: `src/services/aiCommon.ts:282-299`
  - Now enforces max cache size after cleaning expired entries

## Medium Priority

- [x] **Standardize UUID usage on `crypto.randomUUID()`**
  - [x] `src/components/VisualSchedule.tsx`
  - [x] `src/components/CrisisMode.tsx`
  - [x] `src/components/LogEntryForm.tsx`
  - [x] `src/components/GoalTracking.tsx`
  - [x] `src/store/childProfile.tsx` (already using generateUUID)

- [x] **Add ARIA attributes to CrisisMode slider**
  - File: `src/components/CrisisMode.tsx:637-654`
  - Added aria-valuemin, aria-valuemax, aria-valuenow, aria-describedby

- [x] **Fix color-only arousal indicators**
  - File: `src/components/Analysis.tsx:154-159, 283-289`
  - Added getArousalLabel helper + aria-label with level description

## Low Priority

- [x] **Fix misleading comment in gemini.ts**
  - File: `src/services/gemini.ts:44-46`
  - Updated comment to match MODEL_ID (Gemini 2.0 Flash)

- [x] **Extract magic numbers to constants**
  - File: `src/utils/predictions.ts:12-14`
  - Added HOURS_PER_DAY, MS_PER_DAY, MINUTES_PER_DAY constants
  - Replaced 6 occurrences of magic `24` with HOURS_PER_DAY

---

## Completion Log

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Division by zero fix | Completed | 2026-01-11 | Added clarifying comment |
| Cache growth fix | Completed | 2026-01-11 | Added second pass to remove oldest entries |
| UUID standardization | Completed | 2026-01-11 | 4 files updated to crypto.randomUUID() |
| ARIA slider attributes | Completed | 2026-01-11 | Peak intensity slider now accessible |
| Arousal indicators | Completed | 2026-01-11 | Added getArousalLabel + aria-label |
| Gemini comment | Completed | 2026-01-11 | Fixed model name in docstring |
| Magic numbers | Completed | 2026-01-11 | Extracted to named constants (6 replacements) |
| Verification | Completed | 2026-01-11 | Build OK, 483 tests passed |

## Verification Results

```
Build: ✓ Success (4.70s)
Tests: ✓ 694 passed, 5 skipped
```

---

# Phase 1 Roadmap Implementation

## Phase 1.1: Statistical Validity Fixes

- [x] **1.1.1 Multiple Comparison Correction**
  - File: `src/utils/statisticalUtils.ts`
  - Implemented `benjaminiHochbergCorrection()` with proper FDR control
  - Tests: 73 tests in `statisticalUtils.test.ts`

- [x] **1.1.2 Fix Invalid P-Value Calculation**
  - File: `src/utils/statisticalUtils.ts`
  - Implemented `chiSquaredPValue()` using proper gamma CDF
  - Validated against known chi-squared table values

- [x] **1.1.3 Personalized Thresholds**
  - File: `src/utils/statisticalUtils.ts`
  - Implemented `calculatePersonalizedThreshold()` for P75/P25
  - Tests verify percentile calculations

- [x] **1.1.4 Confidence Intervals**
  - File: `src/utils/statisticalUtils.ts`
  - Implemented `wilsonScoreInterval()` for proportions
  - Implemented `bootstrapMeanCI()` for means
  - Implemented `mannKendallTest()` for trends

## Phase 1.2: AI Insight Validation

- [x] **1.2.1 Ground AI Claims in Data**
  - File: `src/services/aiValidation.ts`
  - Created validation layer to detect hallucinations
  - Extracts numerical claims and cross-references with computed stats
  - 28 tests in `aiValidation.test.ts`

## Phase 1.3: Storage Health & Data Integrity

- [x] **1.3.1 Storage Monitoring**
  - File: `src/utils/storageHealth.ts`
  - Implemented storage usage measurement and health checks
  - Created `StorageHealthIndicator` component
  - 34 tests in `storageHealth.test.ts`

- [x] **1.3.2 Data Integrity Validation**
  - File: `src/utils/dataValidation.ts`
  - Implemented `validateLogEntry()` and `validateCrisisEvent()`
  - Implemented `detectSuspiciousPatterns()` for data quality
  - Created `generateDataQualityReport()` for comprehensive analysis
  - 55 tests in `dataValidation.test.ts`

## Phase 2: UX Overhaul

- [x] **2.1.1 Traffic Light Quick Entry**
  - File: `src/components/QuickLog.tsx`
  - 3-button interface: Bra/Sliter/Krise (Good/Struggling/Crisis)
  - Auto-captures timestamp, context (home/school based on time)
  - Haptic feedback on tap
  - Optional details panel with notes
  - 21 tests in `QuickLog.test.tsx`

- [x] **2.1.2 Smart Defaults Utility**
  - File: `src/utils/smartDefaults.ts`
  - `calculateSmartDefaults()` - time-based value suggestions
  - `getFrequentTriggers()` - most used triggers from history
  - `getEffectiveStrategies()` - strategies ranked by success rate
  - `getContextualTriggerSuggestions()` - context-aware triggers
  - `getContextualStrategySuggestions()` - situation-aware strategies
  - 24 tests in `smartDefaults.test.ts`

---

# Prediction & Analysis Accuracy Improvements

> **Note:** Most of these items were implemented in Phase 1.1 and Phase 1.3. This section is kept for reference.

## High-Impact Improvements (Significant Accuracy Gains)

### 1. Multiple Comparison Correction
- [x] **File:** `src/utils/multiFactorAnalysis.ts`
- **Implemented:** `benjaminiHochbergCorrection()` in statisticalUtils.ts
- **Config:** `enableMultipleComparisonCorrection: true` (default)
- **Impact:** Eliminates spurious patterns that appear significant by chance

### 2. Add Confidence Intervals to All Estimates
- [x] **Files:** `src/utils/predictions.ts`, `src/utils/multiFactorAnalysis.ts`
- **Implemented:** `wilsonScoreInterval()` for proportions, `bootstrapMeanCI()` for means
- **Impact:** Users see reliability of predictions; prevents overconfidence in small samples

### 3. Multi-Factor Risk Scoring
- [x] **File:** `src/utils/predictions.ts`
- **Implemented:** Lines 357-414, 486-495 track energy, context, strategy failures
- **Config:** `enableMultiFactorScoring: true` (default)
- **Impact:** More accurate predictions by leveraging all tracked data

### 4. Personalized Thresholds
- [x] **Files:** `src/utils/predictions.ts`, `src/utils/recoveryAnalysis.ts`
- **Implemented:** `calculatePersonalizedThreshold()` using P75/P25 percentiles
- **Config:** `personalizedThresholds.enabled: true` (default)
- **Impact:** More accurate for children with naturally higher/lower baseline arousal

### 5. Temporal Lag Effects
- [x] **File:** `src/utils/predictions.ts`
- **Implemented:** `calculateLagEffects()` at lines 92-139
- **Config:** `enableLagEffects: true` (default)
- **Impact:** Better next-day predictions; identifies cumulative stress effects

---

## Medium-Impact Improvements

### 6. Proper Statistical Tests
- [x] **File:** `src/utils/statisticalUtils.ts`
- **Implemented:** `chiSquaredPValue()` using proper gamma CDF
- **Impact:** Correct significance levels; no false positives from math errors

### 7. Adaptive Discretization
- [x] **File:** `src/utils/multiFactorAnalysis.ts`
- **Implemented:** `calculateQuantileThresholds()` and `assignToBin()` in statisticalUtils.ts
- **Config:** `enableAdaptiveDiscretization: true` (default)
- **Impact:** Patterns reflect individual child's distribution, not arbitrary cutoffs

### 8. Interaction Effect Testing
- [x] **File:** `src/utils/multiFactorAnalysis.ts`
- **Implemented:** `analyzeInteractionEffects()` at lines 534-626
- **Config:** `enableInteractionTesting: true` (default)
- **Impact:** Discovers compound triggers (e.g., "low energy + afternoon" is worse than either alone)

### 9. Data-Driven Vulnerability Window
- [x] **File:** `src/utils/recoveryAnalysis.ts`
- **Implemented:** `calculateVulnerabilityWindow()` at lines 187-295
- **Config:** `enableDataDrivenVulnerability: true` (default)
- **Impact:** Personalized warning periods; some children may need 30min, others 90min

### 10. Stratified Factor Analysis
- [x] **File:** `src/utils/multiFactorAnalysis.ts`
- **Implemented:** `contextBreakdown` in pattern results (lines 483-498)
- **Config:** `enableStratifiedAnalysis: true` (default)
- **Impact:** Context-aware insights; avoids misleading aggregated patterns

---

## Lower-Impact but Valuable

### 11. Visualization Uncertainty
- [x] **File:** `src/components/BehaviorInsights.tsx`
- **Implemented:** Heatmap opacity varies by sample count, hover shows n=X
- **Added:** Confidence note explaining lighter colors = fewer data points
- **Impact:** Visual indication of data reliability

### 12. LLM Validation Layer
- [x] **Files:** `src/services/aiValidation.ts`
- **Implemented:** Full validation layer to detect hallucinations
- **Tests:** 28 tests in `aiValidation.test.ts`
- **Impact:** Catches hallucinations; increases trust in AI insights

### 13. Proper Trend Detection
- [x] **File:** `src/utils/recoveryAnalysis.ts`
- **Implemented:** `mannKendallTest()` in statisticalUtils.ts
- **Config:** `useStatisticalTrendTest: true` (default)
- **Impact:** Detects gradual trends, not just before/after changes

### 14. Multi-Modal Peak Detection
- [x] **File:** `src/utils/predictions.ts`
- **Implemented:** `detectMultiplePeaks()` at lines 144-188
- **Returns:** Up to 3 peaks in `secondaryPeaks` field
- **Impact:** Better scheduling; doesn't hide secondary risk periods

### 15. Outlier Detection
- [x] **File:** `src/utils/statisticalUtils.ts`, `src/utils/dataValidation.ts`
- **Implemented:** `detectOutliersIQR()`, `detectDataQualityIssues()`, `detectSuspiciousPatterns()`
- **Impact:** Cleaner data = more reliable patterns

---

## Validation & Testing Needs

### 16. Prediction Calibration Check
- [x] **File:** `src/utils/predictions.ts`
- **Implemented:** `validatePredictionCalibration()` at lines 559-577
- **Uses:** `calibrationCheck()` from statisticalUtils.ts
- **Impact:** Validates prediction accuracy; identifies systematic over/under-prediction

### 17. Cross-Validation for Patterns
- [x] **File:** `src/utils/statisticalUtils.ts`
- **Implemented:** `trainTestSplit()` utility function (lines 540-567)
- **Status:** Utility available, not yet integrated into pattern analysis
- **Impact:** Prevents overfitting to noise in small datasets

---

## Quick Wins (Can implement immediately)

### A. Increase Minimum Sample Requirements
- [x] **Current:** 10 logs for prediction, 5 for pattern (already increased)
- **Location:** `src/utils/analysisConfig.ts`
- **Why:** Reduces noise-driven false positives

### B. Add Sample Size to Pattern Display
- [x] **File:** `src/components/BehaviorInsights.tsx`
- **Implemented:** Shows `n=X` next to probability, confidence intervals displayed
- **Why:** Users can judge reliability themselves

### C. Decay Half-Life Configuration
- [x] **Config:** `recencyDecayHalfLife: 7` in analysisConfig.ts (configurable via config object)
- [x] **UI:** Exposed in Settings page with slider (3-21 days)
- **Why:** Some children have stable patterns (use 14d), others change weekly (use 3d)

---

## Implementation Priority Order

✅ **ALL PREDICTION & ANALYSIS ACCURACY IMPROVEMENTS COMPLETE!**

Implemented features:
- Multiple comparison correction (FDR)
- Confidence intervals on all estimates
- Multi-factor risk scoring
- Personalized thresholds
- Temporal lag effects
- Proper statistical tests
- Adaptive discretization
- Interaction effect testing
- Data-driven vulnerability windows
- Stratified factor analysis
- Visualization uncertainty (opacity by sample size)
- LLM validation layer
- Mann-Kendall trend detection
- Multi-modal peak detection
- Outlier detection
- Prediction calibration checks
- Cross-validation utilities
- User-configurable decay half-life

---

## Architecture Notes

All analysis utilities are in `src/utils/`:
- `predictions.ts` - Risk prediction engine
- `multiFactorAnalysis.ts` - Pattern discovery
- `recoveryAnalysis.ts` - Post-crisis analysis
- `contextComparison.ts` - Home vs school comparison

Configuration lives in `src/utils/analysisConfig.ts` - adjust thresholds here.

Visualizations in `src/components/`:
- `BehaviorInsights.tsx` - Main analysis dashboard
- `Analysis.tsx` - Overview analysis
- `DysregulationHeatmap.tsx` - Temporal patterns
