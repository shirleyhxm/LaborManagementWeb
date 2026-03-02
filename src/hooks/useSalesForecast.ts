import { useState, useEffect } from "react";
import { salesForecastService, type SalesForecast } from "../services/salesForecastService";
import { useBusiness } from "../contexts/BusinessContext";

export function useSalesForecast() {
  const { currentBusiness } = useBusiness();
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchForecast = async () => {
    if (!currentBusiness) {
      setLoading(false);
      setForecast(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await salesForecastService.get(currentBusiness.id);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch sales forecast"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [currentBusiness?.id]); // Re-fetch when business changes

  return {
    forecast,
    loading,
    error,
    refetch: fetchForecast,
  };
}
