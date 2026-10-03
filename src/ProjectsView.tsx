import { useState, type ReactNode } from "react";
import type { ComposerDraft } from "./composer";

type ProjectsViewProps = {
  projects: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, project: ComposerDraft) => ReactNode;
};

export function ProjectsView({ projects, tasks, renderChild }: ProjectsViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const toggleProject = (projectKey: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(projectKey)) next.delete(projectKey);
      else next.add(projectKey);
      return next;
    });
  };

  return (
    <div className="projects-view">
      <header className="projects-header">
        <h1 className="projects-title">Projects</h1>
        <p className="projects-subtitle">Projects and their linked tasks</p>
      </header>

      {projects.length === 0 ? (
        <p className="projects-empty">No projects yet. Name one in the composer.</p>
      ) : (
        <div className="projects-list">
          {projects.map((project) => {
            const projectKey = project.id ?? project.title;
            const children = tasks.filter(
              (task) =>
                task.parent_id != null &&
                project.id != null &&
                task.parent_id === project.id &&
                task.type !== "project",
            );
            const collapsed = collapsedIds.has(projectKey);
            return (
              <section
                key={projectKey}
                className={`projects-card${collapsed ? " is-collapsed" : ""}`}
              >
                <button
                  type="button"
                  className="projects-card-toggle"
                  aria-expanded={!collapsed}
                  onClick={() => toggleProject(projectKey)}
                >
                  <span className="projects-card-chevron" aria-hidden="true" />
                  <span className="projects-card-title">{project.title}</span>
                  <span className="projects-card-count">
                    {children.length} {children.length === 1 ? "task" : "tasks"}
                  </span>
                </button>
                {!collapsed &&
                  (children.length === 0 ? (
                    <p className="projects-card-empty">No tasks linked yet</p>
                  ) : (
                    <ul className="projects-children task-day-tasks">
                      {children.map((task) => renderChild(task, project))}
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
