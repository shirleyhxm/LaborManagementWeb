import { api } from "./api";
import type {
  GenerateScheduleRequest,
  SchedulingResponse,
} from "../types/scheduling";

export const schedulingService = {
  /**
   * Generate a schedule based on provided parameters
   */
  async generateSchedule(
    request: GenerateScheduleRequest
  ): Promise<SchedulingResponse> {
    return api.post<SchedulingResponse, GenerateScheduleRequest>(
      "/scheduling/generate",
      request
    );
  },

  /**
   * Get a sample scheduling request (useful for testing)
   */
  async getSampleRequest(): Promise<GenerateScheduleRequest> {
    return api.get<GenerateScheduleRequest>("/scheduling/sample-request");
  },
};