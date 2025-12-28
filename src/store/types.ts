/**
 * Store context type definitions
 * Separated from implementation for clean imports
 */
import type {
    LogEntry,
    CrisisEvent,
    ScheduleEntry,
    Goal,
    GoalProgress,
    ContextType,
    DailyScheduleTemplate,
    ChildProfile
} from '../types';

// ============================================
// CONTEXT TYPE INTERFACES
// ============================================

export interface LogsContextType {
    logs: LogEntry[];
    addLog: (log: Omit<LogEntry, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'>) => boolean;
    updateLog: (id: string, updates: Partial<LogEntry>) => void;
    deleteLog: (id: string) => void;
    getLogsByDateRange: (startDate: Date, endDate: Date) => LogEntry[];
    getLogsByContext: (context: ContextType) => LogEntry[];
    getLogsNearTimestamp: (timestamp: string, windowMinutes: number) => LogEntry[];
    getLogsByContextAndDateRange: (context: ContextType, startDate: Date, endDate: Date) => LogEntry[];
}

export interface CrisisContextType {
    crisisEvents: CrisisEvent[];
    addCrisisEvent: (event: Omit<CrisisEvent, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'>) => boolean;
    updateCrisisEvent: (id: string, updates: Partial<CrisisEvent>) => void;
    deleteCrisisEvent: (id: string) => void;
    getCrisisByDateRange: (startDate: Date, endDate: Date) => CrisisEvent[];
    getAverageCrisisDuration: () => number;
    getCrisisCountByType: () => Record<string, number>;
    getCrisisEventsByContext: (context: ContextType) => CrisisEvent[];
    updateCrisisRecoveryTime: (id: string, recoveryMinutes: number) => void;
}

export interface ScheduleContextType {
    scheduleEntries: ScheduleEntry[];
    scheduleTemplates: DailyScheduleTemplate[];
    addScheduleEntry: (entry: ScheduleEntry) => void;
    updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
    deleteScheduleEntry: (id: string) => void;
    getEntriesByDate: (date: string) => ScheduleEntry[];
    addTemplate: (template: DailyScheduleTemplate) => void;
    updateTemplate: (id: string, updates: Partial<DailyScheduleTemplate>) => void;
    deleteTemplate: (id: string) => void;
    getCompletionRate: (dateRange?: { start: Date; end: Date }) => number;
}

export interface GoalsContextType {
    goals: Goal[];
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    deleteGoal: (id: string) => void;
    addGoalProgress: (goalId: string, progress: Omit<GoalProgress, 'id' | 'goalId'>) => void;
    getGoalProgress: (goalId: string) => GoalProgress[];
    getOverallProgress: () => number;
}

export interface AppContextType {
    currentContext: ContextType;
    setCurrentContext: (context: ContextType) => void;
}

export interface ChildProfileContextType {
    childProfile: ChildProfile | null;
    setChildProfile: (profile: ChildProfile) => void;
    updateChildProfile: (updates: Partial<ChildProfile>) => void;
    clearChildProfile: () => void;
}

export interface SettingsContextType {
    hasCompletedOnboarding: boolean;
    completeOnboarding: () => void;
    refreshData: () => void;
}
