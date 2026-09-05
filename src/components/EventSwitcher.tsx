import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Calendar, Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";

/**
 * Above this many events the pills would wrap and stop being scannable, so the switcher
 * collapses into a dropdown. Kept as one constant because both render paths below branch on
 * it, and a second copy would eventually disagree with this one.
 */
const MAX_PILLS = 3;

interface EventSwitcherProps {
  events: SpecialEvent[];
  /** The event currently being viewed, or null when viewing the weekly schedule. */
  selectedEventId: string | null;
  onSelect: (eventId: string | null) => void;
  onCreate: () => void;
  onShowAll: () => void;
}

/**
 * Creating an event, offered on its own where there is no switcher to sit beside.
 *
 * Exported so Schedule View can put it among the header's other actions on a week with no
 * events - a row holding nothing but this one button reads as a stray strip above the page
 * rather than as part of it.
 */
export function CreateEventButton({ onCreate }: { onCreate: () => void }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreate}>
      <Plus className="w-3.5 h-3.5" />Event
    </Button>
  );
}

/** "Dec 31, 21:00" — enough to tell two events on one week apart at a glance. */
function eventLabel(event: SpecialEvent): string {
  const [, month, day] = event.date.split("-");
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][Number(month) - 1];
  return `${monthName} ${Number(day)}, ${event.startTime}`;
}

/**
 * Switches Schedule View between the week's regular schedule and any events falling in it.
 *
 * Renders nothing but the create action when the week has no events, so a business that
 * never runs them sees the page exactly as it was.
 */
export function EventSwitcher({
  events,
  selectedEventId,
  onSelect,
  onCreate,
  onShowAll,
}: EventSwitcherProps) {
  const selected = events.find((e) => e.id === selectedEventId) ?? null;

  const createButton = <CreateEventButton onCreate={onCreate} />;

  // Nothing to switch between. Creating an event is still offered, but from the header's
  // action row via CreateEventButton, so the page keeps the shape it has always had.
  if (events.length === 0) return null;

  if (events.length <= MAX_PILLS) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedEventId === null
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Weekly
          </button>
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              title={eventLabel(event)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                selectedEventId === event.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="max-w-40 truncate">{event.name}</span>
            </button>
          ))}
        </div>
        {createButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        {/* A native button, not the shared Button: DropdownMenuTrigger's asChild needs to
            attach a ref, and Button is a plain function component with no forwardRef, so
            the trigger silently never wires up and the menu cannot be opened at all.
            Styled to match Button's outline/sm variant. */}
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            {selected ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="max-w-40 truncate">{selected.name}</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />Weekly Schedule
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => onSelect(null)}>
            <Calendar className="w-3.5 h-3.5" />
            <span className="flex-1">Weekly Schedule</span>
            {selectedEventId === null && <Check className="w-3.5 h-3.5" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {events.map((event) => (
            <DropdownMenuItem key={event.id} onClick={() => onSelect(event.id)}>
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="flex-1 truncate">{event.name}</span>
              <span className="text-xs text-neutral-500">{eventLabel(event)}</span>
              {selectedEventId === event.id && <Check className="w-3.5 h-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onShowAll}>All events…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {createButton}
    </div>
  );
}
