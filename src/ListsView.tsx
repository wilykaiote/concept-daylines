import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type ListsViewProps = {
  lists: ComposerDraft[];
  tasks: ComposerDraft[];
  onEditList?: (list: ComposerDraft) => void;
  renderChild: (task: ComposerDraft, list: ComposerDraft) => ReactNode;
};

export function ListsView({ lists, tasks, onEditList, renderChild }: ListsViewProps) {
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
      onEditContainer={onEditList}
      isChild={(task, list) =>
        task.type === "item" &&
        task.parent_id != null &&
        list.id != null &&
        task.parent_id === list.id
      }
      renderChild={renderChild}
    />
  );
}
