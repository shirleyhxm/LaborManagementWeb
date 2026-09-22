import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Loader2, Pencil, Trash2, Users } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";
import type { OptimizationObjective, Schedule } from "../types/scheduling";
import { useStickyToggle } from "../hooks/useStickyToggle";
import { useFormatters } from "../hooks/useFormatters";
import { useTranslation } from "react-i18next";

/**
 * What each objective actually does to an event's roster, rather than only its name.
 *
 * The difference is not cosmetic and is easy to be caught out by: an event asking for three
 * people under Maximize Fairness still rosters everyone available, because fairness carries
 * no cost term and the most even split of hours is the one where nobody is left out. Saying
 * so here is what stops that reading as the staffing requirement being ignored.
 */
const OBJECTIVES: { value: OptimizationObjective; labelKey: string; hintKey: string }[] = [
  { value: "BALANCED", labelKey: "schedule.objectiveBalanced", hintKey: "event.objectiveBalancedHint" },
  { value: "MINIMIZE_LABOR_COST", labelKey: "schedule.objectiveMinimizeCost", hintKey: "event.objectiveMinimizeCostHint" },
  { value: "MAXIMIZE_SALES", labelKey: "schedule.objectiveMaximizeSales", hintKey: "event.objectiveMaximizeSalesHint" },
  { value: "MAXIMIZE_FAIRNESS", labelKey: "schedule.objectiveMaximizeFairness", hintKey: "event.objectiveMaximizeFairnessHint" },
];

interface EventDetailProps {
  event: SpecialEvent;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Where to render the build actions — Generate Schedule, Try Again and Replace.
   *
   * They belong in the page header beside Save & Publish, which this component does not
   * own, so it hands them up instead of drawing them itself. Schedule View passes a portal
   * into its action row; without one they render in place, which keeps this component
   * usable on its own.
   */
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  /**
   * Builds (or rebuilds) the event's schedule. Rejects with a message worth showing.
   *
   * An objective is passed when the manager changed it on the way in, which saves it to the
   * event before generating - the backend reads the objective from the stored definition, and
   * a choice that only lived in this dialog would be ignored by the run it was made for.
   */
  onGenerate: (objective?: OptimizationObjective) => Promise<void>;
  generating: boolean;
  /** The schedule already generated, if there is one. */
  schedule: Schedule | null;
  /** When generation last finished, so a re-run that changes nothing still shows it ran. */
  lastGeneratedAt: number | null;
  /** Rendered below the card once a schedule exists — the ordinary schedule grid. */
  children?: React.ReactNode;
}

/**
 * A calendar date with no time attached, built from its parts rather than parsed.
 *
 * `new Date("2026-09-07")` is read as UTC midnight and then rendered in local time, which
 * moves the event a day backwards for anyone west of Greenwich.
 */
function localDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * What a special event is set up to do, and the schedule built from it.
 *
 * The definition stays visible above the schedule rather than being replaced by it: when a
 * result looks wrong, what the event actually asked for is the first thing worth checking.
 *
 * The three states are kept distinct on purpose - not generated, generated but empty, and
 * generated with shifts. An empty grid means the same thing as a broken constraint to anyone
 * looking at it, so a generation that produced nothing says so and suggests why.
 */
export function EventDetail({
  event,
  onEdit,
  onDelete,
  onGenerate,
  generating,
  schedule,
  lastGeneratedAt,
  renderActions = (actions) => actions,
  children,
}: EventDetailProps) {
  const { formatDate, formatClockTime, formatCurrencyExact, formatTime } = useFormatters();
  const { t } = useTranslation();
  const totalRequired = event.requirements.reduce((sum, r) => sum + r.count, 0);
  // The event's window, written the way the region writes clock times — "9:00 PM – 2:00 AM"
  // in the US, "21:00–02:00" in the UK.
  const eventHours = `${formatClockTime(event.startTime)}–${formatClockTime(event.endTime)}`;
  // Deleting an event throws away a definition a manager built by hand and cannot be
  // undone, so it asks first - unlike the reversible edits elsewhere on this page.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Replacing is likewise irreversible: it discards the existing schedule along with any
  // shifts moved by hand on it.
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // The objective to build with, chosen in the replace dialog. Seeded from the event each
  // time the dialog opens, so cancelling leaves the saved objective alone.
  const [draftObjective, setDraftObjective] = useState<OptimizationObjective>(event.objective);

  const openReplace = () => {
    setDraftObjective(event.objective);
    setConfirmingReplace(true);
  };

  const runGenerate = async (objective?: OptimizationObjective) => {
    setGenerateError(null);
    try {
      await onGenerate(objective);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : t('event.generateFailed'));
    }
  };

  // A schedule that came back with nothing in it. The solver does this legitimately - most
  // often when nobody is available in the event's window - and showing an empty grid for it
  // would look exactly like a broken constraint, so say what happened instead.
  const generatedNothing = schedule != null && schedule.shifts.length === 0;

  // Only worth collapsing once there is a schedule to read: before that this card is the
  // whole page, and an empty result still needs its staffing visible to explain itself.
  const collapsible = schedule != null && !generatedNothing;
  // Remembered rather than held in component state: switching to the weekly rota and back
  // unmounts this card, which silently undid the choice every time.
  //
  // Keyed per event, since folding away one event's definition says nothing about whether
  // the next one's is worth reading - a shared flag meant collapsing a familiar event also
  // hid the details of an unfamiliar one.
  const [collapsed, setCollapsed] = useStickyToggle(`eventDetailCollapsed:${event.id}`);
  // Expanded whenever it cannot be collapsed, so a card that was folded away does not stay
  // hidden after a regenerate leaves the event with nothing scheduled.
  const showDetail = !collapsible || !collapsed;

  /**
   * The one build action the event's current state calls for, handed to the header.
   *
   * All three are the same operation under different names - the wording tracks what the
   * manager is about to do to what is already there, which is the part worth being clear
   * about, since two of the three throw work away.
   */
  const buildAction =
    schedule == null ? (
      <Button className="gap-2" onClick={() => runGenerate()} disabled={generating}>
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{t('event.generating')}</>
        ) : (
          t('event.generate')
        )}
      </Button>
    ) : generatedNothing ? (
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => runGenerate()}
        disabled={generating}
      >
        {generating && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('event.tryAgain')}
      </Button>
    ) : (
      <Button variant="outline" className="gap-2" onClick={openReplace} disabled={generating}>
        {generating && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('event.replace')}
      </Button>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">{event.name}</CardTitle>
              <p className="text-sm text-neutral-600">
                {formatDate(localDate(event.date), {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {eventHours}
                {event.crossesMidnight && (
                  <span className="text-neutral-500"> {t('event.endsNextDay')}</span>
                )}
              </p>
              {event.notes && <p className="text-sm text-neutral-500">{event.notes}</p>}
              {/* Folding the card away should not take the headline facts with it. The
                  staffing is the thing a manager checks the schedule against, so a one-line
                  version of it stays on the header while the detail is hidden. */}
              {!showDetail && (
                <p className="text-sm text-neutral-500">
                  {event.requirements.length > 0
                    ? t('event.requirementsSummary', {
                        requirements: event.requirements
                          .map((r) => t('event.requirement', { count: r.count, group: r.groupName }))
                          .join(', '),
                        count: totalRequired,
                      })
                    : t('event.noRequirementsShort')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-neutral-600"
                  onClick={() => setCollapsed((open) => !open)}
                  aria-expanded={showDetail}
                  aria-controls="event-detail-body"
                >
                  {showDetail ? (
                    <><ChevronUp className="w-3.5 h-3.5" />{t('event.hideDetails')}</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" />{t('event.showDetails')}</>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />{t('event.edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />{t('event.delete')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent id="event-detail-body" hidden={!showDetail}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('event.staffing')}</p>
              {event.requirements.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {t('event.noRequirements')}
                </p>
              ) : (
                <div className="space-y-1">
                  {event.requirements.map((requirement) => (
                    <div
                      key={requirement.groupName}
                      className="flex items-center justify-between px-3 py-1.5 border border-neutral-200 rounded-lg"
                    >
                      <span className="text-sm text-neutral-700">
                        {t('event.requirement', {
                          count: requirement.count,
                          group: requirement.groupName,
                        })}
                      </span>
                      {requirement.payRate != null && (
                        <span className="text-xs text-purple-700">
                          {t('event.rate', { rate: formatCurrencyExact(requirement.payRate) })}
                        </span>
                      )}
                      {requirement.payUplift != null && (
                        <span className="text-xs text-purple-700">
                          {t('event.uplift', { amount: formatCurrencyExact(requirement.payUplift) })}
                        </span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-neutral-500 pt-1">
                    <Users className="w-3 h-3 inline mr-1" />
                    {t('event.peopleRequired', { count: totalRequired })}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('event.rules')}</p>
              {event.ruleOverrides &&
              Object.values(event.ruleOverrides).some((v) => v != null) ? (
                <div className="space-y-1 text-sm text-neutral-700">
                  {event.ruleOverrides.minShiftLength != null && (
                    <p>{t('event.minShiftLength', { hours: event.ruleOverrides.minShiftLength })}</p>
                  )}
                  {event.ruleOverrides.maxShiftLength != null && (
                    <p>{t('event.maxShiftLength', { hours: event.ruleOverrides.maxShiftLength })}</p>
                  )}
                  {event.ruleOverrides.coverageFraction != null && (
                    <p>
                      {t('event.coverageTarget', {
                        percent: Math.round(event.ruleOverrides.coverageFraction * 100),
                      })}
                    </p>
                  )}
                  {/* Spelled from the locale, not hardcoded: "Labour budget" under en-GB,
                      matching the Labour Cost tile directly below it. */}
                  {event.ruleOverrides.laborCostBudget != null && (
                    <p>
                      {`${t('rules.laborBudget')}: ${formatCurrencyExact(event.ruleOverrides.laborCostBudget)}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">{t('event.usingDefaults')}</p>
              )}

              {/* Shown alongside the rules because it behaves like one: it is the single
                  setting most likely to explain why a roster came out larger or smaller
                  than the staffing above asks for. */}
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 pt-2">
                {t('event.objective')}
              </p>
              <p className="text-sm text-neutral-700">
                {(() => {
                  const key = OBJECTIVES.find((o) => o.value === event.objective)?.labelKey;
                  return key ? t(key) : event.objective;
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {generateError && (
        <div className="flex gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{generateError}</p>
        </div>
      )}

      {renderActions(buildAction)}

      {schedule == null ? (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CalendarClock className="w-4 h-4 text-blue-700 shrink-0" />
          <p className="text-sm text-blue-700 flex-1">
            {t('event.notGenerated')}
          </p>
        </div>
      ) : generatedNothing ? (
        <div className="flex gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-amber-800">
              {t('event.nobodyScheduled')}
            </p>
            {/* Two quite different causes look identical from here, and the more common one
                is the less obvious: with no expected revenue an event inherits the business
                forecast, which for an evening event usually covers none of its hours - so
                every slot reads as having no demand and the solver rightly staffs nobody.
                Named first, because "check availability" sends people hunting in the wrong
                place entirely. */}
            {!event.expectedRevenue || Object.keys(event.expectedRevenue).length === 0 ? (
              <p className="text-sm text-amber-700">
                {t('event.noRevenueHint', { hours: eventHours })}
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                {/* Two whole sentences rather than one with " the next morning" spliced in:
                    where that clause lands is a property of the sentence, not of English,
                    and a translator cannot move it from outside the string. */}
                {t(
                  event.crossesMidnight
                    ? 'event.nobodyAvailableOvernightHint'
                    : 'event.nobodyAvailableHint',
                  { hours: eventHours }
                )}
              </p>
            )}
            {/* Re-running against unchanged availability produces the same empty result, so
                say the attempt happened - otherwise the button reads as broken. */}
            {lastGeneratedAt != null && (
              <p className="text-xs text-amber-600 pt-1">
                {t('event.lastAttempted', { time: formatTime(lastGeneratedAt) })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Regenerating an unchanged event produces an equivalent schedule, so nothing
              on screen moves and the button reads as a no-op. Saying when it last ran is
              what distinguishes "did nothing" from "did it, and this is the answer".
              Stays by the grid rather than following Replace into the header, where a line
              of small print would crowd the buttons it sits between. */}
          {lastGeneratedAt != null && (
            <p className="text-xs text-neutral-500 text-right">
              {t('event.replacedAt', { time: formatTime(lastGeneratedAt) })}
            </p>
          )}
          {children}
        </>
      )}

      {confirmingReplace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('event.replaceConfirmTitle')}
            </h3>
            <p className="text-gray-600 mb-4">{t('event.replaceConfirmBody')}</p>

            {/* Offered here rather than only in the event form because this is where its
                effect is visible: the objective decides how many people end up on the rota,
                so a result that looks wrong is most often answered by changing it and
                building again - without a detour through Edit to find it. */}
            <div className="space-y-1.5 mb-6">
              <Label htmlFor="replace-objective" className="text-xs text-neutral-500">
                {t('event.replaceObjective')}
              </Label>
              <Select
                value={draftObjective}
                onValueChange={(v) => setDraftObjective(v as OptimizationObjective)}
              >
                <SelectTrigger id="replace-objective">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-500">
                {(() => {
                const key = OBJECTIVES.find((o) => o.value === draftObjective)?.hintKey;
                return key ? t(key) : null;
              })()}
              </p>
              {draftObjective !== event.objective && (
                <p className="text-xs text-amber-700">{t('event.objectiveSaved')}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmingReplace(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setConfirmingReplace(false);
                  // Only sent when actually changed, so an unchanged objective does not cost
                  // a save on every build.
                  runGenerate(
                    draftObjective === event.objective ? undefined : draftObjective
                  );
                }}
              >
                {t('event.replace')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('event.deleteConfirmTitle', { name: event.name })}
            </h3>
            <p className="text-gray-600 mb-6">{t('event.deleteConfirmBody')}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
              >
                {t('event.deleteConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
