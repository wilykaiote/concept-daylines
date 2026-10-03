import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type RoutinesViewProps = {
  routines: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, routine: ComposerDraft) => ReactNode;
};

export function RoutinesView({ routines, tasks, renderChild }: RoutinesViewProps) {
  return (
    <NamedCollectionView
      title="Groups"
      subtitle="Named groups and the tasks under them"
      emptyText="No groups yet. Name one in the composer."
      containers={routines}
      tasks={tasks}
      isChild={(task, routine) =>
        task.parent_id != null && routine.id != null && task.parent_id === routine.id
      }
      renderChild={renderChild}
    />
  );
}
