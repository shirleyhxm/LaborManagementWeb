import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, CalendarClock, Loader2, Pencil, Sparkles, Trash2, Users } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";
import type { Schedule } from "../types/scheduling";

interface EventDetailProps {
  event: SpecialEvent;
  onEdit: () => void;
  onDelete: () => void;
  /** Builds (or rebuilds) the event's schedule. Rejects with a message worth showing. */
  onGenerate: () => Promise<void>;
  generating: boolean;
  /** The schedule already generated, if there is one. */
  schedule: Schedule | null;
  /** When generation last finished, so a re-run that changes nothing still shows it ran. */
  lastGeneratedAt: number | null;
  /** Rendered below the card once a schedule exists — the ordinary schedule grid. */
  children?: React.ReactNode;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * What a special event is set up to do, and the schedule built from it.
 *
 * The definition stays visible above the schedule rather than being replaced by it: when a
 * result looks wrong, what the event actually asked for is the first thing worth checking.
 *
 * The three states are kept distinct on purpose - not generated, generated but empty, and
 * generated with shifts. An empty grid means the same thing as a broken constraint to anyone
 * looking at it, so a generation that produced nothing says so and suggests why.
 */
export function EventDetail({
  event,
  onEdit,
  onDelete,
  onGenerate,
  generating,
  schedule,
  lastGeneratedAt,
  children,
}: EventDetailProps) {
  const totalRequired = event.requirements.reduce((sum, r) => sum + r.count, 0);
  // Deleting an event throws away a definition a manager built by hand and cannot be
  // undone, so it asks first - unlike the reversible edits elsewhere on this page.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Regenerating is likewise irreversible: it discards the existing schedule along with any
  // shifts moved by hand on it.
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const runGenerate = async () => {
    setGenerateError(null);
    try {
      await onGenerate();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Could not generate the schedule");
    }
  };

  // A schedule that came back with nothing in it. The solver does this legitimately - most
  // often when nobody is available in the event's window - and showing an empty grid for it
  // would look exactly like a broken constraint, so say what happened instead.
  const generatedNothing = schedule != null && schedule.shifts.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-purple-600" />
                {event.name}
              </CardTitle>
              <p className="text-sm text-neutral-600">
                {formatDate(event.date)} · {event.startTime}–{event.endTime}
                {event.crossesMidnight && (
                  <span className="text-neutral-500"> (ends next day)</span>
                )}
              </p>
              {event.notes && <p className="text-sm text-neutral-500">{event.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Staffing</p>
              {event.requirements.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No group requirements — staffed from demand alone.
                </p>
              ) : (
                <div className="space-y-1">
                  {event.requirements.map((requirement) => (
                    <div
                      key={requirement.groupName}
                      className="flex items-center justify-between px-3 py-1.5 border border-neutral-200 rounded-lg"
                    >
                      <span className="text-sm text-neutral-700">
                        {requirement.count} × {requirement.groupName}
                      </span>
                      {requirement.payRate != null && (
                        <span className="text-xs text-purple-700">Rate {requirement.payRate}</span>
                      )}
                      {requirement.payUplift != null && (
                        <span className="text-xs text-purple-700">+{requirement.payUplift}/hr</span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-neutral-500 pt-1">
                    <Users className="w-3 h-3 inline mr-1" />
                    {totalRequired} people required
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Rules</p>
              {event.ruleOverrides &&
              Object.values(event.ruleOverrides).some((v) => v != null) ? (
                <div className="space-y-1 text-sm text-neutral-700">
                  {event.ruleOverrides.minShiftLength != null && (
                    <p>Min shift length: {event.ruleOverrides.minShiftLength}h</p>
                  )}
                  {event.ruleOverrides.maxShiftLength != null && (
                    <p>Max shift length: {event.ruleOverrides.maxShiftLength}h</p>
                  )}
                  {event.ruleOverrides.coverageFraction != null && (
                    <p>Coverage target: {Math.round(event.ruleOverrides.coverageFraction * 100)}%</p>
                  )}
                  {event.ruleOverrides.laborCostBudget != null && (
                    <p>Labor budget: {event.ruleOverrides.laborCostBudget}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Using business defaults.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {generateError && (
        <div className="flex gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{generateError}</p>
        </div>
      )}

      {schedule == null ? (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CalendarClock className="w-4 h-4 text-blue-700 shrink-0" />
          <p className="text-sm text-blue-700 flex-1">
            No schedule has been generated for this event yet.
          </p>
          <Button className="gap-2" onClick={runGenerate} disabled={generating}>
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate Schedule</>
            )}
          </Button>
        </div>
      ) : generatedNothing ? (
        <div className="flex gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-amber-800">
              Nobody could be scheduled for this event.
            </p>
            {/* Two quite different causes look identical from here, and the more common one
                is the less obvious: with no expected revenue an event inherits the business
                forecast, which for an evening event usually covers none of its hours - so
                every slot reads as having no demand and the solver rightly staffs nobody.
                Named first, because "check availability" sends people hunting in the wrong
                place entirely. */}
            {!event.expectedRevenue || Object.keys(event.expectedRevenue).length === 0 ? (
              <p className="text-sm text-amber-700">
                This event has no expected revenue set, so it falls back to your business
                forecast — which may not cover {event.startTime}–{event.endTime}. Add
                expected revenue for those hours in the event, or check that everyone in the
                pool is available then.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                Nobody in the event's pool is available for all of {event.startTime}–
                {event.endTime}
                {event.crossesMidnight && " the next morning"}. Extend their availability on
                the Employees page, shorten the event, or lower its minimum shift length.
              </p>
            )}
            {/* Re-running against unchanged availability produces the same empty result, so
                say the attempt happened - otherwise the button reads as broken. */}
            {lastGeneratedAt != null && (
              <p className="text-xs text-amber-600 pt-1">
                Last attempted at {new Date(lastGeneratedAt).toLocaleTimeString()} — the
                result is unchanged. Try Again only helps once something above has changed.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={runGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setConfirmingRegenerate(true)}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Regenerate
            </Button>
          </div>
          {children}
        </>
      )}

      {confirmingRegenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regenerate this schedule?</h3>
            <p className="text-gray-600 mb-6">
              The current schedule is replaced, including any shifts you have moved by hand.
              It will also pick up any changes made to your business rules since it was last
              generated. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmingRegenerate(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setConfirmingRegenerate(false);
                  runGenerate();
                }}
              >
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete “{event.name}”?
            </h3>
            <p className="text-gray-600 mb-6">
              This removes the event and everything set up for it — its hours, staffing and
              any rule overrides. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
              >
                Delete Event
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
