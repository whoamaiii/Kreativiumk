# NeuroLogg Pro - Setup & Contributing Guide

## Prerequisites

- Node.js 22+ (LTS recommended)
- npm 10+
- Git

---

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd neurolog-pro

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Environment Setup

Create a `.env` file in the project root:

```env
# AI API Keys (at least one required for AI features)
VITE_OPENROUTER_API_KEY=sk-or-v1-...    # Get from openrouter.ai
VITE_GEMINI_API_KEY=AIza...              # Get from ai.google.dev

# Optional
VITE_SITE_URL=https://yourapp.com        # For API headers
```

**Note:** The app works without API keys using mock data for development.

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint validation |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once |

---

## Project Structure

```
neurolog-pro/
├── docs/                 # Documentation (you are here)
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   └── onboarding/   # Onboarding wizard
│   ├── contexts/         # React contexts (ModelContext)
│   ├── services/         # AI APIs, PDF generation
│   ├── utils/            # Utilities and helpers
│   ├── locales/          # i18n translations (en, no)
│   ├── constants/        # App constants
│   ├── test/             # Test setup and mocks
│   ├── App.tsx           # Router and app shell
│   ├── main.tsx          # Entry point
│   ├── store.tsx         # State management
│   └── types.ts          # TypeScript types
├── .env                  # Environment variables (not in git)
├── CLAUDE.md             # AI assistant context
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind configuration
```

---

## Development Workflow

### Adding a New Component

1. Create the component in `src/components/`:

```tsx
// src/components/MyComponent.tsx
import { motion } from 'framer-motion';

export default function MyComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="liquid-glass-card p-6"
    >
      Content
    </motion.div>
  );
}
```

2. Add route in `src/App.tsx`:

```tsx
const MyComponent = lazy(() => import('./components/MyComponent'));

// In routes array
{ path: '/my-route', element: <MyComponent /> }
```

3. Add navigation if needed in `src/components/Navigation.tsx`

---

### Adding a New Context/State

1. Define types in `src/types.ts`:

```typescript
export interface MyData {
  id: string;
  value: string;
}
```

2. Add Zod schema in `src/utils/validation.ts`:

```typescript
export const MyDataSchema = z.object({
  id: z.string().uuid(),
  value: z.string().min(1)
});
```

3. Add context in `src/store.tsx`:

```typescript
interface MyContextType {
  data: MyData[];
  addData: (item: MyData) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export const useMyData = () => {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMyData must be used within DataProvider');
  return context;
};
```

---

### Adding Translations

1. Add keys to `src/locales/no.json` (Norwegian primary):

```json
{
  "myFeature": {
    "title": "Min funksjon",
    "description": "Beskrivelse"
  }
}
```

2. Add to `src/locales/en.json` (English fallback):

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Description"
  }
}
```

3. Use in components:

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

---

## Testing

### Running Tests

```bash
# Watch mode
npm run test

# Single run with coverage
npm run test:run
```

### Writing Tests

```tsx
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataProvider } from '../store';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(
      <DataProvider>
        <MyComponent />
      </DataProvider>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
```

### Test Setup

- Framework: Vitest
- DOM: happy-dom
- Utilities: @testing-library/react
- Config: `src/test/setup.ts`

---

## Code Style

### TypeScript

- Strict mode enabled
- Explicit return types for functions
- Interface over type for objects
- Zod for runtime validation

### React

- Functional components only
- Hooks for state and effects
- useMemo/useCallback for optimization
- Error boundaries for error handling

### Tailwind CSS

- Use design system utilities (`liquid-glass-*`)
- Mobile-first responsive design
- Avoid inline styles
- Keep class lists readable

---

## Build & Deployment

### Production Build

```bash
npm run build
```

Output in `dist/`:
- `index.html` - Entry point
- `assets/` - JS, CSS, images
- `sw.js` - Service worker (PWA)

### Build Optimization

Vite splits bundles automatically:

| Bundle | Contents |
|--------|----------|
| `vendor-react` | React, React DOM |
| `vendor-ui` | Framer Motion, Recharts, Lucide |
| `vendor-three` | Three.js (deferred loading) |
| `vendor-webllm` | WebLLM (future local AI) |
| `utils` | Shared utilities |

### PWA Features

- Offline support via service worker
- App manifest for installation
- Cache strategies for assets

---

## Troubleshooting

### Common Issues

#### `npm run dev` fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript errors

```bash
# Check for type errors
npm run build

# Fix most issues
npx tsc --noEmit
```

#### ESLint errors

```bash
# Check issues
npm run lint

# Auto-fix
npx eslint . --fix
```

#### Test failures

```bash
# Run with verbose output
npm run test:run -- --reporter=verbose

# Run single test file
npm run test:run -- src/components/MyComponent.test.tsx
```

---

## API Keys

### OpenRouter

1. Go to [openrouter.ai](https://openrouter.ai)
2. Create account and get API key
3. Add to `.env`: `VITE_OPENROUTER_API_KEY=sk-or-v1-...`

### Google Gemini

1. Go to [ai.google.dev](https://ai.google.dev)
2. Create project and get API key
3. Add to `.env`: `VITE_GEMINI_API_KEY=AIza...`

---

## Contributing

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Commit Messages

Follow conventional commits:

```
feat: add new analysis feature
fix: correct date calculation in predictions
docs: update API documentation
refactor: simplify state management
test: add tests for CrisisContext
```

### Pull Request Process

1. Create feature branch from `master`
2. Make changes with tests
3. Run `npm run build && npm run test:run`
4. Create PR with description
5. Wait for review

---

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [OpenRouter API](https://openrouter.ai/docs)
- [Google Gemini API](https://ai.google.dev/docs)
