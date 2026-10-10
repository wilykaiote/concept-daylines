export const META_AUTO_KEYS = [
  "schedule",
  "urgency",
  "duration",
  "impact",
  "type",
  "parent",
  "recurring",
] as const;

export type MetaAutoKey = (typeof META_AUTO_KEYS)[number];

export type ComposerDraft = {
  id: string | null;
  usr_id: string | null;
  parent_id: string | null;
  after_id: string | null;
  type: string | null;
  title: string;
  description: string | null;
  est_duration: number | null;
  /** @deprecated Unused for packing; prefer `date` + `starts_at` / `due_at`. */
  date_time: string | null;
  /** Calendar day `YYYY-MM-DD`, nullable. */
  date: string | null;
  /** Time of day `HH:mm`, nullable. */
  starts_at: string | null;
  /** Time of day `HH:mm`, nullable. */
  due_at: string | null;
  urgency: string | null;
  impact: number | null;
  recurring: string | null;
  after: string | null;
  location: string | null;
  tags: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  /** True when date was moved automatically after midnight; cleared when user edits date/time. */
  auto_rescheduled: boolean | null;
  /**
   * Pipe-separated meta keys still set by default/auto and not user-verified
   * (e.g. `schedule|urgency|duration`).
   */
  meta_auto: string | null;
};

export function parseMetaAuto(value: string | null | undefined): Set<MetaAutoKey> {
  const keys = new Set<MetaAutoKey>();
  if (!value) return keys;
  for (const part of value.split("|")) {
    if ((META_AUTO_KEYS as readonly string[]).includes(part)) {
      keys.add(part as MetaAutoKey);
    }
  }
  return keys;
}

export function formatMetaAuto(keys: Iterable<MetaAutoKey>): string | null {
  const set = keys instanceof Set ? keys : new Set(keys);
  const list = META_AUTO_KEYS.filter((key) => set.has(key));
  return list.length > 0 ? list.join("|") : null;
}

export function hasMetaAuto(
  task: Pick<ComposerDraft, "meta_auto" | "auto_rescheduled">,
  key: MetaAutoKey,
): boolean {
  if (key === "schedule" && task.auto_rescheduled === true) return true;
  return parseMetaAuto(task.meta_auto).has(key);
}

export function withMetaAuto(
  task: ComposerDraft,
  key: MetaAutoKey,
): ComposerDraft {
  const keys = parseMetaAuto(task.meta_auto);
  keys.add(key);
  return {
    ...task,
    meta_auto: formatMetaAuto(keys),
    auto_rescheduled: key === "schedule" ? true : task.auto_rescheduled,
  };
}

export function withoutMetaAuto(
  task: ComposerDraft,
  key: MetaAutoKey,
): ComposerDraft {
  const keys = parseMetaAuto(task.meta_auto);
  keys.delete(key);
  return {
    ...task,
    meta_auto: formatMetaAuto(keys),
    auto_rescheduled: key === "schedule" ? false : task.auto_rescheduled,
  };
}

type ComposerDraftOverrides = Partial<
  Omit<ComposerDraft, "id" | "title" | "type" | "created_at">
>;

export function buildComposerDraft({
  title,
  type,
  ...overrides
}: {
  title: string;
  type: string;
} & ComposerDraftOverrides): ComposerDraft | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  return {
    id: crypto.randomUUID(),
    usr_id: overrides.usr_id ?? null,
    parent_id: overrides.parent_id ?? null,
    after_id: overrides.after_id ?? null,
    type,
    title: trimmedTitle,
    description: overrides.description ?? null,
    est_duration: overrides.est_duration ?? null,
    date_time: overrides.date_time ?? null,
    date: overrides.date ?? null,
    starts_at: overrides.starts_at ?? null,
    due_at: overrides.due_at ?? null,
    urgency: overrides.urgency ?? null,
    impact: overrides.impact ?? null,
    recurring: overrides.recurring ?? null,
    after: overrides.after ?? null,
    location: overrides.location ?? null,
    tags: overrides.tags ?? null,
    status: overrides.status ?? null,
    created_at: new Date().toISOString(),
    completed_at: overrides.completed_at ?? null,
    auto_rescheduled: overrides.auto_rescheduled ?? null,
    meta_auto: overrides.meta_auto ?? null,
  };
}
