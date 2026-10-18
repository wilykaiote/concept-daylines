import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type CalendarsViewProps = {
  calendars: ComposerDraft[];
  tasks: ComposerDraft[];
  onEditCalendar?: (calendar: ComposerDraft) => void;
  renderChild: (task: ComposerDraft, calendar: ComposerDraft) => ReactNode;
};

const CALENDAR_CHILD_TYPES = new Set(["event", "task", "item"]);

export function CalendarsView({
  calendars,
  tasks,
  onEditCalendar,
  renderChild,
}: CalendarsViewProps) {
  return (
    <NamedCollectionView
      title="Calendars"
      subtitle="Calendars and their events, tasks, and items"
      emptyText="No calendars yet. Name one in the composer."
      containers={calendars}
      tasks={tasks}
      childNounSingular="entry"
      childNounPlural="entries"
      emptyChildrenText="No entries linked yet"
      onEditContainer={onEditCalendar}
      isChild={(task, calendar) =>
        task.parent_id != null &&
        calendar.id != null &&
        task.parent_id === calendar.id &&
        task.type != null &&
        CALENDAR_CHILD_TYPES.has(task.type)
      }
      renderChild={renderChild}
    />
  );
}
