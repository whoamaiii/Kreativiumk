# NeuroLogg Pro - API & Services Documentation

## Overview

NeuroLogg Pro uses a three-tier AI service architecture for behavioral analysis:

1. **OpenRouter API** (Primary) - Cloud-based premium models
2. **Google Gemini API** (Alternative) - Cloud-based fallback
3. **WebLLM** (Future) - Local inference for offline-first

---

## AI Services

### `src/services/ai.ts`

Main entry point for all AI analysis. Handles model selection, caching, and fallback logic.

#### `analyzeLogs()`

Analyzes log entries to identify patterns, triggers, and effective strategies.

```typescript
import { analyzeLogs } from './services/ai';

const result = await analyzeLogs(
  logs,           // LogEntry[]
  crisisEvents,   // CrisisEvent[] (optional)
  {
    forceRefresh: false,           // Skip cache
    childProfile: profile,          // ChildProfile for personalization
    onRetry: (attempt, max, model) => {} // Retry callback
  }
);
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `logs` | `LogEntry[]` | Yes | Array of log entries to analyze |
| `crisisEvents` | `CrisisEvent[]` | No | Crisis events for deeper analysis |
| `options.forceRefresh` | `boolean` | No | Bypass cache (default: false) |
| `options.childProfile` | `ChildProfile` | No | Child profile for personalized insights |
| `options.onRetry` | `function` | No | Callback when retrying failed requests |

**Returns:** `Promise<AnalysisResult>`

```typescript
interface AnalysisResult {
  id: string;
  generatedAt: string;
  triggerAnalysis: string;      // Detailed trigger analysis
  strategyEvaluation: string;   // Strategy effectiveness evaluation
  interoceptionPatterns: string; // Biological pattern analysis
  correlations?: AnalysisCorrelation[];
  recommendations?: string[];
  summary: string;
  isDeepAnalysis?: boolean;
  modelUsed?: string;
}
```

---

#### `analyzeLogsDeep()`

Performs deep analysis using premium models (Grok-4, GPT-5.1, Gemini 2.5 Pro).

```typescript
const result = await analyzeLogsDeep(logs, crisisEvents, { childProfile });
```

**Model Cascade:**
1. `x-ai/grok-4` - Primary (256K context, best reasoning)
2. `openai/gpt-5.1` - Fallback
3. `google/gemini-2.5-pro` - Final fallback (1M context)

---

#### `analyzeLogsStreaming()`

Real-time streaming analysis for interactive UI feedback.

```typescript
const result = await analyzeLogsStreaming(
  logs,
  crisisEvents,
  {
    onChunk: (chunk) => console.log(chunk),
    onComplete: (fullText) => console.log('Done:', fullText),
    onError: (error) => console.error(error),
    onRetry: (attempt, max) => console.log(`Retry ${attempt}/${max}`)
  },
  { childProfile }
);
```

---

#### `getApiStatus()`

Returns current API configuration status.

```typescript
const status = getApiStatus();
// {
//   configured: true,
//   freeModel: 'google/gemini-2.0-flash-001',
//   premiumModel: 'x-ai/grok-4',
//   geminiConfigured: false,
//   localModelLoaded: false
// }
```

---

#### `clearAnalysisCache()`

Clears all cached analysis results.

```typescript
clearAnalysisCache();
```

---

### `src/services/aiCommon.ts`

Shared utilities for all AI services.

#### Data Preparation

```typescript
import {
  prepareLogsForAnalysis,
  prepareCrisisEventsForAnalysis,
  generateLogsHash,
  getLogsDateRange
} from './services/aiCommon';

// Prepare logs with privacy sanitization
const prepared = prepareLogsForAnalysis(logs, referenceDate);

// Generate cache key
const hash = generateLogsHash(logs, crisisEvents);

// Get date range safely
const { oldest, newest } = getLogsDateRange(logs);
```

#### Cache Factory

```typescript
import { createAnalysisCache } from './services/aiCommon';

const cache = createAnalysisCache();

// Get cached result
const cached = cache.get(logsHash, 'regular'); // or 'deep'

// Set cached result
cache.set(result, logsHash, 'regular');

// Clear cache
cache.clear();
```

#### Response Parsing

```typescript
import { parseAnalysisResponse, extractJsonFromResponse } from './services/aiCommon';

// Extract JSON from markdown-wrapped response
const json = extractJsonFromResponse(rawContent);

// Parse and validate response structure
const result = parseAnalysisResponse(content);
```

---

### `src/services/gemini.ts`

Google Gemini API integration.

```typescript
import {
  analyzeLogsWithGemini,
  analyzeLogsDeepWithGemini,
  analyzeLogsStreamingWithGemini,
  isGeminiConfigured,
  getGeminiStatus
} from './services/gemini';

// Check if configured
if (isGeminiConfigured()) {
  const result = await analyzeLogsWithGemini(logs, crisisEvents);
}
```

**Models Used:**
- Regular: `gemini-2.0-flash`
- Deep: `gemini-2.5-pro-preview-06-05`

---

### `src/services/localModel.ts`

WebLLM local inference (currently disabled, planned for future).

```typescript
import {
  loadModel,
  unloadModel,
  getModelStatus,
  checkWebGPUSupport,
  analyzeLogsWithLocalModel
} from './services/localModel';

// Check WebGPU support
const { supported, error } = await checkWebGPUSupport();

// Load model (requires WebGPU)
await loadModel(modelId, onProgress);

// Get status
const status = getModelStatus();
// { loaded: boolean, modelId: string | null }

// Analyze (when loaded)
const result = await analyzeLogsWithLocalModel(logs, crisisEvents);
```

---

## API Configuration

### Environment Variables

```env
# Required for cloud AI
VITE_OPENROUTER_API_KEY=sk-or-...    # OpenRouter API key
VITE_GEMINI_API_KEY=AIza...           # Google Gemini API key

# Optional
VITE_SITE_URL=https://yourapp.com     # For API headers
```

### Rate Limits & Timeouts

```typescript
const API_CONFIG = {
  timeoutMs: 60000,           // Regular: 1 minute
  timeoutMsPremium: 180000,   // Deep: 3 minutes
  maxRetries: 3,
  retryDelayMs: 1000,         // Exponential backoff
  cacheTtlMs: 15 * 60 * 1000, // 15 minutes
};
```

---

## Error Handling

### Error Types

| Error | Cause | Resolution |
|-------|-------|------------|
| `No logs provided` | Empty logs array | Ensure logs exist |
| `OpenRouter: 401` | Invalid API key | Check `VITE_OPENROUTER_API_KEY` |
| `Empty response` | Model returned nothing | Retry or check prompt |
| `Invalid response format` | JSON parse failed | Check model output |
| `Stream read timeout` | Network issue | Retry with non-streaming |

### Retry Behavior

```typescript
// Automatic retry with exponential backoff
// Attempt 1: immediate
// Attempt 2: 1s delay
// Attempt 3: 2s delay (switches to fallback model)

analyzeLogs(logs, [], {
  onRetry: (attempt, max, model) => {
    toast(`Prøver igjen (${attempt}/${max}) med ${model}...`);
  }
});
```

---

## Data Sanitization

All data is sanitized before sending to AI:

```typescript
// Personal identifiers removed
sanitizeText("John called Mary") → "[PERSON] called [PERSON]"

// Phone numbers removed
sanitizeText("Call 12345678") → "Call [PHONE]"

// Emails removed
sanitizeText("email@test.com") → "[EMAIL]"

// Timestamps made relative
makeTimestampRelative(timestamp, now) → "I dag, morgen"
```

---

## Caching Strategy

1. **Cache Key:** Hash of log IDs + crisis event IDs
2. **TTL:** 15 minutes
3. **Types:** Separate caches for `regular` and `deep` analysis
4. **Invalidation:** Automatic on TTL expiry, manual via `clearAnalysisCache()`

```typescript
// Cache prevents duplicate API calls
const result1 = await analyzeLogs(logs); // API call
const result2 = await analyzeLogs(logs); // Returns cached

// Force refresh bypasses cache
const fresh = await analyzeLogs(logs, [], { forceRefresh: true });
```

---

## Request Deduplication

Concurrent identical requests are automatically deduplicated:

```typescript
// These two calls share a single API request
const [r1, r2] = await Promise.all([
  analyzeLogs(logs),
  analyzeLogs(logs)
]);
```
