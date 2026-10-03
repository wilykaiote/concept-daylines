import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type ProgramsViewProps = {
  programs: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, program: ComposerDraft) => ReactNode;
};

export function ProgramsView({ programs, tasks, renderChild }: ProgramsViewProps) {
  return (
    <NamedCollectionView
      title="Programs"
      subtitle="Programs and their linked tasks"
      emptyText="No programs yet. Name one in the composer."
      containers={programs}
      tasks={tasks}
      isChild={(task, program) =>
        task.parent_id != null &&
        program.id != null &&
        task.parent_id === program.id &&
        task.type !== "program"
      }
      renderChild={renderChild}
    />
  );
}
