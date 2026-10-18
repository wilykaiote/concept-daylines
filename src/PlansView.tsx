import type { ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { NamedCollectionView } from "./NamedCollectionView";

type PlansViewProps = {
  plans: ComposerDraft[];
  tasks: ComposerDraft[];
  now?: Date;
  onEditPlan?: (plan: ComposerDraft) => void;
  getCompletedCount?: (plan: ComposerDraft) => number;
  renderChild: (task: ComposerDraft, plan: ComposerDraft) => ReactNode;
};

export function PlansView({
  plans,
  tasks,
  now,
  onEditPlan,
  getCompletedCount,
  renderChild,
}: PlansViewProps) {
  return (
    <NamedCollectionView
      title="Plans"
      subtitle="Plans and their linked tasks"
      emptyText="No plans yet. Name one in the composer."
      containers={plans}
      tasks={tasks}
      dedupeSeries
      now={now}
      onEditContainer={onEditPlan}
      getCompletedCount={getCompletedCount}
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
