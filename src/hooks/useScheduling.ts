import { useState, useCallback } from "react";
import { scheduleService } from "../services/scheduleService";
import type {
  Schedule,
  ScheduleInput,
} from "../types/scheduling";

export function useScheduling() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateSchedule = async (
    input: ScheduleInput,
    name?: string,
    generatedBy?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduleService.generateSchedule(input, name, generatedBy);
      setSchedule(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to generate schedule");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = useCallback((scheduleData: Schedule) => {
    setSchedule(scheduleData);
  }, []);

  return {
    schedule,
    loading,
    error,
    generateSchedule,
    loadSchedule,
  };
}