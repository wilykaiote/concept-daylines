export type ComposerDraft = {
  id: string | null;
  usr_id: string | null;
  parent_id: string | null;
  after_id: string | null;
  type: string | null;
  title: string;
  description: string | null;
  est_duration: number | null;
  date_time: string | null;
  urgency: string | null;
  impact: number | null;
  recurring: string | null;
  after: string | null;
  location: string | null;
  tags: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
};

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
    urgency: overrides.urgency ?? null,
    impact: overrides.impact ?? null,
    recurring: overrides.recurring ?? null,
    after: overrides.after ?? null,
    location: overrides.location ?? null,
    tags: overrides.tags ?? null,
    status: overrides.status ?? null,
    created_at: new Date().toISOString(),
    completed_at: overrides.completed_at ?? null,
  };
}
