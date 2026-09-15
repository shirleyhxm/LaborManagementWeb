import { useState, useEffect } from "react";
import { employeeService } from "../services/employeeService";
import type { Employee } from "../types/employee";
import { useBusiness } from "../contexts/BusinessContext";

/**
 * Employees in a stable, readable order.
 *
 * The API returns no guaranteed order, and an update can change it - so saving one employee
 * reshuffled every card on the page, leaving the manager hunting for the row they had just
 * been reading. Sorted here rather than in each view so the employee list, the schedule grid
 * and the requests panel all agree on where someone sits.
 *
 * Tie-broken on id, which keeps two people sharing a name from swapping places between
 * fetches for the same reason.
 */
const sortByName = (employees: Employee[]): Employee[] =>
  [...employees].sort(
    (a, b) => a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id)
  );

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
      setEmployees(sortByName(data));
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