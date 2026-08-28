import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { useBusiness } from "../contexts/BusinessContext";
import type { Employee } from "../types/employee";

interface EmployeeLocationsTabProps {
  employee: Employee;
  /** Other locations currently ticked, excluding the home location. */
  selectedBusinessIds: string[];
  onChange: (businessIds: string[]) => void;
  isLoading: boolean;
  loadError: string | null;
}

/**
 * Which of the account's locations an employee works at.
 *
 * Assignment rather than an action: the set of locations is a property of the
 * employee, edited alongside their availability because "works at both cafes,
 * weekends only" is one decision, not two.
 *
 * Controlled by EmployeeManager so these toggles are pending edits like every
 * other field in the dialog - they apply on Save Changes and vanish on Cancel.
 */
export function EmployeeLocationsTab({
  employee,
  selectedBusinessIds,
  onChange,
  isLoading,
  loadError,
}: EmployeeLocationsTabProps) {
  const { businesses, currentBusiness } = useBusiness();

  const homeBusinessId = employee.businessId;
  const isBorrowed = currentBusiness ? homeBusinessId !== currentBusiness.id : false;
  const homeBusinessName =
    businesses.find((b) => b.id === homeBusinessId)?.name ?? "their home location";

  const handleToggle = (businessId: string, nextChecked: boolean) => {
    onChange(
      nextChecked
        ? [...selectedBusinessIds, businessId]
        : selectedBusinessIds.filter((id) => id !== businessId)
    );
  };

  return (
    <div className="grid gap-4">
      {loadError && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">{loadError}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-neutral-600">
        {employee.firstName} stays one employee record across every location selected here,
        so their availability, contracted hours and pay follow them.
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
        <>
          <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-md">
            {businesses.map((business) => {
              const isHome = business.id === homeBusinessId;
              const isChecked = isHome || selectedBusinessIds.includes(business.id);

              return (
                <label
                  key={business.id}
                  className={`flex items-center gap-3 px-3 py-3 ${
                    isHome ? "cursor-default" : "cursor-pointer hover:bg-neutral-50"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    // The home location is where the record lives, so it cannot
                    // be unassigned - moving someone is a different operation.
                    disabled={isHome}
                    onCheckedChange={(checked) => handleToggle(business.id, checked === true)}
                  />
                  <span className="flex-1 text-sm text-neutral-900">{business.name}</span>
                  {isHome && (
                    <Badge className="bg-neutral-100 border-neutral-300 text-neutral-600">
                      Home
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>

          <p className="text-xs text-neutral-500">
            Location changes apply when you save.
          </p>
        </>
      )}
    </div>
  );
}
