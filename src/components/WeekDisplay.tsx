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
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          onClick={() => setIsChangingWeek(true)}
          className="flex items-center gap-2 hover:bg-blue-100 rounded px-2 py-1 transition-colors"
        >
          <CalendarIcon className="h-4 w-4 text-blue-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-900">
              {formatWeekDisplay(selectedWeek)}
            </p>
            <p className="text-xs text-blue-600">Click to change week</p>
          </div>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="h-7 w-7 p-0"
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
