import { useState, type ReactNode } from "react";
import type { ComposerDraft } from "./composer";

type NamedCollectionViewProps = {
  title: string;
  subtitle: string;
  emptyText: string;
  containers: ComposerDraft[];
  tasks: ComposerDraft[];
  childNounSingular?: string;
  childNounPlural?: string;
  emptyChildrenText?: string;
  isChild?: (task: ComposerDraft, container: ComposerDraft) => boolean;
  renderChild: (task: ComposerDraft, container: ComposerDraft) => ReactNode;
};

export function NamedCollectionView({
  title,
  subtitle,
  emptyText,
  containers,
  tasks,
  childNounSingular = "task",
  childNounPlural = "tasks",
  emptyChildrenText = "No tasks linked yet",
  isChild,
  renderChild,
}: NamedCollectionViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const toggleContainer = (containerKey: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(containerKey)) next.delete(containerKey);
      else next.add(containerKey);
      return next;
    });
  };

  const matchesChild =
    isChild ??
    ((task: ComposerDraft, container: ComposerDraft) =>
      task.parent_id != null &&
      container.id != null &&
      task.parent_id === container.id &&
      task.id !== container.id);

  return (
    <div className="projects-view">
      <header className="projects-header">
        <h1 className="projects-title">{title}</h1>
        <p className="projects-subtitle">{subtitle}</p>
      </header>

      {containers.length === 0 ? (
        <p className="projects-empty">{emptyText}</p>
      ) : (
        <div className="projects-list">
          {containers.map((container) => {
            const containerKey = container.id ?? container.title;
            const children = tasks.filter((task) => matchesChild(task, container));
            const collapsed = collapsedIds.has(containerKey);
            return (
              <section
                key={containerKey}
                className={`projects-card${collapsed ? " is-collapsed" : ""}`}
              >
                <button
                  type="button"
                  className="projects-card-toggle"
                  aria-expanded={!collapsed}
                  onClick={() => toggleContainer(containerKey)}
                >
                  <span className="projects-card-chevron" aria-hidden="true" />
                  <span className="projects-card-title">{container.title}</span>
                  <span className="projects-card-count">
                    {children.length}{" "}
                    {children.length === 1 ? childNounSingular : childNounPlural}
                  </span>
                </button>
                {!collapsed &&
                  (children.length === 0 ? (
                    <p className="projects-card-empty">{emptyChildrenText}</p>
                  ) : (
                    <ul className="projects-children task-day-tasks">
                      {children.map((task) => renderChild(task, container))}
                    </ul>
                  ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
