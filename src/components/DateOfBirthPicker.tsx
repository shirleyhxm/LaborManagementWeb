import { useMemo, useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { enGB, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useDayPicker, useNavigation, type CaptionProps } from 'react-day-picker';

import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useFormatters } from '../hooks/useFormatters';
import { formatWireDate, parseWireDate } from '../utils/wireDate';
import { useLocale } from '../contexts/LocaleContext';

/**
 * Date-of-birth field backed by a calendar rather than free text.
 *
 * The value in and out is the backend's `dd/MM/yyyy` wire format — the employee
 * API rejects anything else — but that string is never shown or typed. The
 * button displays the date the region's own way ("Jan 1, 1995" / "1 Jan 1995"),
 * which removes the 01/02 day-vs-month ambiguity that a numeric field has for
 * a reader who doesn't know which convention it expects.
 */

/** Roughly the oldest plausible working birth date; bounds the year dropdown. */
const MIN_BIRTH_YEAR = 1920;

interface DateOfBirthPickerProps {
  id: string;
  /** `dd/MM/yyyy`, or empty when unset. */
  value: string;
  /** Called with `dd/MM/yyyy`. */
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * Month/year dropdowns plus prev/next arrows, laid out in normal flow.
 *
 * react-day-picker's own `dropdown-buttons` caption renders bare `<select>`
 * elements with visible "Month:"/"Year:" labels, which match nothing else in
 * the app and collide with the absolutely-positioned nav buttons. This
 * replaces the whole caption with the same `Select` primitive the surrounding
 * form uses.
 */
function DropdownCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const { fromDate, toDate } = useDayPicker();
  const { getMonthNames } = useFormatters();

  const fromYear = fromDate?.getFullYear() ?? MIN_BIRTH_YEAR;
  const toYear = toDate?.getFullYear() ?? new Date().getFullYear();

  // Month names in the active region's language, from the same Intl-backed
  // helper the rest of the app uses for month labels.
  const months = getMonthNames('short');

  // Newest first: a birth year is far likelier to be recent than to be 1920,
  // so the common choices sit at the top of the list rather than after a
  // hundred rows of scrolling.
  const years = useMemo(
    () =>
      Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i),
    [fromYear, toYear],
  );

  const handleMonthChange = (month: string) => {
    goToMonth(new Date(displayMonth.getFullYear(), Number(month)));
  };

  const handleYearChange = (year: string) => {
    goToMonth(new Date(Number(year), displayMonth.getMonth()));
  };

  const navButtonClass =
    'flex size-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="flex items-center justify-between gap-2 pb-1">
      <button
        type="button"
        aria-label="Previous month"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={navButtonClass}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex flex-1 items-center gap-2">
        <Select
          value={String(displayMonth.getMonth())}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-8 flex-1 text-sm" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((label, month) => (
              <SelectItem key={label} value={String(month)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(displayMonth.getFullYear())}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-8 w-[5.5rem] text-sm" aria-label="Year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        aria-label="Next month"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={navButtonClass}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function DateOfBirthPicker({
  id,
  value,
  onChange,
  required = false,
}: DateOfBirthPickerProps) {
  // Unlike the schedule week (Monday-first by data model), this calendar is
  // pure presentation, so it follows the region's own convention.
  const { formatDateMedium, weekStartsOn } = useFormatters();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'en-GB' ? enGB : enUS;
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(() => parseWireDate(value), [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(formatWireDate(date));
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* A plain <button> rather than the shared <Button>: that component is
          not wrapped in forwardRef, so `asChild` cannot attach the trigger ref
          and the popover never opens. Styled to match the sibling inputs. */}
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          // `aria-required` rather than `required`: this is a button, so the
          // native constraint wouldn't apply, but assistive tech still reads it.
          aria-required={required}
          className={`flex h-9 w-full items-center gap-2 rounded-md border border-neutral-200 bg-input-background px-3 py-1 text-left text-sm transition-colors outline-none hover:bg-neutral-50 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200 ${
            selected ? 'text-neutral-900' : 'text-neutral-500'
          }`}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-500" />
          {selected ? formatDateMedium(selected) : t('employees.selectDateOfBirth')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          // Opening on today would leave a birth-year selection dozens of
          // clicks away; an existing value opens on its own month instead.
          defaultMonth={selected ?? new Date(1995, 0)}
          // `fromDate`/`toDate` (rather than fromYear/toYear) so the custom
          // caption can read the bounds back off the DayPicker context.
          fromDate={new Date(MIN_BIRTH_YEAR, 0, 1)}
          toDate={new Date()}
          // Weeks start where the selected region starts them, and month and
          // weekday names come from its date-fns locale.
          weekStartsOn={weekStartsOn}
          locale={dateFnsLocale}
          // Keeps every month six rows tall. Without it the panel changes
          // height as you page between months, which makes the day you were
          // aiming for jump out from under the pointer.
          fixedWeeks
          components={{ Caption: DropdownCaption }}
          classNames={{
            month: 'flex flex-col gap-3',
            head_cell: 'w-9 text-[0.7rem] font-medium uppercase tracking-wide text-neutral-500',
            cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md',
            day: 'inline-flex size-9 items-center justify-center rounded-md p-0 font-normal transition-colors hover:bg-neutral-100 aria-selected:opacity-100',
            day_selected:
              'bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white focus:bg-neutral-900 focus:text-white',
            day_today: 'bg-neutral-100 font-medium text-neutral-900',
            day_disabled: 'text-neutral-300 hover:bg-transparent',
            // Padding days from the neighbouring months: visible so the grid
            // keeps its shape, muted so they don't compete with the real ones.
            day_outside: 'text-neutral-300',
            row: 'flex w-full mt-1',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
