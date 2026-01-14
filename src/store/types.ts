/**
 * Store context type definitions
 * Separated from implementation for clean imports
 */
import type {
    LogEntry,
    CrisisEvent,
    CrisisReflection,
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
    crisisReflections: CrisisReflection[];
    addCrisisEvent: (event: Omit<CrisisEvent, 'dayOfWeek' | 'timeOfDay' | 'hourOfDay'>) => boolean;
    updateCrisisEvent: (id: string, updates: Partial<CrisisEvent>) => void;
    deleteCrisisEvent: (id: string) => void;
    getCrisisByDateRange: (startDate: Date, endDate: Date) => CrisisEvent[];
    getAverageCrisisDuration: () => number;
    getCrisisCountByType: () => Record<string, number>;
    getCrisisEventsByContext: (context: ContextType) => CrisisEvent[];
    updateCrisisRecoveryTime: (id: string, recoveryMinutes: number) => void;
    addCrisisReflection: (reflection: Omit<CrisisReflection, 'id' | 'timestamp'>) => void;
    getReflectionForCrisis: (crisisId: string) => CrisisReflection | undefined;
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

/**
 * User-configurable analysis settings
 */
export interface AnalysisSettings {
    /** Recency decay half-life in days (3-21, default 7) - lower = recent data matters more */
    recencyDecayHalfLife: number;
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
    recencyDecayHalfLife: 7,
};

export interface SettingsContextType {
    hasCompletedOnboarding: boolean;
    completeOnboarding: () => void;
    refreshData: () => void;
    analysisSettings: AnalysisSettings;
    updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void;
}
