import { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, Sparkles } from "lucide-react";
import type { SpecialEvent } from "../types/specialEvent";
import type { OptimizationObjective, Schedule } from "../types/scheduling";
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

interface EventBuildActionProps {
  event: SpecialEvent;
  /** The schedule already generated for the event, if there is one. */
  schedule: Schedule | null;
  generating: boolean;
  /**
   * Builds (or rebuilds) the event's schedule. Rejects with a message worth showing.
   *
   * An objective is passed when the manager changed it on the way in, which saves it to the
   * event before generating - the backend reads the objective from the stored definition, and
   * a choice that only lived in this dialog would be ignored by the run it was made for.
   */
  onGenerate: (objective?: OptimizationObjective) => Promise<void>;
  /** Where a failed build reports itself - a banner below the event card, not up here. */
  onError: (message: string | null) => void;
}

/**
 * The single header button that builds an event's schedule, and the confirm behind it.
 *
 * Lives apart from EventDetail because it renders somewhere else: the page header's action
 * row, beside Save & Publish. Passing it up through EventDetail meant a portal, and a portal
 * fills a frame late - the row visibly painted empty on every switch between the weekly rota
 * and an event before the button appeared. Rendered by whoever owns the header instead, it
 * lands in the first commit like the buttons either side of it.
 *
 * All three labels are the same operation. The wording tracks what the manager is about to
 * do to what is already there, which is the part worth being clear about, since two of the
 * three throw work away.
 */
export function EventBuildAction({
  event,
  schedule,
  generating,
  onGenerate,
  onError,
}: EventBuildActionProps) {
  const { t } = useTranslation();
  // Replacing is irreversible: it discards the existing schedule along with any shifts
  // moved by hand on it.
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  // The objective to build with, chosen in the replace dialog. Seeded from the event each
  // time the dialog opens, so cancelling leaves the saved objective alone.
  const [draftObjective, setDraftObjective] = useState<OptimizationObjective>(event.objective);

  const runGenerate = async (objective?: OptimizationObjective) => {
    onError(null);
    try {
      await onGenerate(objective);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('event.generateFailed'));
    }
  };

  // A schedule that came back with nothing in it. The solver does this legitimately - most
  // often when nobody is available in the event's window - so the button offers another go
  // rather than pretending there is something to replace.
  const generatedNothing = schedule != null && schedule.shifts.length === 0;

  return (
    <>
      {schedule == null ? (
        <Button className="gap-2" onClick={() => runGenerate()} disabled={generating}>
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{t('event.generating')}</>
          ) : (
            <><Sparkles className="w-4 h-4" />{t('event.generate')}</>
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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setDraftObjective(event.objective);
            setConfirmingReplace(true);
          }}
          disabled={generating}
        >
          {generating && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('schedule.replace')}
        </Button>
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
                {t('schedule.replace')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
