# NeuroLogg Pro - Data Types Reference

## Overview

All TypeScript types are defined in `src/types.ts`. Runtime validation uses Zod schemas in `src/utils/validation.ts`.

---

## Core Types

### ContextType

Environment where data was recorded.

```typescript
type ContextType = 'home' | 'school';
```

### TimeTypes

Temporal categorization for pattern analysis.

```typescript
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
```

---

## LogEntry

Core tracking entry for emotions and regulation.

```typescript
interface LogEntry {
  id: string;                           // UUID
  timestamp: string;                    // ISO date string
  context: ContextType;                 // 'home' | 'school'

  // Core metrics (1-10 scale)
  arousal: number;                      // Stress/activation level
  valence: number;                      // Mood (negative to positive)
  energy: number;                       // Available capacity (spoon theory)

  // Triggers
  sensoryTriggers: string[];            // e.g., ['Auditiv', 'Visuell']
  contextTriggers: string[];            // e.g., ['Overgang', 'Krav']

  // Strategies
  strategies: string[];                 // e.g., ['Hodetelefoner', 'Skjerming']
  strategyEffectiveness?: 'helped' | 'no_change' | 'escalated';

  // Additional data
  duration: number;                     // Duration of state in minutes
  note: string;                         // Free text notes

  // Computed metadata (auto-enriched)
  dayOfWeek?: DayOfWeek;
  timeOfDay?: TimeOfDay;
  hourOfDay?: number;
}
```

### Trigger & Strategy Options

```typescript
// Sensory triggers
type SensoryTrigger =
  | 'Auditiv' | 'Visuell' | 'Taktil' | 'Vestibulær'
  | 'Interosepsjon' | 'Lukt' | 'Smak' | 'Lys'
  | 'Temperatur' | 'Trengsel';

// Context triggers
type ContextTrigger =
  | 'Krav' | 'Overgang' | 'Sosialt' | 'Uventet Hendelse'
  | 'Sliten' | 'Sult' | 'Ventetid' | 'Gruppearbeid'
  | 'Prøve/Test' | 'Ny Situasjon';

// Regulation strategies
type Strategy =
  | 'Skjerming' | 'Dypt Trykk' | 'Samregulering' | 'Pusting'
  | 'Eget Rom' | 'Vektteppe' | 'Hodetelefoner' | 'Fidget'
  | 'Bevegelse' | 'Mørkt Rom' | 'Kjent Aktivitet' | 'Musikk'
  | 'Timer/Visuell Støtte';
```

---

## CrisisEvent

Meltdown/shutdown tracking with intervention data.

```typescript
interface CrisisEvent {
  id: string;
  timestamp: string;
  context: ContextType;

  // Crisis details
  type: CrisisType;
  durationSeconds: number;
  peakIntensity: number;               // 1-10

  // Pre-crisis indicators
  precedingArousal?: number;
  precedingEnergy?: number;
  warningSignsObserved: string[];

  // Triggers
  sensoryTriggers: string[];
  contextTriggers: string[];

  // Intervention
  strategiesUsed: string[];
  resolution: CrisisResolution;

  // Recording
  hasAudioRecording: boolean;
  audioUrl?: string;
  notes: string;

  // Post-crisis
  recoveryTimeMinutes?: number;

  // Metadata (auto-enriched)
  dayOfWeek?: DayOfWeek;
  timeOfDay?: TimeOfDay;
  hourOfDay?: number;
}

type CrisisType =
  | 'meltdown'
  | 'shutdown'
  | 'anxiety'
  | 'sensory_overload'
  | 'other';

type CrisisResolution =
  | 'self_regulated'
  | 'co_regulated'
  | 'timed_out'
  | 'interrupted'
  | 'other';

type WarningSign =
  | 'Økt motorisk uro' | 'Verbal eskalering' | 'Tilbaketrekning'
  | 'Repetitive bevegelser' | 'Dekker ører' | 'Unngår øyekontakt'
  | 'Rødme/svetting' | 'Klamrer seg' | 'Nekter instrukser' | 'Gråt';
```

---

## Schedule Types

### ScheduleActivity

Individual activity in a schedule.

```typescript
interface ScheduleActivity {
  id: string;
  title: string;
  icon: string;                         // Emoji or icon name
  scheduledStart: string;               // HH:mm format
  scheduledEnd: string;
  durationMinutes: number;
}
```

### ScheduleEntry

Instance of an activity on a specific date.

```typescript
interface ScheduleEntry {
  id: string;
  date: string;                         // ISO date
  context: ContextType;
  activity: ScheduleActivity;

  // Execution
  status: ActivityStatus;
  actualStart?: string;
  actualEnd?: string;
  actualDurationMinutes?: number;

  // During activity
  arousalDuringActivity?: number;
  energyAfterActivity?: number;

  // Transition tracking
  transitionDifficulty?: number;        // 1-10
  transitionSupport?: string[];

  notes?: string;
}

type ActivityStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'skipped'
  | 'modified';
```

### DailyScheduleTemplate

Reusable schedule template.

```typescript
interface DailyScheduleTemplate {
  id: string;
  name: string;
  context: ContextType;
  dayOfWeek: DayOfWeek | 'all';
  activities: ScheduleActivity[];
}
```

---

## Goal Types

### Goal

IEP goal with progress tracking.

```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;

  // Targets
  targetValue: number;
  targetUnit: string;                   // 'minutes', 'times', 'percentage'
  targetDirection: 'increase' | 'decrease' | 'maintain';

  // Timeline
  startDate: string;
  targetDate: string;

  // Current state
  currentValue: number;
  status: GoalStatus;

  // History
  progressHistory: GoalProgress[];

  notes?: string;
}

type GoalCategory =
  | 'regulation'
  | 'social'
  | 'academic'
  | 'communication'
  | 'independence'
  | 'sensory';

type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'achieved'
  | 'discontinued';
```

### GoalProgress

Individual progress entry for a goal.

```typescript
interface GoalProgress {
  id: string;
  goalId: string;
  date: string;
  value: number;
  context: ContextType;
  notes?: string;
}
```

---

## ChildProfile

Child profile for personalized AI analysis.

```typescript
interface ChildProfile {
  id: string;
  name: string;                         // Display name (can be nickname)
  age?: number;

  // Diagnosis
  diagnoses: string[];                  // e.g., ['autism', 'adhd']
  communicationStyle: CommunicationStyle;

  // Sensory profile
  sensorySensitivities: string[];       // Top sensitivities
  seekingSensory: string[];             // Sensory seeking behaviors

  // Strategies
  effectiveStrategies: string[];        // Known effective strategies

  // Additional context
  additionalContext?: string;           // Free text for AI

  // Metadata
  createdAt: string;
  updatedAt: string;
}

type CommunicationStyle =
  | 'verbal'
  | 'limited_verbal'
  | 'non_verbal'
  | 'aac';
```

---

## Analysis Types

### AnalysisResult

AI-generated analysis result.

```typescript
interface AnalysisResult {
  id?: string;
  generatedAt?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;

  // Analysis content
  triggerAnalysis: string;
  strategyEvaluation: string;
  interoceptionPatterns: string;

  // Correlations
  correlations?: AnalysisCorrelation[];

  // Recommendations
  recommendations?: string[];

  // Summary
  summary: string;

  // Metadata
  isDeepAnalysis?: boolean;
  modelUsed?: string;
}

interface AnalysisCorrelation {
  factor1: string;
  factor2: string;
  relationship: string;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}
```

---

## Pattern Analysis Types

### MultiFactorPattern

Complex pattern involving multiple factors.

```typescript
interface MultiFactorPattern {
  id: string;
  factors: PatternFactor[];
  outcome: PatternOutcome;
  occurrenceCount: number;
  totalOccasions: number;
  probability: number;
  pValue: number;
  confidence: ConfidenceLevel;
  description: string;
}

interface PatternFactor {
  type: PatternFactorType;
  value: string | number | boolean;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  label: string;
}

type PatternFactorType =
  | 'time' | 'energy' | 'trigger'
  | 'context' | 'transition' | 'strategy';

type PatternOutcome =
  | 'high_arousal' | 'crisis'
  | 'escalation' | 'recovery';

type ConfidenceLevel = 'low' | 'medium' | 'high';
```

### StrategyComboEffectiveness

Strategy combination effectiveness analysis.

```typescript
interface StrategyComboEffectiveness {
  strategies: string[];
  usageCount: number;
  successRate: number;
  noChangeRate: number;
  escalationRate: number;
  avgArousalBefore: number;
  avgArousalAfter: number;
  comparedToSingleStrategy: number;     // % improvement
}
```

---

## Context Comparison Types

```typescript
interface ContextComparison {
  home: ContextMetrics;
  school: ContextMetrics;
  significantDifferences: ContextDifference[];
  dateRange: { start: string; end: string; };
}

interface ContextMetrics {
  logCount: number;
  crisisCount: number;
  avgArousal: number;
  avgEnergy: number;
  avgValence: number;
  topTriggers: TriggerStat[];
  topStrategies: StrategyStat[];
  peakArousalTimes: HourlyArousal[];
  crisisFrequencyPerDay: number;
}

interface ContextDifference {
  metric: string;
  homeValue: number | string;
  schoolValue: number | string;
  significance: ConfidenceLevel;
  insight: string;
}
```

---

## Recovery Analysis Types

```typescript
interface RecoveryAnalysis {
  avgRecoveryTime: number;
  recoveryTrend: 'improving' | 'worsening' | 'stable';
  factorsAcceleratingRecovery: RecoveryFactor[];
  factorsDelayingRecovery: RecoveryFactor[];
  vulnerabilityWindow: VulnerabilityWindow;
  recoveryByType: Partial<Record<CrisisType, RecoveryStats>>;
  totalCrisesAnalyzed: number;
  crisesWithRecoveryData: number;
}

interface RecoveryFactor {
  factor: string;
  factorType: 'strategy' | 'time' | 'context' | 'crisis_type';
  avgRecoveryWithFactor: number;
  avgRecoveryWithoutFactor: number;
  impactMinutes: number;                // Positive = delays, Negative = accelerates
  sampleSize: number;
  pValue?: number;
}

interface VulnerabilityWindow {
  durationMinutes: number;
  elevatedRiskPeriod: number;
  recommendedBuffer: number;
  reEscalationRate: number;             // % followed by another crisis
}
```

---

## Utility Functions

### Data Enrichment

```typescript
import { enrichLogEntry, enrichCrisisEvent } from './types';

// Adds dayOfWeek, timeOfDay, hourOfDay
const enrichedLog = enrichLogEntry(logInput);
const enrichedCrisis = enrichCrisisEvent(crisisInput);
```

### Time Helpers

```typescript
import { getDayOfWeek, getTimeOfDay } from './types';

const day = getDayOfWeek(new Date());    // 'monday' | 'tuesday' | ...
const time = getTimeOfDay(new Date());   // 'morning' | 'midday' | ...
```

---

## Constants

Predefined option arrays for UI dropdowns:

```typescript
import {
  SENSORY_TRIGGERS,    // SensoryTrigger[]
  CONTEXT_TRIGGERS,    // ContextTrigger[]
  STRATEGIES,          // Strategy[]
  WARNING_SIGNS,       // WarningSign[]
  CRISIS_TYPES,        // { value, label }[]
  GOAL_CATEGORIES,     // { value, label }[]
  DIAGNOSIS_OPTIONS,   // { value, label }[]
  COMMUNICATION_STYLES // { value, label }[]
} from './types';
```
