export type TaskDraft = {
  id: string;
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
  status: string;
  created_at: string;
};

export function createTaskDraft(title: string): TaskDraft {
  return {
    id: crypto.randomUUID(),
    parent_id: null,
    after_id: null,
    type: null,
    title,
    description: null,
    est_duration: null,
    date_time: null,
    urgency: null,
    impact: null,
    recurring: null,
    after: null,
    location: null,
    tags: null,
    status: "draft",
    created_at: new Date().toISOString(),
  };
}
