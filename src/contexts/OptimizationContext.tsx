import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
  DemandMatrix,
  WorkerInput,
  ConstraintConfig,
  ObjectiveConfig,
  OptimizationJobStatus,
} from '../types/optimization';

// LocalStorage keys
const STORAGE_KEYS = {
  DEMAND_MATRIX: 'optimization_demand_matrix',
  WORKERS: 'optimization_workers',
  CONSTRAINTS: 'optimization_constraints',
  OBJECTIVE: 'optimization_objective',
  CURRENT_JOB_ID: 'optimization_current_job_id',
  CURRENT_JOB_STATUS: 'optimization_current_job_status',
};

interface OptimizationState {
  // Inputs
  demandMatrix: DemandMatrix | null;
  workers: WorkerInput[];
  constraints: ConstraintConfig;
  objective: ObjectiveConfig;

  // Job tracking
  currentJobId: string | null;
  currentJobStatus: OptimizationJobStatus | null;

  // UI state
  isOptimizing: boolean;

  // Actions
  setDemandMatrix: (matrix: DemandMatrix) => void;
  setWorkers: (workers: WorkerInput[]) => void;
  addWorker: (worker: WorkerInput) => void;
  removeWorker: (index: number) => void;
  setConstraints: (constraints: ConstraintConfig) => void;
  setObjective: (objective: ObjectiveConfig) => void;
  setCurrentJobId: (jobId: string | null) => void;
  setCurrentJobStatus: (status: OptimizationJobStatus | null) => void;
  setIsOptimizing: (isOptimizing: boolean) => void;
  resetAll: () => void;
}

const defaultConstraints: ConstraintConfig = {
  maxHoursPerWeek: 40,
  minRestBetweenShifts: 8,
  maxConsecutiveDays: 6,
  overtimeThreshold: 40,
  overtimeMultiplier: 1.5,
  minShiftLength: 4.0,
  maxShiftLength: 10.0,
};

const defaultObjective: ObjectiveConfig = {
  primary: 'BALANCED',
};

// Helper functions for localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const OptimizationContext = createContext<OptimizationState | undefined>(undefined);

export function OptimizationProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage
  const [demandMatrix, setDemandMatrixState] = useState<DemandMatrix | null>(() =>
    loadFromStorage(STORAGE_KEYS.DEMAND_MATRIX, null)
  );
  const [workers, setWorkersState] = useState<WorkerInput[]>(() =>
    loadFromStorage(STORAGE_KEYS.WORKERS, [])
  );
  const [constraints, setConstraintsState] = useState<ConstraintConfig>(() =>
    loadFromStorage(STORAGE_KEYS.CONSTRAINTS, defaultConstraints)
  );
  const [objective, setObjectiveState] = useState<ObjectiveConfig>(() =>
    loadFromStorage(STORAGE_KEYS.OBJECTIVE, defaultObjective)
  );
  const [currentJobId, setCurrentJobIdState] = useState<string | null>(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_JOB_ID, null)
  );
  const [currentJobStatus, setCurrentJobStatusState] = useState<OptimizationJobStatus | null>(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_JOB_STATUS, null)
  );
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DEMAND_MATRIX, demandMatrix);
  }, [demandMatrix]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.WORKERS, workers);
  }, [workers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONSTRAINTS, constraints);
  }, [constraints]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OBJECTIVE, objective);
  }, [objective]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_JOB_ID, currentJobId);
  }, [currentJobId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_JOB_STATUS, currentJobStatus);
  }, [currentJobStatus]);

  // Wrapper functions that update state (and trigger localStorage saves via useEffect)
  const setDemandMatrix = (matrix: DemandMatrix) => {
    setDemandMatrixState(matrix);
  };

  const setConstraints = (newConstraints: ConstraintConfig) => {
    setConstraintsState(newConstraints);
  };

  const setObjective = (newObjective: ObjectiveConfig) => {
    setObjectiveState(newObjective);
  };

  const setCurrentJobId = (jobId: string | null) => {
    setCurrentJobIdState(jobId);
  };

  const setCurrentJobStatus = (status: OptimizationJobStatus | null) => {
    setCurrentJobStatusState(status);
  };

  const setWorkers = (newWorkers: WorkerInput[]) => {
    setWorkersState(newWorkers);
  };

  const addWorker = (worker: WorkerInput) => {
    setWorkersState(prev => [...prev, worker]);
  };

  const removeWorker = (index: number) => {
    setWorkersState(prev => prev.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setDemandMatrixState(null);
    setWorkersState([]);
    setConstraintsState(defaultConstraints);
    setObjectiveState(defaultObjective);
    setCurrentJobIdState(null);
    setCurrentJobStatusState(null);
    setIsOptimizing(false);

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  const value: OptimizationState = {
    demandMatrix,
    workers,
    constraints,
    objective,
    currentJobId,
    currentJobStatus,
    isOptimizing,
    setDemandMatrix,
    setWorkers,
    addWorker,
    removeWorker,
    setConstraints,
    setObjective,
    setCurrentJobId,
    setCurrentJobStatus,
    setIsOptimizing,
    resetAll,
  };

  return (
    <OptimizationContext.Provider value={value}>
      {children}
    </OptimizationContext.Provider>
  );
}

export function useOptimization() {
  const context = useContext(OptimizationContext);
  if (context === undefined) {
    throw new Error('useOptimization must be used within OptimizationProvider');
  }
  return context;
}
