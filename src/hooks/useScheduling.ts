import { useState } from "react";
import { schedulingService } from "../services/schedulingService";
import type {
  GenerateScheduleRequest,
  SchedulingResponse,
} from "../types/scheduling";

export function useScheduling() {
  const [schedule, setSchedule] = useState<SchedulingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateSchedule = async (request: GenerateScheduleRequest) => {
    try {
      setLoading(true);
      setError(null);
      const data = await schedulingService.generateSchedule(request);
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

  const loadSchedule = (scheduleData: SchedulingResponse) => {
    setSchedule(scheduleData);
  };

  return {
    schedule,
    loading,
    error,
    generateSchedule,
    loadSchedule,
  };
}