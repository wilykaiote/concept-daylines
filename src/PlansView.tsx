import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type PlansViewProps = {
  plans: ComposerDraft[];
  tasks: ComposerDraft[];
  renderChild: (task: ComposerDraft, plan: ComposerDraft) => ReactNode;
};

export function PlansView({ plans, tasks, renderChild }: PlansViewProps) {
  return (
    <NamedCollectionView
      title="Plans"
      subtitle="Plans and their linked tasks"
      emptyText="No plans yet. Name one in the composer."
      containers={plans}
      tasks={tasks}
      isChild={(task, plan) =>
        task.parent_id != null &&
        plan.id != null &&
        task.parent_id === plan.id &&
        task.type !== "plan" &&
        task.type !== "project" &&
        task.type !== "program"
      }
      renderChild={renderChild}
    />
  );
}
