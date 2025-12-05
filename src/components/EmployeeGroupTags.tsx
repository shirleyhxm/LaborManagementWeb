import { useState } from "react";
import { Badge } from "./ui/badge";
import { Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useEmployeeGroups } from "../hooks/useEmployeeGroups";
import { employeeGroupService } from "../services/employeeGroupService";
import { employeeService } from "../services/employeeService";
import type { Employee } from "../types/employee";

interface EmployeeGroupTagsProps {
  employee: Employee;
  onUpdate: () => void;
}

export function EmployeeGroupTags({ employee, onUpdate }: EmployeeGroupTagsProps) {
  const { groups, refetch } = useEmployeeGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const employeeGroups = employee.groups || [];

  const handleToggleGroup = async (groupName: string) => {
    setIsUpdating(true);
    try {
      const newGroups = employeeGroups.includes(groupName)
        ? employeeGroups.filter((g) => g !== groupName)
        : [...employeeGroups, groupName];

      await employeeService.updateEmployee(employee.id, {
        groups: newGroups,
      });
      await onUpdate();
    } catch (err) {
      console.error("Failed to update employee groups:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveGroup = async (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      const newGroups = employeeGroups.filter((g) => g !== groupName);
      await employeeService.updateEmployee(employee.id, {
        groups: newGroups,
      });
      await onUpdate();
    } catch (err) {
      console.error("Failed to remove group:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateGroup = async () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      await employeeGroupService.createGroup({ name: trimmedName });
      await refetch();

      // Add the new group to the employee
      const newGroups = [...employeeGroups, trimmedName];
      await employeeService.updateEmployee(employee.id, {
        groups: newGroups,
      });
      await onUpdate();

      setNewGroupName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateGroup();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {employeeGroups.map((group) => (
        <Badge
          key={group}
          variant="outline"
          className="text-xs bg-neutral-50 border-neutral-300 text-neutral-700 pr-1"
        >
          {group}
          <button
            type="button"
            onClick={(e) => handleRemoveGroup(group, e)}
            disabled={isUpdating}
            className="ml-1 hover:bg-neutral-200 rounded-full p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-colors"
            disabled={isUpdating}
          >
            <Plus className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3 text-sm">Assign to Groups</h4>
              <div className="space-y-2 max-h-48" style={{ overflow: "auto" }}>
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <div
                      key={group.name}
                      className="flex items-center space-x-2 p-2 hover:bg-neutral-50 rounded"
                    >
                      <Checkbox
                        id={`inline-group-${employee.id}-${group.name}`}
                        checked={employeeGroups.includes(group.name)}
                        onCheckedChange={() => handleToggleGroup(group.name)}
                        disabled={isUpdating}
                      />
                      <Label
                        htmlFor={`inline-group-${employee.id}-${group.name}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {group.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">No groups available</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm">Create New Group</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isCreating || isUpdating}
                  className="text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || isCreating || isUpdating}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {createError && (
                <p className="text-sm text-red-600 mt-2">{createError}</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}