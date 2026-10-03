import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type ProjectsViewProps = {
  projects: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, project: ComposerDraft) => ReactNode;
};

export function ProjectsView({ projects, tasks, renderChild }: ProjectsViewProps) {
  return (
    <NamedCollectionView
      title="Projects"
      subtitle="Projects and their linked tasks"
      emptyText="No projects yet. Name one in the composer."
      containers={projects}
      tasks={tasks}
      isChild={(task, project) =>
        task.parent_id != null &&
        project.id != null &&
        task.parent_id === project.id &&
        task.type !== "project"
      }
      renderChild={renderChild}
    />
  );
}
