import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type NotebooksViewProps = {
  notebooks: ComposerDraft[];
  tasks: ComposerDraft[];
  onEditNotebook?: (notebook: ComposerDraft) => void;
  renderChild: (task: ComposerDraft, notebook: ComposerDraft) => ReactNode;
};

export function NotebooksView({
  notebooks,
  tasks,
  onEditNotebook,
  renderChild,
}: NotebooksViewProps) {
  return (
    <NamedCollectionView
      title="Notebooks"
      subtitle="Notebooks and their notes"
      emptyText="No notebooks yet. Name one in the composer."
      containers={notebooks}
      tasks={tasks}
      childNounSingular="note"
      childNounPlural="notes"
      emptyChildrenText="No notes linked yet"
      onEditContainer={onEditNotebook}
      isChild={(task, notebook) =>
        task.type === "note" &&
        task.parent_id != null &&
        notebook.id != null &&
        task.parent_id === notebook.id
      }
      renderChild={renderChild}
    />
  );
}
