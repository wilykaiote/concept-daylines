import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type ListsViewProps = {
  lists: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, list: ComposerDraft) => ReactNode;
};

export function ListsView({ lists, tasks, renderChild }: ListsViewProps) {
  return (
    <NamedCollectionView
      title="Lists"
      subtitle="Lists and their items"
      emptyText="No lists yet. Name one in the composer."
      containers={lists}
      tasks={tasks}
      childNounSingular="item"
      childNounPlural="items"
      emptyChildrenText="No items linked yet"
      isChild={(task, list) =>
        task.parent_id != null &&
        list.id != null &&
        task.parent_id === list.id &&
        task.type !== "list"
      }
      renderChild={renderChild}
    />
  );
}
