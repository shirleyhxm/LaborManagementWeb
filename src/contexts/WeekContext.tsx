import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';

import { useFormatters } from '../hooks/useFormatters';

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
  // Safe here: LocaleProvider is the outermost provider in main.tsx, so it is always an
  // ancestor of this one.
  const { formatDateRange } = useFormatters();

  // Load selected week from localStorage on mount, or default to current week
  useEffect(() => {
    const storedWeek = localStorage.getItem(SELECTED_WEEK_KEY);
    const today = new Date();

    if (storedWeek) {
      try {
        const parsed = JSON.parse(storedWeek);
        // Convert stored strings back to Date objects
        const storedStartDate = new Date(parsed.startDate);
        const storedEndDate = new Date(parsed.endDate);

        // Normalize to ensure week starts on Monday
        const normalizedStartDate = startOfWeek(storedStartDate, { weekStartsOn: 1 });
        const normalizedEndDate = endOfWeek(normalizedStartDate, { weekStartsOn: 1 });

        setSelectedWeekState({
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        });
      } catch (error) {
        console.error('Failed to parse stored week:', error);
        localStorage.removeItem(SELECTED_WEEK_KEY);
        // Fall through to set current week
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        setSelectedWeekState({
          startDate: currentWeekStart,
          endDate: currentWeekEnd,
        });
      }
    } else {
      // No stored week, default to current week
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      setSelectedWeekState({
        startDate: currentWeekStart,
        endDate: currentWeekEnd,
      });
    }
  }, []);

  /**
   * Set selected week and persist to localStorage
   */
  const setSelectedWeek = (week: WeekRange) => {
    // Normalize to ensure week starts on Monday
    const normalizedStartDate = startOfWeek(week.startDate, { weekStartsOn: 1 });
    const normalizedEndDate = endOfWeek(normalizedStartDate, { weekStartsOn: 1 });

    const normalizedWeek = {
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    };

    setSelectedWeekState(normalizedWeek);
    // Store as ISO strings for JSON compatibility
    localStorage.setItem(SELECTED_WEEK_KEY, JSON.stringify({
      startDate: normalizedWeek.startDate.toISOString(),
      endDate: normalizedWeek.endDate.toISOString(),
    }));
  };

  /**
   * The week's range, written the way the active region writes dates —
   * "Sep 7 – 13, 2026" under en-US, "7–13 Sept 2026" under en-GB.
   *
   * `Intl.formatRange` does the eliding as well as the ordering: it drops the parts the two
   * ends share and knows where each locale puts the day relative to the month. Assembling
   * this from date-fns parts cannot, since the template itself ("MMM d-d, yyyy") encodes a
   * US ordering that no amount of locale-aware month naming undoes.
   */
  const formatWeekDisplay = (week: WeekRange): string =>
    formatDateRange(week.startDate, week.endDate);

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
