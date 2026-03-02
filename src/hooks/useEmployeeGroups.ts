import { useState, useEffect, useCallback } from "react";
import { employeeGroupService } from "../services/employeeGroupService";
import type { EmployeeGroup } from "../types/employeeGroup";
import { ApiError } from "../services/api";
import { useBusiness } from "../contexts/BusinessContext";

export function useEmployeeGroups() {
  const { currentBusiness } = useBusiness();
  const [groups, setGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!currentBusiness) {
      setLoading(false);
      setGroups([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await employeeGroupService.getAllGroups(currentBusiness.id);
      setGroups(data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to fetch employee groups", 500));
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]); // Add dependency on currentBusiness

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const refetch = useCallback(() => {
    return fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    error,
    refetch,
  };
}