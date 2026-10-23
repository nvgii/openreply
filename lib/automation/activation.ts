/**
 * A campaign only acts on comments created after it became active.
 *
 * "Became active" is when it was created, or the last time it was switched
 * from paused to active. Comments from before that — already answered in
 * ManyChat, or by hand — must not get a second DM. Direct messages and button
 * taps are not comments and are not compared against this timestamp.
 */

export function commentCreatedAtMs(
  value: string | number | Date | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    // Unix seconds until year 2286 are below 1e12. Milliseconds are larger.
    return value < 1_000_000_000_000 ? Math.round(value * 1000) : Math.round(value);
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function commentCreatedAtIso(
  value: string | number | Date | null | undefined,
): string | undefined {
  const ms = commentCreatedAtMs(value);
  return ms === null ? undefined : new Date(ms).toISOString();
}

/**
 * True only when the comment's own timestamp is known and earlier than the
 * campaign activation. An unknown or unparseable timestamp is not earlier:
 * the caller keeps its previous behaviour.
 */
export function commentPredatesActivation(
  commentCreatedAt: string | number | Date | null | undefined,
  activatedAt: Date | string | number | null | undefined,
): boolean {
  const commentMs = commentCreatedAtMs(commentCreatedAt);
  const activatedMs = commentCreatedAtMs(activatedAt);
  if (commentMs === null || activatedMs === null) return false;
  return commentMs < activatedMs;
}

/** Polling window: never older than the lookback, and never before activation. */
export function activationCutoffMs(
  sinceMs: number,
  activatedAt: Date | string | number | null | undefined,
): number {
  const activatedMs = commentCreatedAtMs(activatedAt);
  if (activatedMs === null) return sinceMs;
  return Math.max(sinceMs, activatedMs);
}

/**
 * Set when a paused campaign is switched on. Saving a campaign that is
 * already active must not move the timestamp, or comments that arrived after
 * the original start would suddenly look too old.
 */
export function activatedAtForUpdate({
  wasActive,
  willBeActive,
  now = new Date(),
}: {
  wasActive: boolean;
  willBeActive: boolean | undefined;
  now?: Date;
}): Date | null {
  if (willBeActive === true && wasActive === false) return now;
  return null;
}
