import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { CalendarClock, Pencil, Sparkles, Users } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";

interface EventDetailProps {
  event: SpecialEvent;
  onEdit: () => void;
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
export function EventDetail({ event, onEdit }: EventDetailProps) {
  const totalRequired = event.requirements.reduce((sum, r) => sum + r.count, 0);

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
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />Edit
            </Button>
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
    </div>
  );
}
