import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type CollectionsViewProps = {
  collections: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, collection: ComposerDraft) => ReactNode;
};

export function CollectionsView({ collections, tasks, renderChild }: CollectionsViewProps) {
  return (
    <NamedCollectionView
      title="Collections"
      subtitle="Named collections and the tasks under them"
      emptyText="No collections yet. Name one in the composer."
      containers={collections}
      tasks={tasks}
      isChild={(task, collection) =>
        task.parent_id != null && collection.id != null && task.parent_id === collection.id
      }
      renderChild={renderChild}
    />
  );
}
