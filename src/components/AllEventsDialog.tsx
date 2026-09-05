import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useSpecialEvents } from "../hooks/useSpecialEvents";
import type { SpecialEvent } from "../types/specialEvent";

interface AllEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jumps the app to the week the chosen event falls in, then selects it. */
  onSelect: (event: SpecialEvent) => void;
  onEdit: (event: SpecialEvent) => void;
  onDelete: (event: SpecialEvent) => void;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Every event the business has, across all weeks.
 *
 * Schedule View only surfaces events falling in the selected week, which is right for
 * putting them where they are relevant but would otherwise hide one being planned for next
 * month. This is the way to find those, and picking one moves the app to its week.
 *
 * Deliberately fetched without a date range, unlike the week-scoped list behind the switcher.
 */
export function AllEventsDialog({ open, onOpenChange, onSelect, onEdit, onDelete }: AllEventsDialogProps) {
  const { events, loading } = useSpecialEvents(null);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  const row = (event: SpecialEvent) => (
    <div
      key={event.id}
      className="flex items-center gap-3 px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
    >
      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
      <button
        type="button"
        onClick={() => onSelect(event)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm font-medium text-neutral-900 truncate">{event.name}</p>
        <p className="text-xs text-neutral-500">
          {formatDate(event.date)} · {event.startTime}–{event.endTime}
          {event.crossesMidnight && " (next day)"}
          {event.scheduleId ? " · Scheduled" : " · Not yet generated"}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onEdit(event)}
        className="text-neutral-400 hover:text-neutral-700"
        aria-label={`Edit ${event.name}`}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(event)}
        className="text-neutral-400 hover:text-red-600"
        aria-label={`Delete ${event.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]" style={{ overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>All Events</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-neutral-500 py-6 text-center">
            No events yet. Create one from the schedule for the week it falls in.
          </p>
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Upcoming</p>
                <div className="space-y-2">{upcoming.map(row)}</div>
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Past</p>
                <div className="space-y-2">{past.map(row)}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
