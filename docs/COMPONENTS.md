# NeuroLogg Pro - Components Documentation

## Overview

NeuroLogg Pro is built with React 19 and uses a component-based architecture with code splitting for optimal performance.

---

## Directory Structure

```
src/components/
├── Home.tsx              # Landing page
├── Dashboard.tsx         # Main dashboard with metrics
├── LogEntryForm.tsx      # Add/edit emotion logs
├── CrisisMode.tsx        # Crisis event recording
├── Analysis.tsx          # AI analysis display
├── BehaviorInsights.tsx  # Advanced behavioral analytics
├── ContextComparison.tsx # Home vs School comparison
├── VisualSchedule.tsx    # Daily schedule management
├── GoalTracking.tsx      # IEP goal tracking
├── Settings.tsx          # App settings
├── Reports.tsx           # PDF report generation
├── SensoryProfile.tsx    # Sensory sensitivity mapping
├── EnergyRegulation.tsx  # Energy/spoon tracking
├── DysregulationHeatmap.tsx # Time-based patterns
├── TransitionInsights.tsx # Transition difficulty analysis
├── RiskForecast.tsx      # Crisis prediction
├── Navigation.tsx        # Bottom navigation bar
├── Layout.tsx            # Page layout wrapper
├── Toast.tsx             # Notification system
├── ErrorBoundary.tsx     # Error handling
├── ModelLoader.tsx       # Local AI model loader (future)
└── onboarding/           # Onboarding wizard
    ├── OnboardingWizard.tsx
    └── steps/
        ├── StartStep.tsx
        ├── ProfileStep.tsx
        ├── TriggersStep.tsx
        └── StrategiesStep.tsx
```

---

## Core Components

### Dashboard

Main dashboard showing overview metrics and quick actions.

**Location:** `src/components/Dashboard.tsx`

**Features:**
- Today's log count and average arousal
- Recent crisis events
- Quick log entry button
- Context switcher (home/school)

**Usage:**
```tsx
<Dashboard />
```

**State Dependencies:**
- `useLogs()` - Log entries
- `useCrisis()` - Crisis events
- `useAppContext()` - Current context

---

### LogEntryForm

Form for adding/editing emotion log entries.

**Location:** `src/components/LogEntryForm.tsx`

**Features:**
- Arousal/Valence/Energy sliders (1-10)
- Sensory trigger selection
- Context trigger selection
- Strategy selection with effectiveness tracking
- Notes field

**Props:**
```typescript
interface LogEntryFormProps {
  onSubmit?: () => void;
  editLog?: LogEntry;
}
```

**Usage:**
```tsx
// New log
<LogEntryForm onSubmit={() => navigate('/dashboard')} />

// Edit existing
<LogEntryForm editLog={existingLog} onSubmit={handleSave} />
```

---

### CrisisMode

Crisis event recording with timer and intervention tracking.

**Location:** `src/components/CrisisMode.tsx`

**Features:**
- Live duration timer
- Peak intensity slider
- Warning signs checklist
- Strategy intervention logging
- Audio recording (optional)
- Resolution tracking

**State:**
```typescript
// Crisis types
type CrisisType = 'meltdown' | 'shutdown' | 'anxiety' | 'sensory_overload' | 'other';

// Resolutions
type CrisisResolution = 'self_regulated' | 'co_regulated' | 'timed_out' | 'interrupted';
```

---

### Analysis

AI-powered behavioral analysis display.

**Location:** `src/components/Analysis.tsx`

**Features:**
- Trigger analysis
- Strategy evaluation
- Interoception patterns
- Correlations visualization
- Recommendations list
- Deep analysis option

**Usage:**
```tsx
<Analysis />
```

**AI Integration:**
```typescript
// Regular analysis
const result = await analyzeLogs(logs, crisisEvents, { childProfile });

// Deep analysis with premium models
const deep = await analyzeLogsDeep(logs, crisisEvents, { childProfile });
```

---

### BehaviorInsights

Advanced multi-factor behavioral analytics.

**Location:** `src/components/BehaviorInsights.tsx`

**Features:**
- Multi-factor pattern detection
- Strategy combination effectiveness
- Time-based pattern analysis
- Context comparison
- Recovery analysis

**Data Types:**
```typescript
interface MultiFactorPattern {
  factors: PatternFactor[];
  outcome: PatternOutcome;
  probability: number;
  confidence: ConfidenceLevel;
}

interface StrategyComboEffectiveness {
  strategies: string[];
  successRate: number;
  comparedToSingleStrategy: number;
}
```

---

### ContextComparison

Side-by-side comparison of home vs school metrics.

**Location:** `src/components/ContextComparison.tsx`

**Features:**
- Metrics comparison chart
- Top triggers by context
- Strategy effectiveness by context
- Significant differences highlight

---

### VisualSchedule

Daily schedule management with template support.

**Location:** `src/components/VisualSchedule.tsx`

**Features:**
- Visual timeline
- Drag-and-drop reordering
- Template creation/application
- Transition difficulty tracking
- Completion status

---

### GoalTracking

IEP goal management with progress visualization.

**Location:** `src/components/GoalTracking.tsx`

**Features:**
- Goal creation/editing
- Progress logging
- Trend visualization
- Status auto-calculation
- Category filtering

**Goal Categories:**
- Regulation
- Social
- Academic
- Communication
- Independence
- Sensory

---

### Reports

PDF report generation for sharing with professionals.

**Location:** `src/components/Reports.tsx`

**Features:**
- Date range selection
- Section selection
- AI analysis inclusion
- PDF download

**Usage:**
```tsx
<Reports />
// Generates PDF with jsPDF + jspdf-autotable
```

---

### Settings

App settings and configuration.

**Location:** `src/components/Settings.tsx`

**Features:**
- Child profile editing
- Data export/import
- Cache clearing
- API status display
- Local model configuration (future)

---

## UI Components

### Navigation

Bottom navigation bar for mobile-first design.

**Location:** `src/components/Navigation.tsx`

**Routes:**
| Icon | Route | Label |
|------|-------|-------|
| Home | `/` | Hjem |
| BarChart2 | `/dashboard` | Oversikt |
| Plus | `/log` | Logg |
| TrendingUp | `/analysis` | Analyse |
| Settings | `/settings` | Innstillinger |

---

### Toast

Notification system using context.

**Location:** `src/components/Toast.tsx`

**Usage:**
```tsx
import { useToast } from './components/Toast';

const { toast } = useToast();

toast.success('Lagret!');
toast.error('Noe gikk galt');
toast.info('Informasjon');
```

---

### ErrorBoundary

Error boundary for graceful error handling.

**Location:** `src/components/ErrorBoundary.tsx`

**Usage:**
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

---

## Visualization Components

### ArousalChart

Line chart showing arousal levels over time.

**Location:** `src/components/ArousalChart.tsx`

**Props:**
```typescript
interface ArousalChartProps {
  logs: LogEntry[];
  height?: number;
}
```

---

### DysregulationHeatmap

Heatmap showing dysregulation patterns by time.

**Location:** `src/components/DysregulationHeatmap.tsx`

**Features:**
- Day of week × Hour of day matrix
- Color intensity by average arousal
- Crisis event overlay

---

### RiskForecast

Crisis risk prediction based on patterns.

**Location:** `src/components/RiskForecast.tsx`

**Features:**
- Current risk level indicator
- Contributing factors list
- Recommended preventive actions
- Peak time predictions

---

### BackgroundShader

3D animated background using Three.js.

**Location:** `src/components/BackgroundShader.tsx`

**Note:** Lazy-loaded for performance.

```tsx
const BackgroundShader = lazy(() => import('./components/BackgroundShader'));

<Suspense fallback={null}>
  <BackgroundShader />
</Suspense>
```

---

## Onboarding

### OnboardingWizard

Multi-step onboarding flow for new users.

**Location:** `src/components/onboarding/OnboardingWizard.tsx`

**Steps:**
1. `StartStep` - Welcome and introduction
2. `ProfileStep` - Child profile setup
3. `TriggersStep` - Known triggers selection
4. `StrategiesStep` - Effective strategies selection

**Usage:**
```tsx
<OnboardingWizard onComplete={() => completeOnboarding()} />
```

---

## Code Splitting

Components are code-split for optimal loading:

```tsx
// Eager load (critical path)
import Home from './components/Home';
import Dashboard from './components/Dashboard';

// Lazy load (secondary routes)
const Analysis = lazy(() => import('./components/Analysis'));
const CrisisMode = lazy(() => import('./components/CrisisMode'));
const BehaviorInsights = lazy(() => import('./components/BehaviorInsights'));
// ... etc
```

---

## Styling

### Design System

"Liquid Glass" dark theme with:
- Backdrop blur effects
- Glass-morphism cards
- Neon accent colors (cyan, purple, green)

### Tailwind Utilities

```css
/* Custom utilities in CSS */
.liquid-glass { /* Glass effect with blur */ }
.liquid-glass-card { /* Card with glass effect */ }
.liquid-glass-active { /* Active state */ }
```

### Usage Example

```tsx
<div className="liquid-glass-card p-6 rounded-2xl">
  <h2 className="text-cyan-400 font-bold">Title</h2>
  <p className="text-gray-300">Content</p>
</div>
```

---

## Animation

Using Framer Motion for animations:

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## Accessibility

Components follow accessibility best practices:

- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast text

```tsx
<button
  aria-label="Legg til ny logg"
  className="..."
  onClick={handleClick}
>
  <Plus className="w-6 h-6" />
</button>
```

---

## Testing

Components can be tested with Vitest and Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { DataProvider } from '../store';
import Dashboard from './Dashboard';

test('renders dashboard', () => {
  render(
    <DataProvider>
      <Dashboard />
    </DataProvider>
  );

  expect(screen.getByText('Oversikt')).toBeInTheDocument();
});
```
