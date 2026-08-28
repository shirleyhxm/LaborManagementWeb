import { Badge } from "./ui/badge";
import { useBusiness } from "../contexts/BusinessContext";
import type { Employee } from "../types/employee";

interface EmployeeLocationBadgesProps {
  employee: Employee;
  /** Ids of the other locations this employee is assigned to, if known. */
  assignedBusinessIds?: string[];
}

/**
 * Read-only summary of where an employee works, so the roster can be scanned
 * without opening anything. Editing happens in the Locations tab of the edit
 * dialog.
 *
 * Renders nothing for an account with a single location, where "works at
 * Demo Business" is noise on every card.
 */
export function EmployeeLocationBadges({
  employee,
  assignedBusinessIds,
}: EmployeeLocationBadgesProps) {
  const { businesses, currentBusiness } = useBusiness();

  if (businesses.length < 2) return null;

  const isBorrowed = !!currentBusiness && employee.businessId !== currentBusiness.id;
  const homeName = businesses.find((b) => b.id === employee.businessId)?.name;

  // On a borrowed record the useful fact is where they're based, not the full
  // list - this location is already implied by looking at it.
  if (isBorrowed) {
    return (
      <Badge className="bg-blue-50 border-blue-300 text-blue-700">
        Home: {homeName ?? "another location"}
      </Badge>
    );
  }

  const others = (assignedBusinessIds ?? [])
    .filter((id) => id !== employee.businessId)
    .map((id) => businesses.find((b) => b.id === id)?.name)
    .filter((name): name is string => !!name);

  if (others.length === 0) return null;

  return (
    <>
      {others.map((name) => (
        <Badge key={name} className="bg-neutral-100 border-neutral-300 text-neutral-600">
          Also at {name}
        </Badge>
      ))}
    </>
  );
}
