# Special Events — Implementation Plan

Feature: one-off events (private parties, collaborations, ticketed nights) with their own
hours, staffing requirements, pay, and objectives — set by an admin/manager when they create
the event.

## Core architecture: an event *is* a schedule

An event schedule is an ordinary `Schedule` that happens to span a few hours instead of a
week, carrying its own employee pool, forecast, staffing requirements, rules, and objective.
It is **not** an overlay merged into the regular weekly schedule.

This buys the entire existing pipeline unchanged: generation, CP-SAT solve, shift
persistence, DRAFT/PUBLISHED lifecycle, publish, duplicate, undo, shift drag-and-drop,
violations, metrics. `SchedulePeriod.operatingHours` is already a per-date map and hours live
there rather than on the schedule row (`Tables.kt:245`), so a 20:00–02:00 single-day schedule
is already representable with no schema change to `Schedules` or `Shifts`.

### Separation is explicit, never inferred

Add `kind` to `Schedule` and to the `Schedules` table:

```kotlin
enum class ScheduleKind { REGULAR, EVENT }
```

```kotlin
val kind = varchar("kind", 20).default("REGULAR")   // Tables.kt, Schedules
```

Do **not** distinguish event schedules by their date span. `findByBusinessAndDateRange`
(`ScheduleRepository.kt:129`) matches `startDate`/`endDate` exactly and returns
`singleOrNull()` — an event spanning the same dates as a regular schedule would both be
mistaken for it and make that query throw on two matching rows. The flag is what keeps the
two populations disjoint.

`.default("REGULAR")` means existing rows migrate correctly under Exposed's
`addMissingColumnsStatements` (`DatabaseFactory.kt:141`) with no backfill.

### Query changes this forces

| Site | Change |
|---|---|
| `findByBusinessAndDateRange` (`ScheduleRepository.kt:129`) | Add `kind eq REGULAR`. Restores the "one schedule per exact range" invariant `singleOrNull()` assumes. |
| `findByBusinessAndStatus` (`:118`) | Add a `kind` parameter. Feeds the schedule-history dropdown, which must not list events. |
| `findEventsByBusinessAndDateRange` | **New.** Overlap query (`startDate <= rangeEnd && endDate >= rangeStart`), `kind eq EVENT`, returning all matches — a week may hold several events. |
| `findShiftsForEmployeeInRange` (`:145`) | **No change.** Joins `Shifts` to `Schedules` without filtering kind, so employee shift views pick up event shifts automatically. |
| `findAllShiftsForEmployeeInRange` (`:181`) | **No change**, same reason. |
| `findPublishedShiftsElsewhere` (`:224`) | **Change required — see below.** |

### The cross-schedule hours problem

`findPublishedShiftsElsewhere` filters `Schedules.businessId neq excludeBusinessId`: it exists
to count hours an employee worked at *other locations* against their weekly cap. An event
schedule is in the **same** business, so as written it is invisible to the regular schedule's
hour caps and vice versa.

Left alone, someone rostered 40h on the weekly schedule can be handed a 6h event shift the
same week with no cap breach detected. That is the single most important correctness issue in
this feature.

Fix: generalise to "shifts this person holds that this solve isn't allocating" — other
businesses **plus** same-business schedules other than the one being generated:

```kotlin
fun findCommittedShiftsElsewhere(
    businessId: UUID,
    excludeScheduleId: UUID?,   // the schedule being (re)generated
    employeeIds: List<UUID>,
    startDate: LocalDate,
    endDate: LocalDate
): List<Shift>
// where: (Schedules.businessId neq businessId OR Schedules.id neq excludeScheduleId)
//        and status == PUBLISHED
```

Both `generateScheduleGreedy` and `generateScheduleOptimizer` already call the current
function (`ShiftScheduler.kt:168`, `:292`) and feed it into availability and
`hoursCommittedElsewhere` (`OptimizationConverter.kt:85-96`), so the plumbing is in place —
only the query predicate and call sites change.

### Why this needs no new hour category

**Decision: event hours count exactly like regular hours.** 38h on the weekly schedule plus a
6h event is 44h — 40 regular, 4 overtime.

A third `eventHours` variable class alongside `regular[e]`/`overtime[e]` was considered and
rejected. It would not have fixed this bug: the solver's committed-hours accounting is
already correct. `remainingOf` (`ScheduleOptimizer.kt:1131`) subtracts hours worked elsewhere
from the cap before allocating, applied to the weekly cap at `:548` and the overtime
threshold at `:555`. The defect is purely that `hoursCommittedElsewhere` is built from a query
that excludes same-business schedules, so `remainingOf` subtracts zero. A new variable class
would still not have told the solver those hours exist.

A third category would only be needed to express a *different* policy — events as a separate
allocation exempt from the overtime threshold, with their own cap and rate. That policy is
not what we want: statutory weekly limits, minimum rest and consecutive-day limits are about
total time worked regardless of why, so any exempt category risks quietly manufacturing
compliance breaches.

Consequences to keep in view:

- Event hours can push an employee into overtime on their weekly schedule, and the event
  shift may itself be marked `isOvertime`. This is correct, and managers should see it.
- Where an event pay override and overtime coincide, the override interacts with the overtime
  multiplier per the rule documented on `EventPayOverride` (step 5).
- An employee near their weekly cap may be un-assignable to an event. That surfaces as
  `EVENT_UNDERSTAFFED` rather than a silent omission — which is the point of the soft
  constraint.

**Ordering caveat worth surfacing in the UI:** only PUBLISHED shifts count. Generating an
event against an unpublished weekly draft won't see those hours. Either require publishing
first or warn in the event generator.

## Decisions taken

| Question | Decision |
|---|---|
| Staffing shape | Per-employee-group headcount (`Bartender: 2`, `Security: 1`) |
| Group source | Existing `EmployeeGroups` table — validated picker, no free text |
| Unmet requirement | Generate and flag (soft constraint + violation), never block |
| Pay override | Both forms per group: absolute rate **or** uplift |
| Statutory rules | Not overridable — event breaches generate with a violation |
| Event vs regular | Separate schedules, explicit `kind` flag |
| Event UI location | Inside Schedule View, no separate tab — shown only when the selected week has events |
| Event hours | Count as regular hours — consume the weekly cap, can trigger overtime. No third hour category. |

## Constraints discovered in the code

1. **Operating hours are hardcoded** at `ScheduleView.tsx:203` (`09:00`–`21:00` for every
   date), though `SchedulePeriod.operatingHours` is already per-date. Blocks event hours;
   also a standalone bug.
2. **Demand is sales ÷ productivity only** (`ShiftScheduler.kt:808`). No revenue-independent
   headcount input exists.
3. **The solver never reads `employee.groups`** (`Employee.kt:21`). Group-aware staffing is
   new solver work.
4. **Pay is per-employee** (`ScheduleOptimizer.kt:336-338`). `HourlyRateRule.weekendPremium`
   is modelled but unreferenced by the solver — do not assume it works.
5. **Greedy fallback diverges** from CP-SAT (`ShiftScheduler.kt:328`). A hard staffing floor
   risks infeasibility → silent greedy fallback → constraint ignored. Soft constraint avoids
   this.
6. **`coverageFraction` is hardcoded `0.8`** (`ShiftScheduler.kt:309`). Events likely want
   full coverage — should become per-schedule.

## Data model

### `model/SpecialEvent.kt` (new)

The event definition — the manager's input, distinct from the schedule generated from it.

```kotlin
data class SpecialEvent(
    val id: UUID,
    val businessId: UUID,
    val name: String,
    val date: LocalDate,
    val startTime: LocalTime,
    val endTime: LocalTime,
    val notes: String? = null,

    // Own employee pool. Empty = all schedulable employees.
    val employeeIds: List<UUID> = emptyList(),

    // Own forecast, independent of the business weekly pattern.
    val expectedRevenue: Map<LocalTime, Double>? = null,

    // Own objective.
    val objective: OptimizationObjective = OptimizationObjective.BALANCED,

    val requirements: List<EventStaffingRequirement> = emptyList(),

    // Own rule overrides. Null = inherit the business rule.
    // Statutory limits are NOT included here by design.
    val ruleOverrides: EventRuleOverrides? = null,

    // The generated schedule, once one exists.
    val scheduleId: UUID? = null,

    val createdAt: Instant = Instant.now(),
    val createdBy: String = "system"
)

data class EventStaffingRequirement(
    val groupName: String,
    val count: Int,
    val payOverride: EventPayOverride? = null
)

// Sealed so exactly one form is set — a nullable pair would permit the
// meaningless "both at once" state.
sealed class EventPayOverride {
    data class AbsoluteRate(val rate: Double) : EventPayOverride()
    data class Uplift(val amountPerHour: Double) : EventPayOverride()
}

data class EventRuleOverrides(
    val minShiftLength: Double? = null,
    val maxShiftLength: Double? = null,
    val coverageFraction: Double? = null,
    val laborCostBudget: Double? = null
)
```

**Overtime interaction — decide explicitly, do not leave implicit:** uplift applies to the
base rate *before* the overtime multiplier; absolute rate *replaces* the base rate with the
overtime multiplier still applying on top. Document on the type; this silently produces wrong
payroll numbers otherwise.

**Statutory limits stay business-level.** `EventRuleOverrides` deliberately excludes
`minRestBetweenShifts`, `maxHoursPerWeek`, `maxConsecutiveDays`, `minWeeklyRestHours` and meal
breaks. An event breaching them generates with an `EVENT_RULE_BREACH` violation rather than
silently relaxing the limit.

### Tables

```kotlin
object SpecialEvents : Table("special_events") {
    val id = uuid("id")
    val businessId = uuid("business_id").references(Businesses.id)
    val name = varchar("name", 200)
    val date = date("date")
    val startTime = time("start_time")
    val endTime = time("end_time")
    val notes = text("notes").nullable()
    val employeeIds = text("employee_ids").default("[]")        // JSON
    val expectedRevenue = text("expected_revenue").nullable()   // JSON
    val objective = varchar("objective", 50)
    val ruleOverrides = text("rule_overrides").nullable()       // JSON
    val scheduleId = uuid("schedule_id").references(Schedules.id).nullable()
    val createdAt = timestamp("created_at")
    val createdBy = varchar("created_by", 100)
    override val primaryKey = PrimaryKey(id)
}

object SpecialEventRequirements : Table("special_event_requirements") {
    val eventId = uuid("event_id").references(SpecialEvents.id)
    val groupName = varchar("group_name", 100)
    val count = integer("count")
    val payRate = double("pay_rate").nullable()      // AbsoluteRate
    val payUplift = double("pay_uplift").nullable()  // Uplift
    override val primaryKey = PrimaryKey(eventId, groupName)
}
```

Register in `DatabaseFactory.kt` `allTables` and in the `SchemaUtils.drop` list (children
before parents). JSON columns follow the `SalesForecasts` precedent.

## Backend implementation

### 1. Repository — `repository/SpecialEventRepository.kt` (new)

`findByBusiness`, `findByBusinessAndDateRange` (overlap), `findById`, `save`, `update`,
`delete`, `linkSchedule(eventId, scheduleId)`. Requirements load/save as a child collection.

### 2. Controller — `controller/SpecialEventController.kt` (new)

```
GET    /api/businesses/{businessId}/events?startDate=&endDate=
GET    /api/businesses/{businessId}/events/{id}
POST   /api/businesses/{businessId}/events
PUT    /api/businesses/{businessId}/events/{id}
DELETE /api/businesses/{businessId}/events/{id}
POST   /api/businesses/{businessId}/events/{id}/generate   → Schedule (kind=EVENT)
```

Admin/manager only. **Validate `groupName` against `EmployeeGroups` on write** and reject
unknown names — this is what makes "use existing groups" real and prevents a typo silently
matching zero employees and producing a mysteriously understaffed event.

### 3. Generation — `service/EventScheduler.kt` (new, thin)

Deliberately thin: translate a `SpecialEvent` into a `ScheduleInput` and delegate to the
existing `ShiftScheduler`. **No parallel scheduling implementation.**

```kotlin
fun generateForEvent(event: SpecialEvent, businessId: UUID): Schedule {
    val input = ScheduleInput(
        businessId = businessId,
        employeeIds = event.employeeIds.ifEmpty { allSchedulableEmployeeIds(businessId) },
        laborCostBudget = event.ruleOverrides?.laborCostBudget ?: Double.MAX_VALUE,
        schedulePeriod = SchedulePeriod(
            startDate = event.date,
            endDate = event.date,
            operatingHours = mapOf(event.date to OperatingHours(event.startTime, event.endTime))
        ),
        optimizationObjective = event.objective
    )
    return shiftScheduler.generateSchedule(
        input, name = event.name, generatedBy = ..., businessId = businessId,
        kind = ScheduleKind.EVENT,
        eventContext = EventContext(event.requirements, event.expectedRevenue, event.ruleOverrides)
    )
}
```

`ShiftScheduler.generateSchedule` gains two optional parameters (`kind`, `eventContext`), both
defaulted so every existing caller is unaffected. When `eventContext` is present:

- **Forecast:** use `event.expectedRevenue` for the day instead of the business forecast.
  Build a transient `SalesForecast` with a `dateSpecificForecast` entry —
  `getForecastForDate` already prefers date-specific over weekly pattern
  (`SalesForecast.kt:22-30`), so no lookup changes.
- **Rules:** overlay `ruleOverrides` on the fetched `WorkingHoursRules` for the non-statutory
  fields only.
- **Budget:** `resolveLaborCostBudget` is bypassed when the event carries its own budget —
  pro-rating a weekly budget to a 6-hour schedule would yield a nonsensically small cap.
  Worth a comment; it's a real trap.
- **Coverage:** `coverageFraction` from overrides, defaulting to the current `0.8`.

**Midnight crossing.** `endTime < startTime` means the event runs past midnight, but slots,
availability and daily caps are all keyed by `LocalDate`. **Recommendation: reject
end-before-start at the API for v1** and surface the limitation in the UI, rather than
silently mis-scheduling. Proper handling means a two-day `SchedulePeriod` with partial hours
on each date — deferrable, and cleanly so, because the event owns its own `SchedulePeriod`.

### 4. Group-aware soft staffing — `OptimizationConverter.kt` + `ScheduleOptimizer.kt`

Extend `OptimizationInput`:

```kotlin
val eventRequirements: List<EventSlotRequirement> = emptyList()
// EventSlotRequirement(slotIndices, employeeIndices, count, groupName)
```

Built by resolving each requirement's group to the indices of employees carrying that tag and
the event window to covering slot indices. Empty for regular schedules, so that path is
untouched.

**Soft** constraint with slack, so it can never make the model infeasible:

```kotlin
for (req in input.eventRequirements) {
    for (t in req.slotIndices) {
        val shortfall = model.newIntVar(0, req.count.toLong(), "event_short_${req.groupName}_$t")
        model.addGreaterOrEqual(
            LinearExpr.sum(req.employeeIndices.map { e -> x[e][t] }.toTypedArray() + shortfall),
            req.count.toLong()
        )
        shortfallTerms += LinearExpr.term(shortfall, M_EVENT)
    }
}
```

Add `M_EVENT` to the objective alongside existing `M_SLACK`/`M_OT`, weighted above ordinary
coverage slack but below hard-budget terms. **Read the shortfall values back after solve** —
they are the source of the violations in step 6; without this the flag never fires.

### 5. Event pay — `ScheduleOptimizer.kt` + `OptimizationConverter.convertToShifts`

```
effectiveRate(e, t) = when (override for e's group at slot t) {
    AbsoluteRate -> rate
    Uplift       -> employee.normalPayRate + amountPerHour
    null         -> employee.normalPayRate
}
```

**This is the largest and riskiest change in the plan.** Cost terms at
`ScheduleOptimizer.kt:336-338` and `:420-421` are per-employee aggregates over all slots
(`LinearExpr.term(regular[e], rate)`); a rate applying to only some slots cannot be expressed
against that aggregate. Requires per-slot hour variables or a separate event-hours variable
per employee.

Mitigating factor from this architecture: in an event schedule *every* slot is an event slot,
so v1 can apply the group rate uniformly across the schedule — a much smaller change than the
general mixed-rate case. The full per-slot restructure is only needed if event rates ever
appear inside regular schedules, which this design avoids.

`convertToShifts` must set `Shift.payRate`/`laborCost` from the same function so persisted
shifts match what the solver costed. `mergeConsecutiveShifts` already compares `payRate`
(`ShiftScheduler.kt:409`), so differing rates won't be merged — verify rather than assume.

### 6. Violations — `model/Schedule.kt`

```kotlin
EVENT_UNDERSTAFFED,   // group requirement unmet
EVENT_RULE_BREACH     // statutory limit breached by event hours
```

Emit as `ConstraintViolation.TimeBlock` (date + start + end already fit an event window),
described with event, group and shortfall: `"NYE Party: needs 2 Bartender, 1 assigned"`.
Mirror in `src/types/scheduling.ts` — the TS union is a hand-maintained mirror of the Kotlin
enum. `ViolationDto` needs no shape change.

## Frontend implementation

### 7. Types, service, hook

- `src/types/specialEvent.ts` — mirror backend; pay override as `{ payRate?, payUplift? }`
  with a UI radio guaranteeing only one is set.
- `src/types/scheduling.ts` — add `kind: ScheduleKind` to `Schedule`, plus the new violation
  types.
- `src/services/specialEventService.ts` — CRUD + `generate`, following `constraintsService`
  conventions.
- `src/hooks/useSpecialEvents.ts` — following `useSalesForecast`/`useEmployeeGroups`.

### 8. Fix hardcoded operating hours — `ScheduleView.tsx:199-205`

Prerequisite and standalone bug. Replace the hardcoded `09:00`/`21:00` with business default
hours; add `defaultOpenTime`/`defaultCloseTime` to `BusinessSettings`
(`types/business.ts:31`), falling back to the current literals so existing businesses are
unaffected. Events supply their own hours and don't use these.

### 9. Events live inside Schedule View — no separate tab

**Decision: there is no `/events` tab.** Everything about events — defining, generating,
viewing — happens within Schedule View, and the event UI appears only when the selected week
actually has events.

Rationale: Schedule View is already week-scoped (`App.tsx:333` `tabsRequiringWeek`) and shares
`WeekContext`, so events surface exactly when they are relevant. A separate tab would split
one job across two destinations — define an event over here, view its schedule over there —
and would show an empty shell for the many businesses that never run events. Consolidating
also means `ScheduleViewer` is reused verbatim: an event schedule is a `Schedule`, so it
renders, edits, and publishes through the existing component with no parallel viewer.

**Nothing changes for a week with no events.** The switcher is absent and the page looks
exactly as it does today. Only a persistent "＋ Event" action is added.

#### Switcher: pills when few, dropdown when many

```
≤ 3 events — segmented control under the header:

  Schedule  [Draft]                        + Event
  ────────────────────────────────────────────────
  ( Weekly )  ( NYE Party )  ( Wine Tasting )
  ────────────────────────────────────────────────
  [ schedule grid ]

> 3 events — collapses into the header:

  Schedule ▾  [Draft]                      + Event
  └─ Weekly Schedule              ✓
     NYE Party        Dec 31 20:00
     Wine Tasting     Jan 2  18:00
     … 3 more
     ─────────────────────────────
     All events…
```

One breakpoint rule (`events.length <= 3`) selects the render path; keep it in a single
constant so the two paths cannot drift. Both drive the same selection state.

#### Components

- `src/components/EventSwitcher.tsx` — both render paths, selection state, "＋ Event".
- `src/components/SpecialEventForm.tsx` — create/edit in a **dialog over Schedule View**, not
  a route. Fields: name, date, start/end time, notes; employee pool picker (reuse
  `ScheduleEditor`'s selection UI); expected revenue by hour (reuse `SalesForecast` input
  patterns); objective dropdown; rule overrides (see below); requirement rows — **group
  picker** from `useEmployeeGroups` + count + pay override radio.
- `src/components/AllEventsDialog.tsx` — full list across all weeks, reachable from "All
  events…". Without this, week-scoping hides events a manager is planning for next month;
  selecting one jumps `WeekContext` to its week.

#### Configuring rules for a single event

The event form's rules section is an **inherit-by-default override panel**, not a second copy
of the Rules page. Every row shows the business value it inherits; a manager changes only what
this event needs, and anything untouched stays `null` in `EventRuleOverrides` and resolves to
the business rule at generation time.

Reuse `ConstraintsEditor`'s existing idiom directly — `InfoTooltip` (`ConstraintsEditor.tsx:30`),
label-left/input-right rows, grouped `Card` sections — so the panel reads as the same product
rather than a new dialect.

```
Rules for this event                        [ Reset all to business defaults ]

  OVERRIDABLE
  Min shift length      (i)   [  3  ] hours    Business default: 1     [↺]
  Max shift length      (i)   [  6  ] hours    Business default: 12
  Coverage target       (i)   [ 100 ] %        Business default: 80    [↺]
  Labor cost budget     (i)   [ 2400 ]         Not pro-rated from weekly

  ── Always enforced ─────────────────────────────────────────────
  These come from your business rules and statutory limits, and
  cannot be changed for one event.                    [ View Rules → ]

  Max hours per week            40 hours
  Min rest between shifts       11 hours
  Max consecutive days          6 days
  Weekly rest                   24 hours
  Rest breaks                   Required over 6h
```

Behavior:

- **Inherited placeholder, not a copied value.** An untouched field shows the business value
  as a muted placeholder while its stored value stays `null`. Copying the number in would
  freeze it — later edits to business Rules would stop reaching the event, silently.
- **Per-field revert.** The `↺` appears only on overridden fields and clears back to `null`.
  Plus a "Reset all to business defaults" for the whole panel.
- **Overridden fields are visually marked** (e.g. left accent border), so at a glance a
  manager sees which of these differ from normal operation.
- **Statutory rules are shown read-only, not hidden.** A manager asking "can I run 10-hour
  event shifts?" needs to see the limit and why it can't move. Hiding them invites the
  question to be asked of support instead. "View Rules →" links to `/rules` for business-wide
  changes.
- **Collapsed by default.** Most events need no rule changes; the section shows a summary
  (`Using business defaults` or `3 overrides`) until expanded.

Two things this panel must get right, both cheap now and expensive later:

- **Warn, don't block, on conflicts.** A 6-hour event with `minShiftLength` of 8 is
  unsatisfiable; flag it inline at edit time rather than letting it surface as a mysterious
  empty grid after generation.
- **Editing business Rules must not silently reshape past events.** Overrides resolve at
  generation time, so a generated event schedule already holds its resolved values. Re-
  generating after a Rules change legitimately picks up new defaults — surface that in the
  regenerate confirmation rather than leaving it to be discovered.

#### Behavior

- `ScheduleView` fetches events overlapping `selectedWeek` alongside the regular schedule.
- Selecting an event renders its schedule through `ScheduleViewer`, badged as an event.
- An event with no generated schedule yet shows the event's generate action in place, so
  define → generate → view is one uninterrupted flow.
- The schedule-history dropdown passes `kind=REGULAR` so events never pollute it.
- Selection is URL-backed (`/schedule/event/:eventId`) so it survives reload and back/forward,
  and `lastSchedulePathRef` (`App.tsx:93`) preserves it across tab switches like any other
  schedule path.
- No `ROUTE_ACCESS` entry is needed — these are `/schedule` sub-routes, already
  admin/manager-gated (`utils/routeConfig.ts:13`).

Tailwind per CLAUDE.md; inline styles only for layout properties.

### 10. Employee portal — "My Shifts" includes both

**No query changes needed.** `findShiftsForEmployeeInRange` and
`findAllShiftsForEmployeeInRange` join `Shifts` to `Schedules` without filtering kind, so
event shifts already appear. Presentation only:

- Include `kind` (and event name) on the shift wire shape so the portal can badge event
  shifts distinctly — an employee should see *why* a Saturday 8pm–2am shift differs.
- Event shifts carrying an overridden pay rate should show it, since it differs from the
  employee's usual rate. `Shift.payRate` already carries the actual rate.
- Verify `EmployeeShift` (`types/scheduling.ts:23`) and the `/shifts` response include the
  new fields.

## Sequencing

| Step | Work | Risk |
|---|---|---|
| 1 | `ScheduleKind` flag + query updates + `findCommittedShiftsElsewhere` | Medium — touches existing queries; needs regression tests |
| 2 | Business default hours + fix `ScheduleView.tsx:203` | Low — standalone |
| 3 | Tables, model, repository, controller (CRUD only) | Low |
| 4 | Event form + switcher in Schedule View (define/list only, no generation) | Low — shippable |
| 5 | `EventScheduler` → generates event schedules via existing pipeline | Medium |
| 6 | All-events dialog + portal badging | Low |
| 7 | Group-aware soft staffing + violations | Medium-high — solver |
| 8 | Event pay overrides | High — cost-term restructure |

Steps 1–6 deliver a working feature: managers define events with their own pool, hours,
forecast and objective, generate real schedules, and employees see the shifts. Steps 7–8 add
role-level staffing and premium pay.

## Testing

Backend:
- `kind` defaults to `REGULAR`; existing schedules unaffected after migration.
- `findByBusinessAndDateRange` ignores event schedules — including the case of an event with
  exactly the same dates as a weekly schedule (the `singleOrNull()` trap).
- **Cross-schedule hours:** employee at 40h on a published weekly schedule, then an event the
  same week → cap breach detected. This is the regression that matters most.
- Employee at 38h + 6h event → 4h counted as overtime, not 0. Confirms event hours consume
  the cap via `remainingOf` rather than being tracked separately.
- Employee already at their weekly cap → not assigned to the event, and the shortfall
  surfaces as `EVENT_UNDERSTAFFED` rather than silently omitting them.
- Event uses its own forecast/pool/objective, not the business defaults.
- Group requirement met → no violation; unmet → `EVENT_UNDERSTAFFED` with correct shortfall.
- Unmet requirement still returns a schedule — **never** infeasible, never a greedy fallback.
- Absolute rate and uplift each produce expected `laborCost`; overtime interaction.
- Unknown group name and end-before-start both rejected at the API.

Frontend (Vitest per existing setup):
- Week with no events → switcher absent, Schedule View unchanged from today.
- 1–3 events → pills; 4+ → dropdown. Both drive the same selection state.
- Selecting an event renders its schedule; selecting Weekly returns to the regular one.
- Event selection survives reload via the URL and persists across tab switches.
- Schedule-history dropdown never lists event schedules.
- Form validation: one pay form at a time; end-before-start rejected.
- Rule overrides: untouched field stays `null` (not the inherited number); revert clears to
  `null`; overridden fields marked; statutory rows render read-only.
- Changing a business rule moves the inherited placeholder on an event that never overrode
  it — the regression that catches a copied-in default.
- `minShiftLength` longer than the event window warns inline before generation.
- Portal shows both shift kinds, event shifts badged and showing the overridden rate.

End-to-end, per CLAUDE.md: run the real stack; **give employees availability covering the
event window first** (missing availability silently yields a zero-shift schedule); confirm
`Solver status: OPTIMAL` rather than a greedy fallback in the backend log; assert on the
fetched schedule rather than reading the grid. Restore Rules/availability and delete
generated schedules and events afterwards.

## Open items

- **Midnight crossing** — recommend rejecting end-before-start in v1; proper support is a
  two-day `SchedulePeriod`.
- **Draft-weekly ordering** — only PUBLISHED shifts count toward cross-schedule caps; warn
  when generating an event against an unpublished week.
- **Event-only staff** — someone hired for one night has no availability rows and will never
  be assigned. Likely wants a per-event availability exception.
- **Double-booking within a week** — the cap fix covers weekly *hours*; overlapping
  same-day shifts between a weekly and an event schedule need the availability matrix to
  exclude committed slots (the same `findCommittedShiftsElsewhere` result feeds this at
  `OptimizationConverter.kt:85`, so verify it covers the same-business case).
