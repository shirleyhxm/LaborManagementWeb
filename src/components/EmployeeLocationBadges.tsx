import { MapPin } from "lucide-react";
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
      <span className="inline-flex items-center gap-1 text-sm text-blue-700">
        <MapPin className="w-3 h-3" style={{ flexShrink: 0 }} />
        Based at {homeName ?? "another location"}
      </span>
    );
  }

  const others = (assignedBusinessIds ?? [])
    .filter((id) => id !== employee.businessId)
    .map((id) => businesses.find((b) => b.id === id)?.name)
    .filter((name): name is string => !!name);

  if (others.length === 0) return null;

  // Where someone works is a fact about the record rather than a label applied
  // to them, so it reads as text with a location icon instead of a tag - which
  // also stops it competing with the group tags for the same row.
  return (
    <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
      <MapPin className="w-3 h-3" style={{ flexShrink: 0 }} />
      Also works at {others.join(", ")}
    </span>
  );
}
