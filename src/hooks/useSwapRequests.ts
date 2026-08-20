import { useState, useEffect } from "react";
import { swapService } from "../services/swapService";
import type { SwapRequest } from "../types/swap";
import { useBusiness } from "../contexts/BusinessContext";

export function useSwapRequests() {
  const { currentBusiness } = useBusiness();
  const [requests, setRequests] = useState<SwapRequest[]>([]);
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
      const data = await swapService.getAllSwapRequests(currentBusiness.id);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch swap requests"));
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
