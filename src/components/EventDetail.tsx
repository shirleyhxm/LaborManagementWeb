import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CalendarClock, Pencil, Sparkles, Trash2, Users } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";

interface EventDetailProps {
  event: SpecialEvent;
  onEdit: () => void;
  onDelete: () => void;
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
 * What a special event is set up to do, before any schedule has been generated from it.
 *
 * Generation lands in a later step. Until then this is deliberately explicit that no
 * schedule exists yet rather than showing an empty grid, which is indistinguishable from a
 * generation that produced nothing.
 */
export function EventDetail({ event, onEdit, onDelete }: EventDetailProps) {
  const totalRequired = event.requirements.reduce((sum, r) => sum + r.count, 0);
  // Deleting an event throws away a definition a manager built by hand and cannot be
  // undone, so it asks first - unlike the reversible edits elsewhere on this page.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
        <CalendarClock className="w-4 h-4 text-blue-700 shrink-0" />
        <p className="text-sm text-blue-700">
          No schedule has been generated for this event yet.
        </p>
      </div>

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
