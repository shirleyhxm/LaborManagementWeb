import { useState, useEffect } from "react";
import { timeoffService } from "../services/timeoffService";
import type { TimeoffRequest } from "../types/timeoff";
import { useBusiness } from "../contexts/BusinessContext";

export function useTimeoffRequests() {
  const { currentBusiness } = useBusiness();
  const [requests, setRequests] = useState<TimeoffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = async () => {
    if (!currentBusiness) {
      setLoading(false);
      setRequests([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await timeoffService.getAllTimeoffRequests(currentBusiness.id);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch time off requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentBusiness?.id]); // Re-fetch when business changes

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
  };
}
