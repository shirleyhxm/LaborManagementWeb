import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export interface WeekRange {
  startDate: Date;
  endDate: Date;
}

interface WeekContextType {
  selectedWeek: WeekRange | null;
  setSelectedWeek: (week: WeekRange) => void;
  isWeekSelected: boolean;
  formatWeekDisplay: (week: WeekRange) => string;
}

const WeekContext = createContext<WeekContextType | undefined>(undefined);

const SELECTED_WEEK_KEY = 'selected_week';

export function WeekProvider({ children }: { children: ReactNode }) {
  const [selectedWeek, setSelectedWeekState] = useState<WeekRange | null>(null);

  // Load selected week from localStorage on mount
  useEffect(() => {
    const storedWeek = localStorage.getItem(SELECTED_WEEK_KEY);

    if (storedWeek) {
      try {
        const parsed = JSON.parse(storedWeek);
        // Convert stored strings back to Date objects
        setSelectedWeekState({
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
        });
      } catch (error) {
        console.error('Failed to parse stored week:', error);
        localStorage.removeItem(SELECTED_WEEK_KEY);
      }
    }
  }, []);

  /**
   * Set selected week and persist to localStorage
   */
  const setSelectedWeek = (week: WeekRange) => {
    setSelectedWeekState(week);
    // Store as ISO strings for JSON compatibility
    localStorage.setItem(SELECTED_WEEK_KEY, JSON.stringify({
      startDate: week.startDate.toISOString(),
      endDate: week.endDate.toISOString(),
    }));
  };

  /**
   * Format week range for display (e.g., "Jan 13 - Jan 19, 2025")
   */
  const formatWeekDisplay = (week: WeekRange): string => {
    const startMonth = format(week.startDate, 'MMM');
    const startDay = format(week.startDate, 'd');
    const endMonth = format(week.endDate, 'MMM');
    const endDay = format(week.endDate, 'd');
    const year = format(week.endDate, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  const value: WeekContextType = {
    selectedWeek,
    setSelectedWeek,
    isWeekSelected: !!selectedWeek,
    formatWeekDisplay,
  };

  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (context === undefined) {
    throw new Error('useWeek must be used within a WeekProvider');
  }
  return context;
}
