import { useCallback, useEffect, useState } from 'react';
import { employeeShareService } from '../services/employeeShareService';
import { useBusiness } from '../contexts/BusinessContext';
import type { Employee } from '../types/employee';

/**
 * Where each employee on the roster works, keyed by employee id.
 *
 * Assignments are only readable from an employee's home business, so this
 * skips anyone borrowed from elsewhere — their card shows "Home: X" instead,
 * which needs no lookup.
 *
 * Returns an empty map for single-location accounts rather than making calls
 * whose result nothing would render.
 */
export function useEmployeeLocations(employees: Employee[]) {
  const { businesses, currentBusiness } = useBusiness();
  const [locationsByEmployee, setLocationsByEmployee] = useState<Record<string, string[]>>({});

  const hasMultipleLocations = businesses.length > 1;

  // Depend on the id list rather than the array identity, so a refetch that
  // returns equivalent employees doesn't re-trigger the whole sweep.
  const ownedIdsKey = employees
    .filter((e) => e.businessId === currentBusiness?.id)
    .map((e) => e.id)
    .sort()
    .join(',');

  const load = useCallback(async () => {
    if (!currentBusiness || !hasMultipleLocations || !ownedIdsKey) {
      setLocationsByEmployee({});
      return;
    }

    const ids = ownedIdsKey.split(',');
    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const result = await employeeShareService.getShares(currentBusiness.id, id);
          return [id, (result.sharedWith ?? []).map((s) => s.businessId)] as const;
        } catch {
          // A failed lookup should cost this one employee their badges, not
          // break the roster.
          return [id, []] as const;
        }
      })
    );

    setLocationsByEmployee(Object.fromEntries(entries));
  }, [currentBusiness, hasMultipleLocations, ownedIdsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { locationsByEmployee, refetch: load };
}
