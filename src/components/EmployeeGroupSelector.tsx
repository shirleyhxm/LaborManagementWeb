import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, X, Tags } from "lucide-react";
import { useEmployeeGroups } from "../hooks/useEmployeeGroups";
import { employeeGroupService } from "../services/employeeGroupService";

interface EmployeeGroupSelectorProps {
  selectedGroups: string[];
  onChange: (groups: string[]) => void;
  disabled?: boolean;
}

export function EmployeeGroupSelector({
  selectedGroups,
  onChange,
  disabled = false,
}: EmployeeGroupSelectorProps) {
  const { groups, refetch } = useEmployeeGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleToggleGroup = (groupName: string) => {
    if (selectedGroups.includes(groupName)) {
      onChange(selectedGroups.filter((g) => g !== groupName));
    } else {
      onChange([...selectedGroups, groupName]);
    }
  };

  const handleRemoveGroup = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedGroups.filter((g) => g !== groupName));
  };

  const handleCreateGroup = async () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      await employeeGroupService.createGroup({ name: trimmedName });
      await refetch();
      onChange([...selectedGroups, trimmedName]);
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
    <div className="space-y-2">
      <Label>Employee Groups</Label>
      <div className="flex flex-wrap gap-2">
        {selectedGroups.length > 0 ? (
          selectedGroups.map((groupName) => (
            <Badge
              key={groupName}
              variant="outline"
              className="bg-blue-50 border-blue-300 text-blue-700 pr-1"
            >
              {groupName}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveGroup(groupName, e)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-neutral-400">No groups assigned</span>
        )}
      </div>

      {!disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Tags className="w-4 h-4 mr-2" />
              Manage Groups
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Select Groups</h4>
                <div className="space-y-2 max-h-60" style={{ overflow: "auto" }}>
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <div
                        key={group.name}
                        className="flex items-center space-x-2 p-2 hover:bg-neutral-50 rounded"
                      >
                        <Checkbox
                          id={`group-${group.name}`}
                          checked={selectedGroups.includes(group.name)}
                          onCheckedChange={() => handleToggleGroup(group.name)}
                        />
                        <Label
                          htmlFor={`group-${group.name}`}
                          className="flex-1 cursor-pointer"
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
                <h4 className="font-medium mb-3">Create New Group</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isCreating}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || isCreating}
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
      )}
    </div>
  );
}