import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { useWeek } from "../contexts/WeekContext";
import { WeekSelector } from "./WeekSelector";
import { addWeeks, subWeeks } from "date-fns";

export function WeekDisplay() {
  const { selectedWeek, setSelectedWeek, formatWeekDisplay } = useWeek();
  const [isChangingWeek, setIsChangingWeek] = useState(false);

  if (!selectedWeek) {
    return null;
  }

  const handlePreviousWeek = () => {
    const newStartDate = subWeeks(selectedWeek.startDate, 1);
    const newEndDate = subWeeks(selectedWeek.endDate, 1);
    setSelectedWeek({ startDate: newStartDate, endDate: newEndDate });
  };

  const handleNextWeek = () => {
    const newStartDate = addWeeks(selectedWeek.startDate, 1);
    const newEndDate = addWeeks(selectedWeek.endDate, 1);
    setSelectedWeek({ startDate: newStartDate, endDate: newEndDate });
  };

  const handleWeekSelect = (startDate: Date, endDate: Date) => {
    setSelectedWeek({ startDate, endDate });
    setIsChangingWeek(false);
  };

  return (
    <>
      {/* Tight horizontal rhythm: this sits in the sidebar, where every pixel of
          width comes out of the main view. The arrows sit flush against the
          center button and the calendar icon is inline with the date rather than
          claiming its own column, so the row costs barely more than its longest
          line of text. Both lines are nowrap — a longer date format should widen
          the sidebar visibly, not silently wrap. */}
      <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-1 py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="h-7 w-6 p-0 shrink-0"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          onClick={() => setIsChangingWeek(true)}
          className="flex-1 min-w-0 flex flex-col items-center hover:bg-blue-100 rounded px-1 py-0.5 transition-colors"
        >
          <span className="flex items-center gap-1 text-sm font-semibold text-blue-900 whitespace-nowrap">
            <CalendarIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            {formatWeekDisplay(selectedWeek)}
          </span>
          <span className="text-xs text-blue-600 whitespace-nowrap">Click to change week</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="h-7 w-6 p-0 shrink-0"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Change Modal */}
      {isChangingWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setIsChangingWeek(false)}
              className="absolute -top-2 -right-2 size-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
            >
              <span className="text-gray-600 text-xl leading-none">×</span>
            </button>
            <WeekSelector
              onWeekSelect={handleWeekSelect}
              initialWeekStart={selectedWeek.startDate}
            />
          </div>
        </div>
      )}
    </>
  );
}
