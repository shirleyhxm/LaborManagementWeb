import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { employeeShareService } from "../services/employeeShareService";
import { useBusiness } from "../contexts/BusinessContext";
import type { Employee } from "../types/employee";

interface EmployeeLocationsTabProps {
  employee: Employee;
}

/**
 * Which of the account's locations an employee works at.
 *
 * Assignment rather than an action: the set of locations is a property of the
 * employee, edited alongside their availability because "works at both cafes,
 * weekends only" is one decision, not two.
 *
 * Saves immediately on toggle instead of waiting for the dialog's Save. The
 * rest of the form is one PUT to the employee; locations are separate
 * assignment calls, and pretending otherwise would mean a half-applied save
 * when one succeeds and the other fails.
 */
export function EmployeeLocationsTab({ employee }: EmployeeLocationsTabProps) {
  const { businesses, currentBusiness } = useBusiness();

  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Assignments are always managed from the employee's home business, even
  // when viewing from a location that has borrowed them.
  const homeBusinessId = employee.businessId;
  const isBorrowed = currentBusiness ? homeBusinessId !== currentBusiness.id : false;

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await employeeShareService.getShares(homeBusinessId, employee.id);
      setAssignedIds(new Set((result.sharedWith ?? []).map((s) => s.businessId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  }, [homeBusinessId, employee.id]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleToggle = async (businessId: string, nextAssigned: boolean) => {
    setBusyId(businessId);
    setError(null);
    try {
      if (nextAssigned) {
        await employeeShareService.share(homeBusinessId, employee.id, businessId);
      } else {
        await employeeShareService.unshare(homeBusinessId, employee.id, businessId);
      }
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update locations");
    } finally {
      setBusyId(null);
    }
  };

  const homeBusinessName =
    businesses.find((b) => b.id === homeBusinessId)?.name ?? "their home location";

  return (
    <div className="grid gap-4">
      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-neutral-600">
        {employee.firstName} stays one employee record across every location selected here,
        so their availability, contracted hours and pay follow them. Changes save
        immediately.
      </p>

      {isBorrowed && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {employee.firstName} is based at {homeBusinessName}. Location changes apply
            there too.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading locations…
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-md">
          {businesses.map((business) => {
            const isHome = business.id === homeBusinessId;
            const isAssigned = isHome || assignedIds.has(business.id);
            const isBusy = busyId === business.id;

            return (
              <label
                key={business.id}
                className={`flex items-center gap-3 px-3 py-3 ${
                  isHome ? "cursor-default" : "cursor-pointer hover:bg-neutral-50"
                }`}
              >
                <Checkbox
                  checked={isAssigned}
                  // The home location is where the record lives, so it cannot
                  // be unassigned - moving someone is a different operation.
                  disabled={isHome || isBusy}
                  onCheckedChange={(checked) =>
                    handleToggle(business.id, checked === true)
                  }
                />
                <span className="flex-1 text-sm text-neutral-900">{business.name}</span>
                {isBusy && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}
                {isHome && (
                  <Badge className="bg-neutral-100 border-neutral-300 text-neutral-600">
                    Home
                  </Badge>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
