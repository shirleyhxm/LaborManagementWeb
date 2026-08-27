# Backend: preserve shift ids across reassignment

**Repo:** `~/Desktop/Projects/LaborManagement` (Kotlin/Ktor) — not this one.
**Symptom:** `PATCH .../shifts/{id}` returns `404 Shift not found` even though the
reassign it reports on succeeded.

## What happens

`ShiftModificationService.modifyShift` applies the move, then calls
`recalculateOvertimeFor`, which runs `OvertimeSplitter.recalculateFor` for both the
giving and the receiving employee. `recalculateFor` merges that employee's shifts into
contiguous blocks and rebuilds them through `split()`.

`split()` constructs new `Shift` objects with `id = idFor()`, defaulted to
`UUID.randomUUID()` (`OvertimeSplitter.kt`, three construction sites). Every rebuilt row
therefore gets a **fresh id**, and the id the client is holding stops existing.

The service already knows this — the comment above the `modifiedShift` lookup says the
original id "may no longer exist", and works around it by finding the row positionally.
The workaround covers the response; it does nothing for the client's *next* request.

Confirmed locally: reassigning shift `392a27b6…` returned 200 with a new id
`05b69dcb…`, the original was gone from the schedule, and replaying it gave
`404 Shift not found` — the production error exactly.

Note this is conditional, not universal. When a move doesn't restructure the employee's
blocks the ids survive: one session's log shows the same id PATCHed successfully nine
times in a row. So the failure is intermittent, which is why it reads as random.

## Why it reaches users

Any client holding a shift id from before an id-regenerating edit will 404 on its next
PATCH. Known routes:

- A second drag issued before the post-move reload lands (fixed frontend-side in this
  repo — an in-flight guard plus a visible saving state; the reassign takes ~1.5s in
  production, which is ample time to re-drag).
- A reload that fails after a successful move, leaving a stale grid (also fixed here —
  the error is now surfaced instead of swallowed).
- Anything this repo can't guard: a second browser tab, another user on the same draft,
  a client that caches.

The frontend fixes close the first two. They cannot close the third, which is why this
change is still worth making.

## Suggested change

Carry the original id onto the first row of each rebuilt block, minting new ids only for
additional rows produced by a split.

In `OvertimeSplitter.recalculateFor`, each block already originates from a merged group
of existing shifts. Pass that group's id into `split()` via the existing `idFor`
parameter so the first constructed row reuses it:

```kotlin
for (block in mergeContiguous(theirs)) {
    var first = true
    val originalId = block.id          // id of the row the block was merged from
    result += split(
        employee = employee,
        date = block.date,
        startTime = block.startTime,
        endTime = block.endTime,
        hoursBefore = hoursSoFar,
        blockDurationHours = block.durationHours,
        idFor = { if (first) { first = false; originalId } else UUID.randomUUID() }
    )
    hoursSoFar += block.durationHours
}
```

`split()` needs no change — `idFor` is already a parameter, and `mergeContiguous` already
carries the first row's id through its `copy(endTime = …)`.

With this, a stale id from a client that missed one update still resolves, and the
positional-lookup workaround for `modifiedShift` becomes unnecessary.

### Also worth considering

- **Idempotency.** A replayed PATCH currently re-applies the move. Preserving ids makes
  the replay resolve rather than 404, but it still re-runs the work. If the request
  carried a client-generated request id, the service could detect and no-op a replay.
- **Latency.** 1542ms for one reassign, because a single shift move triggers a
  whole-schedule overtime recalculation plus metrics and staffing recomputes. That
  duration is what opens the double-drag window in the first place; narrowing the
  recalculation to the affected employees' shifts would shrink it for every client.

## Verifying

```bash
# reassign, then replay the same id — should be 200 both times after the fix
curl -X PATCH ".../schedules/$SID/shifts/$SHIFT" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"employeeId":"'$TGT'","modifiedBy":"User"}'
```

Cover both paths in a unit test: a move that stays under the overtime threshold (ids were
already stable) and one that crosses it and splits (ids previously changed — the first row
should now keep the original id, the overtime row should get a new one).
