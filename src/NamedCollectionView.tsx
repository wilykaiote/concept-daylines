import { useState, type ReactNode } from "react";
import type { ComposerDraft } from "./composer";
import { hasMetaAuto } from "./composer";
import { parseTaskDate, parseTimeOfDay, taskDurationMinutes } from "./calendarTimeline";
import { dedupeSeriesClosestToNow } from "./recurring";
import { formatTaskScheduleMetaLabel } from "./taskRowMeta";

const IMPACT_MAX = 50;
const URGENCY_OPTIONS = ["Future", "Later", "Soon", "ASAP"] as const;

function formatEstTotalLabel(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function planTypeLabel(type: string | null | undefined): string {
  if (type === "project") return "PROJECT";
  if (type === "program") return "PROGRAM";
  return "PLAN";
}

type NamedCollectionViewProps = {
  title: string;
  subtitle: string;
  emptyText: string;
  containers: ComposerDraft[];
  tasks: ComposerDraft[];
  childNounSingular?: string;
  childNounPlural?: string;
  emptyChildrenText?: string;
  /** When true, show one occurrence per recurring series (closest to now). */
  dedupeSeries?: boolean;
  now?: Date;
  isChild?: (task: ComposerDraft, container: ComposerDraft) => boolean;
  onEditContainer?: (container: ComposerDraft) => void;
  /** When set, show est total + Home-style progress + plan meta (Plans). */
  getCompletedCount?: (container: ComposerDraft) => number;
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
  dedupeSeries = false,
  now = new Date(),
  isChild,
  onEditContainer,
  getCompletedCount,
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

  const showProgress = getCompletedCount != null;

  return (
    <div className="named-view">
      <header className="named-header">
        <h1 className="named-title">{title}</h1>
        <p className="named-subtitle">{subtitle}</p>
      </header>

      {containers.length === 0 ? (
        <p className="named-empty">{emptyText}</p>
      ) : (
        <div className="named-list">
          {containers.map((container) => {
            const containerKey = container.id ?? container.title;
            const rawChildren = tasks.filter((task) => matchesChild(task, container));
            const children = dedupeSeries
              ? dedupeSeriesClosestToNow(rawChildren, now)
              : rawChildren;
            const collapsed = collapsedIds.has(containerKey);
            const countLabel = `${children.length} ${
              children.length === 1 ? childNounSingular : childNounPlural
            }`;
            const estMinutes = showProgress
              ? children.reduce((sum, task) => sum + taskDurationMinutes(task), 0)
              : 0;
            const estLabel = showProgress ? formatEstTotalLabel(estMinutes) : null;
            const openCount = children.length;
            const completedCount = showProgress
              ? Math.min(openCount, Math.max(0, getCompletedCount(container)))
              : 0;
            const segmentCount = Math.max(1, openCount);

            const scheduleLabel = showProgress
              ? formatTaskScheduleMetaLabel(container, now)
              : null;
            const urgencyLabel =
              showProgress &&
              container.urgency != null &&
              (URGENCY_OPTIONS as readonly string[]).includes(container.urgency)
                ? container.urgency
                : null;
            const hasDateOrTime =
              parseTaskDate(container.date) != null ||
              parseTimeOfDay(container.starts_at) != null ||
              parseTimeOfDay(container.due_at) != null;
            const showUrgency = urgencyLabel != null && !hasDateOrTime;
            const impactValue =
              showProgress &&
              typeof container.impact === "number" &&
              Number.isFinite(container.impact)
                ? Math.round(container.impact)
                : null;
            const impactPercent =
              impactValue != null
                ? Math.min(100, Math.max(0, (impactValue / IMPACT_MAX) * 100))
                : null;
            const hasImpact = impactValue != null && impactPercent != null;
            const scheduleAuto =
              hasMetaAuto(container, "schedule") &&
              container.recurring == null;
            const urgencyAuto = hasMetaAuto(container, "urgency");
            const impactAuto = hasMetaAuto(container, "impact");
            const typeAuto = hasMetaAuto(container, "type");

            const titleLine = (
              <div className="named-card-title-line">
                <span className="named-card-title">{container.title}</span>
                {estLabel != null && (
                  <span className="named-card-est">{estLabel}</span>
                )}
              </div>
            );

            const planMeta = showProgress ? (
              <div className="named-card-meta task-row-top">
                <span className="task-row-top-meta">
                  {scheduleLabel != null ? (
                    <span
                      className={`task-row-schedule${scheduleAuto ? " is-auto" : ""}`}
                    >
                      {scheduleLabel}
                    </span>
                  ) : showUrgency ? (
                    <span
                      className={`task-row-urgency${urgencyAuto ? " is-auto" : ""}`}
                    >
                      {urgencyLabel}
                    </span>
                  ) : null}
                </span>
                <span className="named-card-meta-trailing">
                  {hasImpact && (
                    <span
                      className={`task-row-impact${impactAuto ? " is-auto" : ""}`}
                      role="img"
                      aria-label={`Impact ${impactValue} of ${IMPACT_MAX}`}
                      title={`Impact ${impactValue}`}
                    >
                      <span className="task-row-impact-track" aria-hidden="true">
                        <span
                          className="task-row-impact-fill"
                          style={{ width: `${impactPercent}%` }}
                        />
                      </span>
                    </span>
                  )}
                  <span
                    className={`task-row-type-label${typeAuto ? " is-auto" : ""}`}
                  >
                    {planTypeLabel(container.type)}
                  </span>
                </span>
              </div>
            ) : null;

            const headerInner = (
              <>
                {planMeta}
                {titleLine}
              </>
            );

            return (
              <section
                key={containerKey}
                className={`named-card${collapsed ? " is-collapsed" : ""}`}
              >
                {onEditContainer != null ? (
                  <button
                    type="button"
                    className="named-card-title-btn"
                    onClick={() => onEditContainer(container)}
                  >
                    {headerInner}
                  </button>
                ) : (
                  <div className="named-card-title-row named-card-title-static">
                    {headerInner}
                  </div>
                )}
                {showProgress && (
                  <div
                    className="named-card-progress"
                    aria-label={`${completedCount} of ${openCount} tasks completed`}
                  >
                    <div className="named-card-progress-bar" aria-hidden="true">
                      {Array.from({ length: segmentCount }, (_, index) => (
                        <span
                          key={index}
                          className={`named-card-progress-seg${
                            openCount > 0 && index < completedCount ? " is-done" : ""
                          }`}
                        />
                      ))}
                    </div>
                    <span className="named-card-progress-count">
                      {completedCount} / {openCount}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="named-card-toggle"
                  aria-expanded={!collapsed}
                  aria-label={
                    collapsed ? `Show ${countLabel}` : `Hide ${countLabel}`
                  }
                  onClick={() => toggleContainer(containerKey)}
                >
                  <span className="named-card-chevron" aria-hidden="true" />
                  <span className="named-card-count">{countLabel}</span>
                </button>
                {!collapsed &&
                  (children.length === 0 ? (
                    <p className="named-card-empty">{emptyChildrenText}</p>
                  ) : (
                    <ul className="named-children task-day-tasks">
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
