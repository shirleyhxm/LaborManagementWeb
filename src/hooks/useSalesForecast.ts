import { useState, useEffect } from "react";
import { salesForecastService, type SalesForecast } from "../services/salesForecastService";

export function useSalesForecast() {
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await salesForecastService.get();
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch sales forecast"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  return {
    forecast,
    loading,
    error,
    refetch: fetchForecast,
  };
}
