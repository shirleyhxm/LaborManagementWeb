import { useState, useEffect, useCallback, useMemo } from 'react';
import { businessHoursService } from '../services/businessHoursService';
import { DAYS_OF_WEEK, intervalsOf } from '../types/businessHours';
import type {
  BusinessHours,
  BusinessHourOverride,
  BusinessDayHours,
  ResolvedHours,
} from '../types/businessHours';
import { ApiError } from '../services/api';
import { useBusiness } from '../contexts/BusinessContext';

/** "HH:mm" as a number of hours, so 09:30 sorts and measures as 9.5. */
export function parseHoursValue(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

/**
 * What the business is doing on a given date.
 *
 * `closed` is a real answer rather than a missing one - it means no shifts can exist that
 * day, which is different from a day nobody has scheduled yet. `label` and `isOverride`
 * carry why, so the schedule view can distinguish "closed for Christmas" from the silent
 * fact that the business never opens on Sundays.
 */
export interface DayStatus {
  closed: boolean;
  hours: ResolvedHours | null;
  label: string | null;
  isOverride: boolean;
}

/**
 * The business's opening hours, and the helpers that read them.
 *
 * Resolution lives here rather than at each call site so the editor, the trigger summary
 * and the schedule grid cannot disagree about when the business is open.
 *
 * Call this only from BusinessHoursProvider - it owns the state, and every consumer reads
 * the one copy through useBusinessHours(). Calling it directly gives that component a
 * private copy that no save anywhere else will update.
 */
export function useBusinessHoursState() {
  const { currentBusiness } = useBusiness();
  const [hours, setHours] = useState<BusinessHours | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchHours = useCallback(async () => {
    if (!currentBusiness) {
      setLoading(false);
      setHours(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await businessHoursService.getHours(currentBusiness.id);
      setHours(data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Failed to fetch business hours', 500));
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    fetchHours();
  }, [fetchHours]);

  const byDay = useMemo(() => {
    const map = new Map<string, BusinessDayHours>();
    hours?.week.forEach((d) => map.set(d.dayOfWeek, d));
    return map;
  }, [hours]);

  const byDate = useMemo(() => {
    const map = new Map<string, BusinessHourOverride>();
    hours?.overrides.forEach((o) => map.set(o.date, o));
    return map;
  }, [hours]);

  /**
   * What the business is doing on [date] - an override first, then the weekday.
   *
   * An unknown day (hours still loading) reports open with null hours, so the grid keeps
   * rendering on its own default window rather than flashing every day as closed.
   */
  const resolveDate = useCallback(
    (date: Date): DayStatus => {
      const iso = toIsoDate(date);
      const override = byDate.get(iso);
      if (override) {
        return {
          closed: override.isClosed,
          hours: override.isClosed
            ? null
            : {
                openTime: override.openTime,
                closeTime: override.closeTime,
                intervals: intervalsOf(override),
              },
          label: override.label ?? null,
          isOverride: true,
        };
      }

      const day = byDay.get(DAYS_OF_WEEK[(date.getDay() + 6) % 7]);
      if (!day) {
        return { closed: false, hours: null, label: null, isOverride: false };
      }

      return {
        closed: day.isClosed,
        hours: day.isClosed
          ? null
          : { openTime: day.openTime, closeTime: day.closeTime, intervals: intervalsOf(day) },
        label: null,
        isOverride: false,
      };
    },
    [byDay, byDate]
  );

  const updateWeek = useCallback(
    async (week: BusinessDayHours[]) => {
      if (!currentBusiness) return;
      const updated = await businessHoursService.updateWeek(currentBusiness.id, { week });
      setHours(updated);
      return updated;
    },
    [currentBusiness?.id]
  );

  const saveOverride = useCallback(
    async (override: BusinessHourOverride) => {
      if (!currentBusiness) return;
      const updated = await businessHoursService.saveOverride(currentBusiness.id, override);
      setHours(updated);
      return updated;
    },
    [currentBusiness?.id]
  );

  const deleteOverride = useCallback(
    async (overrideId: string) => {
      if (!currentBusiness) return;
      const updated = await businessHoursService.deleteOverride(currentBusiness.id, overrideId);
      setHours(updated);
      return updated;
    },
    [currentBusiness?.id]
  );

  return {
    hours,
    week: hours?.week ?? [],
    overrides: hours?.overrides ?? [],
    loading,
    error,
    resolveDate,
    updateWeek,
    saveOverride,
    deleteOverride,
    refetch: fetchHours,
  };
}

/** Local-date ISO string. Avoids toISOString(), which shifts the date across UTC. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
