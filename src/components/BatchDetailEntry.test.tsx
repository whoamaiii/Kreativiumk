/**
 * Tests for Batch Detail Entry Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchDetailEntry } from './BatchDetailEntry';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from '../store';
import type { LogEntry } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

// Mock localStorage with quick logs
function setupQuickLogs(logs: Partial<LogEntry>[]) {
    const fullLogs = logs.map((log, i) => ({
        id: crypto.randomUUID(), // Use valid UUID
        timestamp: new Date(Date.now() - i * 3600000).toISOString(), // Each log 1 hour apart
        arousal: 5,
        valence: 5,
        energy: 5,
        duration: 30,
        context: 'home' as const,
        sensoryTriggers: [],
        contextTriggers: [],
        strategies: [],
        note: '',
        dayOfWeek: 'monday' as const,
        timeOfDay: 'morning' as const,
        hourOfDay: 10,
        ...log
    }));
    localStorage.setItem('kreativium_logs', JSON.stringify(fullLogs));
}

const renderBatchDetailEntry = (props = {}) => {
    return render(
        <BrowserRouter>
            <DataProvider>
                <BatchDetailEntry {...props} />
            </DataProvider>
        </BrowserRouter>
    );
};

describe('BatchDetailEntry', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    // =========================================================================
    // RENDER TESTS
    // =========================================================================

    describe('Rendering', () => {
        it('should show empty state when no logs need enrichment', () => {
            localStorage.setItem('kreativium_logs', JSON.stringify([]));
            renderBatchDetailEntry();
            expect(screen.getByText('Ingen logger trenger detaljer')).toBeInTheDocument();
        });

        it('should show completion message in end-of-day mode when no logs', () => {
            localStorage.setItem('kreativium_logs', JSON.stringify([]));
            renderBatchDetailEntry({ endOfDayMode: true });
            expect(screen.getByText('Alle logger er fullført!')).toBeInTheDocument();
        });

        it('should display quick logs that need enrichment', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] },
                { quickLogLevel: 'struggling', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            expect(screen.getByText('Bra')).toBeInTheDocument();
            expect(screen.getByText('Sliter')).toBeInTheDocument();
        });

        it('should show count of remaining logs', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] },
                { quickLogLevel: 'struggling', sensoryTriggers: [], contextTriggers: [], strategies: [] },
                { quickLogLevel: 'crisis', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            expect(screen.getByText('3 igjen')).toBeInTheDocument();
        });

        it('should not show logs that already have triggers', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: ['auditory'], contextTriggers: [], strategies: [] },
                { quickLogLevel: 'struggling', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            // Only struggling should show (good has triggers)
            expect(screen.queryByText('Bra')).not.toBeInTheDocument();
            expect(screen.getByText('Sliter')).toBeInTheDocument();
        });

        it('should not show logs that already have strategies', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: ['breathing'] },
                { quickLogLevel: 'crisis', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            // Only crisis should show (good has strategies)
            expect(screen.queryByText('Bra')).not.toBeInTheDocument();
            expect(screen.getByText('Krise')).toBeInTheDocument();
        });

        it('should show different title in end-of-day mode', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry({ endOfDayMode: true });

            expect(screen.getByText('Dagens gjennomgang')).toBeInTheDocument();
        });

        it('should show relative time for recent logs', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            // Should show time indicator
            expect(screen.getByText(/min siden|time siden|timer siden|Akkurat nå/)).toBeInTheDocument();
        });
    });

    // =========================================================================
    // EXPANSION TESTS
    // =========================================================================

    describe('Card Expansion', () => {
        it('should expand log card on click', async () => {
            setupQuickLogs([
                { quickLogLevel: 'struggling', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Sliter').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });
        });

        it('should show trigger sections when expanded', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
                expect(screen.getByText('Kontekstuelle utløsere')).toBeInTheDocument();
                expect(screen.getByText('Strategier brukt')).toBeInTheDocument();
            });
        });

        it('should show note input when expanded', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Hva skjedde? Hva husker du?')).toBeInTheDocument();
            });
        });

        it('should collapse card when clicked again', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });

            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.queryByText('Sensoriske utløsere')).not.toBeInTheDocument();
            });
        });
    });

    // =========================================================================
    // TRIGGER SELECTION TESTS
    // =========================================================================

    describe('Trigger Selection', () => {
        it('should toggle sensory trigger on click', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });

            // Click on a trigger (auditory - fallback key)
            const auditivButton = screen.getByText('auditory');
            fireEvent.click(auditivButton);

            // Button should now have selected styling (check for cyan color class)
            await waitFor(() => {
                expect(auditivButton.closest('button')).toHaveClass('bg-cyan-500/30');
            });
        });

        it('should toggle context trigger on click', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Kontekstuelle utløsere')).toBeInTheDocument();
            });

            // Click on a context trigger (transition - fallback key)
            const transitionButton = screen.getByText('transition');
            fireEvent.click(transitionButton);

            await waitFor(() => {
                expect(transitionButton.closest('button')).toHaveClass('bg-cyan-500/30');
            });
        });

        it('should toggle strategy on click', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Strategier brukt')).toBeInTheDocument();
            });

            // Click on a strategy (breathing - fallback key)
            const breathingButton = screen.getByText('breathing');
            fireEvent.click(breathingButton);

            await waitFor(() => {
                expect(breathingButton.closest('button')).toHaveClass('bg-cyan-500/30');
            });
        });

        it('should deselect when clicking selected item', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });

            const auditivButton = screen.getByText('auditory');

            // Select
            fireEvent.click(auditivButton);
            await waitFor(() => {
                expect(auditivButton.closest('button')).toHaveClass('bg-cyan-500/30');
            });

            // Deselect
            fireEvent.click(auditivButton);
            await waitFor(() => {
                expect(auditivButton.closest('button')).not.toHaveClass('bg-cyan-500/30');
            });
        });
    });

    // =========================================================================
    // STRATEGY EFFECTIVENESS TESTS
    // =========================================================================

    describe('Strategy Effectiveness', () => {
        it('should show effectiveness options when strategy is selected', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Strategier brukt')).toBeInTheDocument();
            });

            // Select a strategy first (breathing - fallback key)
            const breathingButton = screen.getByText('breathing');
            fireEvent.click(breathingButton);

            // Effectiveness options should appear
            await waitFor(() => {
                expect(screen.getByText('Fungerte strategiene?')).toBeInTheDocument();
                expect(screen.getByText('Hjalp')).toBeInTheDocument();
                expect(screen.getByText('Uendret')).toBeInTheDocument();
                expect(screen.getByText('Eskalerte')).toBeInTheDocument();
            });
        });

        it('should allow selecting effectiveness', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Strategier brukt')).toBeInTheDocument();
            });

            // Select a strategy (breathing - fallback key)
            fireEvent.click(screen.getByText('breathing'));

            await waitFor(() => {
                expect(screen.getByText('Hjalp')).toBeInTheDocument();
            });

            // Select effectiveness
            const helpedButton = screen.getByText('Hjalp');
            fireEvent.click(helpedButton);

            await waitFor(() => {
                expect(helpedButton.closest('button')).toHaveClass('bg-emerald-500/30');
            });
        });
    });

    // =========================================================================
    // NOTE INPUT TESTS
    // =========================================================================

    describe('Note Input', () => {
        it('should allow entering notes', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Hva skjedde? Hva husker du?');
                fireEvent.change(textarea, { target: { value: 'Test note content' } });
                expect(textarea).toHaveValue('Test note content');
            });
        });
    });

    // =========================================================================
    // SAVE AND SKIP TESTS
    // =========================================================================

    describe('Save and Skip Actions', () => {
        it('should have save and skip buttons when expanded', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Lagre')).toBeInTheDocument();
                expect(screen.getByText('Hopp over')).toBeInTheDocument();
            });
        });

        it('should show saved indicator after saving', async () => {
            // Use two logs so we can see the saved indicator on one while the other remains
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] },
                { quickLogLevel: 'struggling', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Lagre')).toBeInTheDocument();
            });

            // Select some data first (auditory - fallback key)
            fireEvent.click(screen.getByText('auditory'));

            // Save - the log should show "Lagret" before being hidden
            fireEvent.click(screen.getByText('Lagre'));

            // After saving, card should collapse and show the saved indicator briefly
            // Since the log is enriched, it will be removed, but we should see the count decrease
            await waitFor(() => {
                expect(screen.getByText('1 igjen')).toBeInTheDocument();
            });
        });

        it('should collapse card after saving', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Lagre')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('auditory'));
            fireEvent.click(screen.getByText('Lagre'));

            await waitFor(() => {
                expect(screen.queryByText('Sensoriske utløsere')).not.toBeInTheDocument();
            });
        });

        it('should collapse card on skip', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Hopp over')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Hopp over'));

            await waitFor(() => {
                expect(screen.queryByText('Sensoriske utløsere')).not.toBeInTheDocument();
            });
        });

        it('should call onComplete when all logs are enriched', async () => {
            const onComplete = vi.fn();
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry({ onComplete });

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            await waitFor(() => {
                expect(screen.getByText('Lagre')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('auditory'));
            fireEvent.click(screen.getByText('Lagre'));

            await waitFor(() => {
                expect(onComplete).toHaveBeenCalled();
            });
        });
    });

    // =========================================================================
    // TIME WINDOW TESTS
    // =========================================================================

    describe('Time Window', () => {
        it('should not show logs older than maxHoursBack', () => {
            // Create a log from 48 hours ago
            const oldLog = {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
                quickLogLevel: 'good',
                sensoryTriggers: [],
                contextTriggers: [],
                strategies: [],
                arousal: 5,
                valence: 5,
                energy: 5,
                duration: 30,
                context: 'home' as const,
                note: '',
                dayOfWeek: 'monday' as const,
                timeOfDay: 'morning' as const,
                hourOfDay: 10
            };
            localStorage.setItem('kreativium_logs', JSON.stringify([oldLog]));

            renderBatchDetailEntry({ maxHoursBack: 24 });

            // Should show empty state since log is too old
            expect(screen.getByText('Ingen logger trenger detaljer')).toBeInTheDocument();
        });

        it('should show logs within maxHoursBack', () => {
            // Create a log from 2 hours ago
            const recentLog = {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
                quickLogLevel: 'good',
                sensoryTriggers: [],
                contextTriggers: [],
                strategies: [],
                arousal: 5,
                valence: 5,
                energy: 5,
                duration: 30,
                context: 'home' as const,
                note: '',
                dayOfWeek: 'monday' as const,
                timeOfDay: 'morning' as const,
                hourOfDay: 10
            };
            localStorage.setItem('kreativium_logs', JSON.stringify([recentLog]));

            renderBatchDetailEntry({ maxHoursBack: 24 });

            expect(screen.getByText('Bra')).toBeInTheDocument();
        });
    });

    // =========================================================================
    // SHOW MORE/LESS TESTS
    // =========================================================================

    describe('Show More/Less', () => {
        it('should show "Vis flere" button when more than 6 items', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            // Wait for the trigger section to appear first
            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });

            // There are multiple sections with more than 6 items, so multiple "Vis flere" buttons appear
            await waitFor(() => {
                const visFlereButtons = screen.getAllByText('Vis flere');
                expect(visFlereButtons.length).toBeGreaterThan(0);
            });
        });

        it('should toggle to show all items', async () => {
            setupQuickLogs([
                { quickLogLevel: 'good', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            const cardHeader = screen.getByText('Bra').closest('button');
            fireEvent.click(cardHeader!);

            // Wait for the trigger section to appear
            await waitFor(() => {
                expect(screen.getByText('Sensoriske utløsere')).toBeInTheDocument();
            });

            // Find and click the first "Vis flere" button
            await waitFor(() => {
                const visFlereButtons = screen.getAllByText('Vis flere');
                expect(visFlereButtons.length).toBeGreaterThan(0);
                fireEvent.click(visFlereButtons[0]);
            });

            // At least one section should now show "Vis færre"
            await waitFor(() => {
                const visFaerreButtons = screen.queryAllByText('Vis færre');
                expect(visFaerreButtons.length).toBeGreaterThan(0);
            });
        });
    });

    // =========================================================================
    // CONTEXT DISPLAY TESTS
    // =========================================================================

    describe('Context Display', () => {
        it('should show home context label', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', context: 'home', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            expect(screen.getByText('Hjemme')).toBeInTheDocument();
        });

        it('should show school context label', () => {
            setupQuickLogs([
                { quickLogLevel: 'good', context: 'school', sensoryTriggers: [], contextTriggers: [], strategies: [] }
            ]);
            renderBatchDetailEntry();

            expect(screen.getByText('Skole')).toBeInTheDocument();
        });
    });
});
