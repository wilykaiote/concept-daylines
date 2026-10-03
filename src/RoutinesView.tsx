import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";

type RoutinesViewProps = {
  routines: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, routine: ComposerDraft) => ReactNode;
};

export function RoutinesView({ routines, tasks, renderChild }: RoutinesViewProps) {
  return (
    <div className="routines-view">
      <header className="routines-header">
        <h1 className="routines-title">Groups</h1>
        <p className="routines-subtitle">Named groups and the tasks under them</p>
      </header>

      {routines.length === 0 ? (
        <p className="routines-empty">No groups yet. Name one in the composer.</p>
      ) : (
        <div className="routines-list">
          {routines.map((routine) => {
            const children = tasks.filter(
              (task) => task.parent_id != null && task.parent_id === routine.id,
            );
            return (
              <section key={routine.id ?? routine.title} className="routines-card">
                <div className="routines-card-head">
                  <h2 className="routines-card-title">{routine.title}</h2>
                  <span className="routines-card-count">
                    {children.length} {children.length === 1 ? "task" : "tasks"}
                  </span>
                </div>
                {children.length === 0 ? (
                  <p className="routines-card-empty">No tasks linked yet</p>
                ) : (
                  <ul className="routines-children task-day-tasks">
                    {children.map((task) => renderChild(task, routine))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
