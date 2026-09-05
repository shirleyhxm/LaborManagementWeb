import { useState, useEffect, useCallback } from "react";
import { specialEventService } from "../services/specialEventService";
import type { SpecialEvent, SpecialEventRequest } from "../types/specialEvent";
import { ApiError } from "../services/api";
import { useBusiness } from "../contexts/BusinessContext";

/** Format a Date as YYYY-MM-DD in local time, avoiding the UTC shift toISOString applies. */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The business's special events, optionally narrowed to a week.
 *
 * Pass a range to get just that week's events - what Schedule View wants, since events are
 * only surfaced on the week they fall in. Omit it for the full list.
 */
export function useSpecialEvents(range?: { startDate: Date; endDate: Date } | null) {
  const { currentBusiness } = useBusiness();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Compared as strings rather than Date objects: WeekContext hands back a fresh pair of
  // Dates on every render, so depending on the objects themselves would refetch endlessly.
  const startKey = range ? toISODate(range.startDate) : null;
  const endKey = range ? toISODate(range.endDate) : null;

  const fetchEvents = useCallback(async () => {
    if (!currentBusiness) {
      setLoading(false);
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await specialEventService.getEvents(
        currentBusiness.id,
        startKey ?? undefined,
        endKey ?? undefined
      );
      setEvents(data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to fetch events", 500));
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, startKey, endKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(
    async (request: SpecialEventRequest) => {
      if (!currentBusiness) throw new Error("No business selected");
      const created = await specialEventService.createEvent(currentBusiness.id, request);
      await fetchEvents();
      return created;
    },
    [currentBusiness?.id, fetchEvents]
  );

  const updateEvent = useCallback(
    async (id: string, request: SpecialEventRequest) => {
      if (!currentBusiness) throw new Error("No business selected");
      const updated = await specialEventService.updateEvent(currentBusiness.id, id, request);
      await fetchEvents();
      return updated;
    },
    [currentBusiness?.id, fetchEvents]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!currentBusiness) throw new Error("No business selected");
      await specialEventService.deleteEvent(currentBusiness.id, id);
      await fetchEvents();
    },
    [currentBusiness?.id, fetchEvents]
  );

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
