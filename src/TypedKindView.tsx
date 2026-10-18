import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";

type TypedKindViewProps = {
  title: string;
  emptyText: string;
  items: ComposerDraft[];
  renderRow: (task: ComposerDraft) => ReactNode;
};

export function TypedKindView({
  title,
  emptyText,
  items,
  renderRow,
}: TypedKindViewProps) {
  return (
    <div className="named-view typed-kind-view">
      <header className="named-header">
        <h1 className="named-title">{title}</h1>
      </header>
      {items.length === 0 ? (
        <p className="named-empty">{emptyText}</p>
      ) : (
        <ul className="typed-kind-list task-day-tasks">{items.map(renderRow)}</ul>
      )}
    </div>
  );
}
