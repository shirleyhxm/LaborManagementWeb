import { useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameWeek,
  addMonths,
  subMonths,
  isWithinInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

interface WeekSelectorProps {
  onWeekSelect?: (startDate: Date, endDate: Date) => void;
  initialWeekStart?: Date;
}

export function WeekSelector({ onWeekSelect, initialWeekStart }: WeekSelectorProps) {
  const today = new Date();
  const initialWeek = initialWeekStart ? startOfWeek(initialWeekStart, { weekStartsOn: 1 }) : startOfWeek(today, { weekStartsOn: 1 });
  const [currentMonth, setCurrentMonth] = useState(initialWeekStart || today);
  const [selectedWeekStart, setSelectedWeekStart] = useState(initialWeek);
  const [hoveredWeekStart, setHoveredWeekStart] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const handleDayClick = (day: Date) => {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    setSelectedWeekStart(weekStart);
  };

  const handleDayHover = (day: Date) => {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    setHoveredWeekStart(weekStart);
  };

  const handleDayLeave = () => {
    setHoveredWeekStart(null);
  };

  const getDayStyle = (day: Date) => {
    const dayWeekStart = startOfWeek(day, { weekStartsOn: 1 });
    const isSelected = isSameWeek(day, selectedWeekStart, { weekStartsOn: 1 });
    const isHovered =
      hoveredWeekStart && isSameWeek(day, hoveredWeekStart, { weekStartsOn: 1 });
    const isToday = isSameDay(day, today);
    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

    // Selected week gets the bold blue
    if (isSelected) {
      return {
        background: "bg-blue-600 text-white",
        text: "text-white",
      };
    }

    // Hovered week (not selected) gets lighter blue
    if (isHovered) {
      return {
        background: "bg-blue-200",
        text: "text-gray-900",
      };
    }

    // Today gets a subtle highlight
    return {
      background: isToday ? "bg-blue-100" : "",
      text: isCurrentMonth ? "text-gray-900" : "text-gray-400",
    };
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Get week range text
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const weekRangeText = `${format(selectedWeekStart, "MMM d")} - ${format(
    selectedWeekEnd,
    "MMM d, yyyy"
  )}`;

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 w-[400px]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Select Week
        </h2>
        <p className="text-sm text-gray-600">
          Choose a week to view staffing schedules and forecasts
        </p>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-gray-600">Selected Week:</div>
        <div className="font-medium text-gray-900">{weekRangeText}</div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            className="size-8 p-0"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h3 className="font-medium text-gray-900">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="size-8 p-0"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            const style = getDayStyle(day);
            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => handleDayHover(day)}
                onMouseLeave={handleDayLeave}
                className={cn(
                  "aspect-square flex items-center justify-center text-sm rounded-md transition-colors cursor-pointer hover:opacity-90",
                  style.background,
                  style.text
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={() => onWeekSelect?.(selectedWeekStart, selectedWeekEnd)} className="w-full">
        Confirm Selection
      </Button>
    </div>
  );
}
