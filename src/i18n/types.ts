/**
 * Recursively optional, with leaf values widened to `string`.
 *
 * This lets a regional bundle override only the keys that differ from the base
 * while still being checked against its *shape* — a misspelled key is a compile
 * error rather than a silently ignored string. The leaves have to be widened
 * because the base bundle is `as const`, which types each entry as its own
 * literal ("Labor cost"); without widening, no override value would ever be
 * assignable.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};
