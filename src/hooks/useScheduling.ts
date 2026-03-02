import { useState, useCallback } from "react";
import { scheduleService } from "../services/scheduleService";
import type {
  Schedule,
  ScheduleInput,
} from "../types/scheduling";
import { useBusiness } from "../contexts/BusinessContext";

export function useScheduling() {
  const { currentBusiness } = useBusiness();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateSchedule = async (
    input: ScheduleInput,
    name?: string,
    generatedBy?: string
  ) => {
    if (!currentBusiness) {
      const error = new Error("No business selected");
      setError(error);
      throw error;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await scheduleService.generateSchedule(currentBusiness.id, input, name, generatedBy);
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