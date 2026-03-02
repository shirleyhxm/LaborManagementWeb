import { useState, useEffect } from "react";
import { employeeService } from "../services/employeeService";
import type { Employee } from "../types/employee";
import { useBusiness } from "../contexts/BusinessContext";

export function useEmployees() {
  const { currentBusiness } = useBusiness();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmployees = async () => {
    if (!currentBusiness) {
      setLoading(false);
      setEmployees([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAllEmployees(currentBusiness.id);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch employees"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentBusiness?.id]); // Re-fetch when business changes

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
  };
}