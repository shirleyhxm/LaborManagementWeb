import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Info, Loader2, Plus, RotateCcw, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useEmployeeGroups } from "../hooks/useEmployeeGroups";
import { constraintsService } from "../services/constraintsService";
import { useBusiness } from "../contexts/BusinessContext";
import type { WorkingHoursRules, ComplianceRules } from "../types/constraints";
import { DEFAULT_WORKING_HOURS_RULES } from "../utils/constraintDefaults";
import type {
  EventRuleOverrides,
  EventStaffingRequirement,
  SpecialEvent,
  SpecialEventRequest,
} from "../types/specialEvent";
import type { OptimizationObjective } from "../types/scheduling";

/** Matches ConstraintsEditor's tooltip, so the two panels read as one product. */
function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** A requirement row while it is being edited, before it becomes a wire payload. */
interface RequirementDraft {
  groupName: string;
  count: string;
  payMode: "none" | "rate" | "uplift";
  payValue: string;
}

interface SpecialEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The event being edited, or null to create a new one. */
  event: SpecialEvent | null;
  /** Prefills the date when creating — normally the day the manager clicked from. */
  defaultDate?: string;
  onSubmit: (request: SpecialEventRequest) => Promise<void>;
}

const OBJECTIVES: { value: OptimizationObjective; label: string }[] = [
  { value: "BALANCED", label: "Balanced Approach" },
  { value: "MAXIMIZE_SALES", label: "Maximize Sales Coverage" },
  { value: "MINIMIZE_LABOR_COST", label: "Minimize Labor Cost" },
  { value: "MAXIMIZE_FAIRNESS", label: "Maximize Fairness" },
];

/** Hours between two "HH:mm" times, reading an end at or before the start as overnight. */
function windowHours(start: string, end: string): number | null {
  const parse = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null) return null;
  const minutes = e > s ? e - s : 24 * 60 - s + e;
  return minutes / 60;
}

export function SpecialEventForm({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSubmit,
}: SpecialEventFormProps) {
  const { currentBusiness } = useBusiness();
  const { groups, loading: groupsLoading } = useEmployeeGroups();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("02:00");
  const [notes, setNotes] = useState("");
  const [objective, setObjective] = useState<OptimizationObjective>("BALANCED");
  const [requirements, setRequirements] = useState<RequirementDraft[]>([]);
  const [overrides, setOverrides] = useState<EventRuleOverrides>({});
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The business rules an event inherits. Shown as placeholders so an untouched field
  // stays null rather than freezing today's value into the event.
  const [workingHours, setWorkingHours] = useState<WorkingHoursRules | null>(null);
  const [compliance, setCompliance] = useState<ComplianceRules | null>(null);

  useEffect(() => {
    if (!open || !currentBusiness) return;
    constraintsService
      .getAllConstraints(currentBusiness.id)
      .then((all) => {
        // A business that has saved no rules gets the same fallback the Rules page shows,
        // so the value an event says it inherits matches the page that owns the setting.
        setWorkingHours(
          all.workingHours ?? { ...DEFAULT_WORKING_HOURS_RULES, updatedAt: new Date().toISOString() }
        );
        setCompliance(all.compliance);
      })
      .catch(() => {
        // Non-fatal: the panel simply shows no inherited values to compare against.
        setWorkingHours(null);
        setCompliance(null);
      });
  }, [open, currentBusiness?.id]);

  // Reset the form whenever it opens, so a previous edit never bleeds into the next one.
  useEffect(() => {
    if (!open) return;

    if (event) {
      setName(event.name);
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime);
      setNotes(event.notes ?? "");
      setObjective(event.objective);
      setRequirements(
        event.requirements.map((r) => ({
          groupName: r.groupName,
          count: String(r.count),
          payMode: r.payRate != null ? "rate" : r.payUplift != null ? "uplift" : "none",
          payValue: r.payRate != null ? String(r.payRate) : r.payUplift != null ? String(r.payUplift) : "",
        }))
      );
      setOverrides(event.ruleOverrides ?? {});
      setRulesExpanded(Boolean(event.ruleOverrides && Object.values(event.ruleOverrides).some((v) => v != null)));
    } else {
      setName("");
      setDate(defaultDate ?? "");
      setStartTime("21:00");
      setEndTime("02:00");
      setNotes("");
      setObjective("BALANCED");
      setRequirements([]);
      setOverrides({});
      setRulesExpanded(false);
    }
    setSubmitError(null);
  }, [open, event, defaultDate]);

  const eventHours = windowHours(startTime, endTime);
  const crossesMidnight = eventHours !== null && endTime <= startTime;

  const overrideCount = Object.values(overrides).filter((v) => v != null).length;

  /**
   * Problems worth flagging before generation rather than after.
   *
   * A minimum shift longer than the event itself is unsatisfiable, and left to generation
   * it surfaces as an empty grid with nothing to explain it.
   */
  const warnings = useMemo(() => {
    const found: string[] = [];
    const effectiveMin = overrides.minShiftLength ?? workingHours?.minShiftLength;
    if (eventHours !== null && effectiveMin != null && effectiveMin > eventHours) {
      found.push(
        `Minimum shift length (${effectiveMin}h) is longer than the event (${eventHours}h), so nobody can be scheduled.`
      );
    }
    const duplicates = requirements
      .map((r) => r.groupName.toLowerCase())
      .filter((g, i, all) => g && all.indexOf(g) !== i);
    if (duplicates.length > 0) {
      found.push(`Each group can only be asked for once.`);
    }
    return found;
  }, [overrides.minShiftLength, workingHours?.minShiftLength, eventHours, requirements]);

  const canSubmit =
    name.trim().length > 0 &&
    date.length > 0 &&
    startTime !== endTime &&
    requirements.every((r) => r.groupName && Number(r.count) > 0) &&
    warnings.length === 0 &&
    !submitting;

  /**
   * Bounds for each overridable rule, enforced on the input as well as by clamping.
   *
   * `scale` is what the stored value is multiplied by to get the number shown. Coverage is
   * held as a 0-1 fraction because that is what the solver takes, but a manager thinks in
   * percent - so it is shown as one and converted on the way in and out. Without that,
   * typing "100" to mean full coverage would ask for a hundred times the demand.
   */
  const OVERRIDE_BOUNDS: Record<keyof EventRuleOverrides, { min: number; max?: number; scale: number; step: number }> = {
    // A shift is bounded by the day it sits in, so hours cannot reach 24.
    minShiftLength: { min: 0, max: 23, scale: 1, step: 1 },
    maxShiftLength: { min: 0, max: 23, scale: 1, step: 1 },
    // Floor of 1 rather than 0: the backend requires a positive fraction, and staffing for
    // none of the demand is a way of saying the event should not run at all.
    coverageFraction: { min: 1, max: 100, scale: 100, step: 1 },
    // No ceiling: what an event can cost is the manager's call, not ours.
    laborCostBudget: { min: 0, scale: 1, step: 50 },
  };

  const setOverride = (key: keyof EventRuleOverrides, raw: string) => {
    // An emptied field returns to inheriting rather than becoming zero.
    if (raw.trim() === "") {
      setOverrides((prev) => ({ ...prev, [key]: null }));
      return;
    }

    const entered = Number(raw);
    if (Number.isNaN(entered)) return;

    // Clamped as well as bounded on the input: min/max stop the steppers going out of
    // range but do nothing about a value typed or pasted straight in.
    const { min, max, scale } = OVERRIDE_BOUNDS[key];
    const bounded = Math.min(Math.max(entered, min), max ?? Number.POSITIVE_INFINITY);
    setOverrides((prev) => ({ ...prev, [key]: bounded / scale }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        name: name.trim(),
        date,
        startTime,
        endTime,
        notes: notes.trim() || null,
        objective,
        requirements: requirements.map<EventStaffingRequirement>((r) => ({
          groupName: r.groupName,
          count: Number(r.count),
          payRate: r.payMode === "rate" && r.payValue !== "" ? Number(r.payValue) : null,
          payUplift: r.payMode === "uplift" && r.payValue !== "" ? Number(r.payValue) : null,
        })),
        // Only send overrides that carry a value, so the rest stay inherited.
        ruleOverrides: overrideCount > 0 ? overrides : null,
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save the event");
    } finally {
      setSubmitting(false);
    }
  };

  /** A rules row whose value falls back to the business's own when left empty. */
  const overrideRow = (
    key: keyof EventRuleOverrides,
    label: string,
    tooltip: string,
    inherited: number | undefined,
    unit: string
  ) => {
    const stored = overrides[key];
    const isOverridden = stored != null;
    const { min, max, scale, step } = OVERRIDE_BOUNDS[key];
    // Shown in the manager's units, which for coverage is percent rather than a fraction.
    const value = isOverridden ? stored * scale : "";
    return (
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-lg ${
          isOverridden ? "border-blue-300 border-l-4 bg-blue-50" : "border-neutral-200"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Label className="text-sm font-normal">{label}</Label>
          <InfoTooltip text={tooltip} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            placeholder={inherited != null ? String(inherited) : "—"}
            onChange={(e) => setOverride(key, e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-neutral-500 w-12">{unit}</span>
          {isOverridden ? (
            <button
              type="button"
              onClick={() => setOverrides((prev) => ({ ...prev, [key]: null }))}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label={`Reset ${label} to the business default`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="w-3.5" />
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]" style={{ overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basics */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="event-name" className="text-xs text-neutral-500">Event Name</Label>
              <Input
                id="event-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Year's Eve Party"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-date" className="text-xs text-neutral-500">Date</Label>
                <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-start" className="text-xs text-neutral-500">Start</Label>
                <Input id="event-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-end" className="text-xs text-neutral-500">End</Label>
                <Input id="event-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            {eventHours !== null && (
              <p className="text-xs text-neutral-500">
                {eventHours}h event
                {crossesMidnight && " — runs past midnight into the next day"}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="event-objective" className="text-xs text-neutral-500">Scheduling Objective</Label>
              <Select value={objective} onValueChange={(v) => setObjective(v as OptimizationObjective)}>
                <SelectTrigger id="event-objective">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="event-notes" className="text-xs text-neutral-500">Notes (optional)</Label>
              <Textarea id="event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Staffing requirements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-neutral-900">Staffing</h3>
                <InfoTooltip text="How many people from each group this event needs, and what they're paid for it. Groups come from your employee groups." />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={groupsLoading || groups.length === 0}
                onClick={() =>
                  setRequirements((prev) => [...prev, { groupName: "", count: "1", payMode: "none", payValue: "" }])
                }
              >
                <Plus className="w-3.5 h-3.5" />Add group
              </Button>
            </div>

            {groups.length === 0 && !groupsLoading && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This business has no employee groups yet. Add groups on the Employees page to
                staff an event by role.
              </p>
            )}

            {requirements.length === 0 && groups.length > 0 && (
              <p className="text-xs text-neutral-500">
                No group requirements. The event will be staffed from demand alone.
              </p>
            )}

            {requirements.map((requirement, index) => (
              <div key={index} className="flex items-end gap-2 px-3 py-2 border border-neutral-200 rounded-lg">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <Label className="text-xs text-neutral-500">Group</Label>
                  <Select
                    value={requirement.groupName}
                    onValueChange={(v) =>
                      setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, groupName: v } : r)))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 w-20">
                  <Label className="text-xs text-neutral-500">Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={requirement.count}
                    onChange={(e) =>
                      setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, count: e.target.value } : r)))
                    }
                  />
                </div>

                <div className="flex flex-col gap-1 w-32">
                  <Label className="text-xs text-neutral-500">Pay</Label>
                  <Select
                    value={requirement.payMode}
                    onValueChange={(v) =>
                      setRequirements((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, payMode: v as RequirementDraft["payMode"], payValue: "" } : r
                        )
                      )
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Usual rate</SelectItem>
                      <SelectItem value="rate">Set rate</SelectItem>
                      <SelectItem value="uplift">Add per hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {requirement.payMode !== "none" && (
                  <div className="flex flex-col gap-1 w-24">
                    <Label className="text-xs text-neutral-500">
                      {requirement.payMode === "rate" ? "Rate" : "Uplift"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={requirement.payValue}
                      onChange={(e) =>
                        setRequirements((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, payValue: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setRequirements((prev) => prev.filter((_, i) => i !== index))}
                  className="text-neutral-400 hover:text-red-600 pb-2"
                  aria-label="Remove this group requirement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Rule overrides, collapsed until wanted */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setRulesExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-900"
            >
              {rulesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Rules for this event
              <span className="text-xs font-normal text-neutral-500">
                {overrideCount === 0 ? "Using business defaults" : `${overrideCount} override${overrideCount > 1 ? "s" : ""}`}
              </span>
            </button>

            {rulesExpanded && (
              <div className="space-y-3 pl-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Overridable</p>
                  {overrideCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setOverrides({})}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Reset all to business defaults
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {overrideRow("minShiftLength", "Min shift length", "The shortest shift this event may create. Leave empty to use the business rule.", workingHours?.minShiftLength, "hours")}
                  {overrideRow("maxShiftLength", "Max shift length", "The longest shift this event may create. Leave empty to use the business rule.", workingHours?.maxShiftLength, "hours")}
                  {overrideRow("coverageFraction", "Coverage target", "How much of the projected demand to staff for. Events often want all of it — enter 100 for full coverage.", undefined, "%")}
                  {overrideRow("laborCostBudget", "Labor cost budget", "A wage cap for this event alone. Worth setting when the business runs a hard budget, since a weekly cap pro-rated down to a few hours is far below what staffing an event costs.", undefined, "total")}
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Always enforced</p>
                  <div className="px-3 py-2.5 border border-neutral-200 rounded-lg space-y-1.5 bg-neutral-50">
                    <p className="text-xs text-neutral-600">
                      These come from your business rules and statutory limits, and cannot be
                      changed for a single event.
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2 text-xs text-neutral-700 pt-1">
                      <span>Max hours per week: <strong>{workingHours?.maxHoursPerWeek ?? "—"}h</strong></span>
                      <span>Min rest between shifts: <strong>{workingHours?.minRestBetweenShifts ?? "—"}h</strong></span>
                      <span>Max consecutive days: <strong>{workingHours?.maxConsecutiveDays ?? "—"}</strong></span>
                      <span>Weekly rest: <strong>{workingHours?.minWeeklyRestHours ?? "—"}h</strong></span>
                      <span>
                        Rest breaks:{" "}
                        <strong>
                          {compliance?.mealBreakRequired
                            ? `Required over ${compliance.mealBreakMinShiftHours}h`
                            : "Not required"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="flex gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {warnings.map((w) => (
                  <p key={w} className="text-xs text-amber-700">{w}</p>
                ))}
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {event ? "Save Changes" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
