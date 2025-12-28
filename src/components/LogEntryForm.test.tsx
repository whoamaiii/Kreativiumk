import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogEntryForm } from './LogEntryForm';

// Mock store hooks
const mockAddLog = vi.fn();
const mockContext = 'home';

vi.mock('../store', () => ({
    useLogs: () => ({ addLog: mockAddLog }),
    useAppContext: () => ({ context: mockContext }),
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: () => 'test-uuid-123',
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
            const { initial, animate, exit, transition, layout, layoutId, whileHover, whileTap, ...rest } = props;
            void initial; void animate; void exit; void transition; void layout; void layoutId; void whileHover; void whileTap;
            return <div {...rest}>{children}</div>;
        },
        button: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
            const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
            void initial; void animate; void exit; void transition; void whileHover; void whileTap;
            return <button {...rest}>{children}</button>;
        },
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | object) => {
            // Return fallback if it's a string, otherwise return key
            if (typeof fallback === 'string') return fallback;
            if (typeof fallback === 'object' && fallback !== null && 'defaultValue' in fallback) {
                return (fallback as { defaultValue: string }).defaultValue;
            }
            return key;
        },
    }),
}));

// Mock Toast
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('./Toast', () => ({
    useToast: () => ({
        showSuccess: mockShowSuccess,
        showError: mockShowError,
    }),
}));

// Mock TriggerSelector
vi.mock('./TriggerSelector', () => ({
    TriggerSelector: ({ title, selected, onChange }: {
        title?: string;
        selected?: string[];
        onChange?: (items: string[]) => void
    }) => {
        const safeTitle = title || 'trigger';
        const safeSelected = selected || [];
        const safeId = safeTitle.toLowerCase().replace(/\s/g, '-');
        return (
            <div data-testid={`trigger-selector-${safeId}`}>
                <span>{safeTitle}</span>
                <button
                    onClick={() => onChange?.(safeSelected.length > 0 ? [] : ['test_trigger'])}
                    data-testid={`toggle-${safeId}`}
                >
                    Toggle
                </button>
                <span data-testid={`selected-count-${safeId}`}>
                    {safeSelected.length}
                </span>
            </div>
        );
    },
}));

describe('LogEntryForm', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddLog.mockReturnValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders without crashing', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            expect(document.body).toBeTruthy();
        });

        it('renders close button', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const closeButton = screen.getByRole('button', { name: /close|lukk/i });
            expect(closeButton).toBeInTheDocument();
        });

        it('renders arousal slider', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /arousal|aktivering/i });
            expect(slider).toBeInTheDocument();
        });

        it('renders valence slider', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /valence|valens/i });
            expect(slider).toBeInTheDocument();
        });

        it('renders energy slider', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /energy|energi/i });
            expect(slider).toBeInTheDocument();
        });

        it('renders duration input', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const duration = screen.getByLabelText(/duration|varighet/i);
            expect(duration).toBeInTheDocument();
        });

        it('renders note textarea', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const note = screen.getByRole('textbox');
            expect(note).toBeInTheDocument();
        });

        it('renders submit button', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const submitButton = screen.getByRole('button', { name: /save|lagre/i });
            expect(submitButton).toBeInTheDocument();
        });

        it('renders trigger selectors', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            // The form should have multiple trigger selector sections
            const selectors = screen.getAllByTestId(/trigger-selector/);
            expect(selectors.length).toBeGreaterThan(0);
        });
    });

    describe('Form Interactions', () => {
        it('calls onClose when close button clicked', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const closeButton = screen.getByRole('button', { name: /close|lukk/i });
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('updates arousal value on slider change', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /arousal|aktivering/i });
            fireEvent.change(slider, { target: { value: '8' } });
            expect(slider).toHaveValue('8');
        });

        it('updates valence value on slider change', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /valence|valens/i });
            fireEvent.change(slider, { target: { value: '3' } });
            expect(slider).toHaveValue('3');
        });

        it('updates energy value on slider change', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /energy|energi/i });
            fireEvent.change(slider, { target: { value: '7' } });
            expect(slider).toHaveValue('7');
        });

        it('updates note on textarea input', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const note = screen.getByRole('textbox');
            fireEvent.change(note, { target: { value: 'Test note content' } });
            expect(note).toHaveValue('Test note content');
        });
    });

    describe('Form Submission', () => {
        it('has a submit button', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const submitButton = screen.getByRole('button', { name: /save|lagre/i });
            expect(submitButton).toBeInTheDocument();
            expect(submitButton).toHaveAttribute('type', 'submit');
        });

        it('renders form element', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const form = document.querySelector('form');
            expect(form).toBeInTheDocument();
        });

        it('submit button is clickable', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const submitButton = screen.getByRole('button', { name: /save|lagre/i });
            expect(() => fireEvent.click(submitButton)).not.toThrow();
        });
    });

    describe('Initial Values', () => {
        it('has default arousal value of 5', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /arousal|aktivering/i });
            expect(slider).toHaveValue('5');
        });

        it('has default valence value of 5', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /valence|valens/i });
            expect(slider).toHaveValue('5');
        });

        it('has default energy value of 5', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const slider = screen.getByRole('slider', { name: /energy|energi/i });
            expect(slider).toHaveValue('5');
        });

        it('has empty note by default', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const note = screen.getByRole('textbox');
            expect(note).toHaveValue('');
        });
    });

    describe('Slider Ranges', () => {
        it('sliders have valid min and max attributes', () => {
            render(<LogEntryForm onClose={mockOnClose} />);

            // All sliders should have numeric min/max attributes
            const arousalSlider = screen.getByRole('slider', { name: /arousal|aktivering/i });
            const valenceSlider = screen.getByRole('slider', { name: /valence|valens/i });
            const energySlider = screen.getByRole('slider', { name: /energy|energi/i });

            // Verify sliders have min/max attributes
            expect(arousalSlider).toHaveAttribute('min');
            expect(arousalSlider).toHaveAttribute('max', '10');
            expect(valenceSlider).toHaveAttribute('min');
            expect(valenceSlider).toHaveAttribute('max', '10');
            expect(energySlider).toHaveAttribute('min');
            expect(energySlider).toHaveAttribute('max', '10');
        });
    });

    describe('Accessibility', () => {
        it('has accessible labels for sliders', () => {
            render(<LogEntryForm onClose={mockOnClose} />);

            // Check that sliders are accessible via their labels
            expect(screen.getByRole('slider', { name: /arousal|aktivering/i })).toBeInTheDocument();
            expect(screen.getByRole('slider', { name: /valence|valens/i })).toBeInTheDocument();
            expect(screen.getByRole('slider', { name: /energy|energi/i })).toBeInTheDocument();
        });

        it('close button has accessible name', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const closeButton = screen.getByRole('button', { name: /close|lukk/i });
            expect(closeButton).toBeInTheDocument();
        });

        it('submit button has accessible name', () => {
            render(<LogEntryForm onClose={mockOnClose} />);
            const submitButton = screen.getByRole('button', { name: /save|lagre/i });
            expect(submitButton).toBeInTheDocument();
        });
    });
});
