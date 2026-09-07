import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { createTaskDraft, type TaskDraft } from "./task";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7 7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreVertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="6" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="18" r="1.8" fill="currentColor" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
      <path
        d="m21 15-4.5-4.5L7 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 18v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 19V5M6 11l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4.5L15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9h6M9 13h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TasksListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 7h11M9 12h11M9 17h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 7h11M9 12h11M9 17h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 7h12M8 12h12M8 17h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 7h.01M4 12h.01M4 17h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19 8a7 7 0 0 0-12.6-3.5M5 8V4.5M5 8h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16a7 7 0 0 0 12.6 3.5M19 16v3.5M19 16h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9h12l-.8 11.2A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.8L6 9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7.5a3 3 0 0 1 6 0V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.5 13h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15 3v4h4M9 12h6M9 16h6M9 8h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const COMPOSE_KINDS = [
  { id: "task", label: "Task", placeholder: "Describe your task(s)...", Icon: TasksListIcon },
  {
    id: "project",
    label: "Project",
    placeholder: "Describe the outcome of this project...",
    Icon: MenuBarsIcon,
  },
  { id: "note", label: "Note", placeholder: "Type away...", Icon: NotesIcon },
] as const;

type ComposeKind = (typeof COMPOSE_KINDS)[number]["id"];

const PRIMARY_TABS = [
  { id: "dayline", label: "Dayline", Icon: CalendarIcon },
  { id: "tasks", label: "Tasks", Icon: MenuBarsIcon },
  { id: "notes", label: "Notes", Icon: NotesIcon },
] as const;

const MORE_OPTIONS = [
  { id: "projects", label: "Projects", Icon: ListIcon },
  { id: "routines", label: "Routines", Icon: CycleIcon },
  { id: "groceries", label: "Groceries", Icon: FoodIcon },
  { id: "recipes", label: "Recipes", Icon: RecipeIcon },
] as const;

type PrimaryTabId = (typeof PRIMARY_TABS)[number]["id"];
type MoreOptionId = (typeof MORE_OPTIONS)[number]["id"];
type ActiveView = PrimaryTabId | MoreOptionId;

const COMPOSE_KIND_BY_VIEW: Record<ActiveView, ComposeKind> = {
  dayline: "task",
  tasks: "task",
  notes: "note",
  projects: "project",
  routines: "task",
  groceries: "task",
  recipes: "task",
};

const MORE_OPTION_IDS: ReadonlySet<string> = new Set(MORE_OPTIONS.map((option) => option.id));

function formatDuration(estDuration: number | null): string {
  return estDuration == null ? "—" : `${estDuration}m`;
}

type OverlayMenuAlign = "start" | "end";

function ComposerOverlayMenu({
  open,
  anchorRef,
  menuRef,
  align = "start",
  className = "",
  "aria-label": ariaLabel,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  align?: OverlayMenuAlign;
  className?: string;
  "aria-label": string;
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const rect = anchor.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewTop = vv?.offsetTop ?? 0;
      const viewLeft = vv?.offsetLeft ?? 0;
      const viewWidth = vv?.width ?? window.innerWidth;
      const viewHeight = vv?.height ?? window.innerHeight;
      const viewBottom = viewTop + viewHeight;
      const viewRight = viewLeft + viewWidth;
      const gap = 10;
      const pad = 8;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      let left = align === "end" ? rect.right - menuWidth : rect.left;
      left = Math.min(Math.max(left, viewLeft + pad), viewRight - menuWidth - pad);

      let top = rect.top - menuHeight - gap;
      if (top < viewTop + pad) {
        top = Math.min(rect.bottom + gap, viewBottom - menuHeight - pad);
      }
      top = Math.min(Math.max(top, viewTop + pad), Math.max(viewTop + pad, viewBottom - menuHeight - pad));

      setCoords({ top, left });
    };

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", updatePosition);
    vv?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", updatePosition);
      vv?.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, menuRef, align]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`app-attach-menu app-overlay-menu${className ? ` ${className}` : ""}`}
      role="menu"
      aria-label={ariaLabel}
      style={
        coords
          ? { top: coords.top, left: coords.left }
          : { top: 0, left: 0, visibility: "hidden" }
      }
    >
      {children}
    </div>,
    document.body,
  );
}

function App() {
  const [content, setContent] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [composeKindMenuOpen, setComposeKindMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<ComposeKind>("task");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("dayline");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const composerRef = useRef<HTMLFormElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const composeKindMenuRef = useRef<HTMLDivElement>(null);
  const composeKindButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const hasText = content.length > 0;
  const moreViewActive = MORE_OPTION_IDS.has(activeView);
  const selectedComposeKind =
    COMPOSE_KINDS.find((kind) => kind.id === composeKind) ?? COMPOSE_KINDS[0];
  const SelectedComposeIcon = selectedComposeKind.Icon;

  const closeComposer = () => {
    setCollapsed(true);
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
  };

  const openComposer = () => {
    if (!content.trim()) {
      setComposeKind(COMPOSE_KIND_BY_VIEW[activeView]);
    }
    setMoreMenuOpen(false);
    setCollapsed(false);
  };

  useEffect(() => {
    if (collapsed) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (composerRef.current?.contains(target)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (composeKindMenuRef.current?.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();

      if (attachMenuOpen || composeKindMenuOpen) {
        setAttachMenuOpen(false);
        setComposeKindMenuOpen(false);
        return;
      }

      closeComposer();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [collapsed, attachMenuOpen, composeKindMenuOpen]);

  useEffect(() => {
    if (!attachMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      setAttachMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!composeKindMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (composeKindMenuRef.current?.contains(target)) return;
      if (composeKindButtonRef.current?.contains(target)) return;
      setComposeKindMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composeKindMenuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreMenuRef.current?.contains(target)) return;
      if (moreButtonRef.current?.contains(target)) return;
      setMoreMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreMenuOpen]);

  return (
    <div className="app">
      <main className="app-main">
        {tasks.length === 0 ? (
          <p className="task-list-empty">No tasks yet. Add one below.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-row">
                <p className="task-row-title">{task.title}</p>
                <div className="task-row-meta">
                  <span>{formatDuration(task.est_duration)}</span>
                  <span className="task-row-status">{task.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <form
        ref={composerRef}
        className={`app-composer${collapsed ? " is-collapsed" : ""}${attachMenuOpen ? " is-attach-open" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          const text = content.trim();
          if (!text) return;
          const task = createTaskDraft(text);
          setTasks((current) => [task, ...current]);
          setContent("");
        }}
      >
        <div className="app-tray">
          <div className="app-tray-tabs" aria-hidden={!collapsed}>
            {PRIMARY_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`app-tray-tab${activeView === id ? " is-active" : ""}`}
                onClick={() => {
                  setMoreMenuOpen(false);
                  setActiveView(id);
                }}
                tabIndex={collapsed ? 0 : -1}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
            <div className="app-tray-more">
              <ComposerOverlayMenu
                open={moreMenuOpen}
                anchorRef={moreButtonRef}
                menuRef={moreMenuRef}
                align="end"
                aria-label="More"
              >
                {MORE_OPTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`app-attach-menu-item${activeView === id ? " is-selected" : ""}`}
                    role="menuitem"
                    onClick={() => {
                      setActiveView(id);
                      setMoreMenuOpen(false);
                    }}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
              </ComposerOverlayMenu>
              <button
                ref={moreButtonRef}
                type="button"
                className={`app-tray-tab${moreViewActive || moreMenuOpen ? " is-active" : ""}`}
                onClick={() => setMoreMenuOpen((open) => !open)}
                aria-label="More"
                aria-expanded={moreMenuOpen}
                tabIndex={collapsed ? 0 : -1}
              >
                <MoreVertIcon />
                <span>More</span>
              </button>
            </div>
          </div>
        </div>

        <div className="app-composer-dock">
          {collapsed && (
            <button
              type="button"
              className="app-composer-fab app-composer-fab--toggle"
              onClick={openComposer}
              aria-label="Add"
            >
              <PlusIcon />
            </button>
          )}

          <div className="app-composer-field" aria-hidden={collapsed}>
            <button
              type="button"
              className="app-composer-collapse"
              onClick={closeComposer}
              aria-label="Collapse input"
              tabIndex={collapsed ? -1 : 0}
            >
              <CloseIcon />
            </button>
            <div className="app-composer-field-row">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={selectedComposeKind.placeholder}
                enterKeyHint="send"
                autoComplete="off"
                tabIndex={collapsed ? -1 : 0}
              />
            </div>
            <div className="app-composer-tools">
              <div className="app-composer-tools-left">
                <div className="app-composer-attach">
                  <ComposerOverlayMenu
                    open={attachMenuOpen}
                    anchorRef={attachButtonRef}
                    menuRef={attachMenuRef}
                    aria-label="Add options"
                  >
                    <button type="button" className="app-attach-menu-item" role="menuitem">
                      <CameraIcon />
                      <span>Take a picture</span>
                    </button>
                    <button type="button" className="app-attach-menu-item" role="menuitem">
                      <PhotoIcon />
                      <span>Add a photo</span>
                    </button>
                  </ComposerOverlayMenu>
                  <button
                    ref={attachButtonRef}
                    type="button"
                    className="app-composer-icon"
                    onClick={() => {
                      setComposeKindMenuOpen(false);
                      setAttachMenuOpen((open) => !open);
                    }}
                    aria-label={attachMenuOpen ? "Close add menu" : "Open add menu"}
                    aria-expanded={attachMenuOpen}
                    tabIndex={collapsed ? -1 : 0}
                  >
                    <PlusIcon />
                  </button>
                </div>
                <button
                  type="button"
                  className={`app-composer-ai${aiEnabled ? " is-on" : ""}`}
                  aria-label={aiEnabled ? "AI on" : "AI off"}
                  aria-pressed={aiEnabled}
                  onClick={() => setAiEnabled((on) => !on)}
                  tabIndex={collapsed ? -1 : 0}
                >
                  <span className="app-attach-ai-dot" aria-hidden="true" />
                  <span>{aiEnabled ? "AI on" : "AI off"}</span>
                </button>
              </div>
              <div className="app-composer-tools-center">
                {composeKind === "task" && (
                  <button type="button" className="app-composer-tool" aria-label="Time" tabIndex={collapsed ? -1 : 0}>
                    <ClockIcon />
                  </button>
                )}
                {(composeKind === "task" || composeKind === "project") && (
                  <button type="button" className="app-composer-tool" aria-label="Calendar" tabIndex={collapsed ? -1 : 0}>
                    <CalendarIcon />
                  </button>
                )}
                {(composeKind === "task" || composeKind === "note") && (
                  <button type="button" className="app-composer-tool" aria-label="Notes" tabIndex={collapsed ? -1 : 0}>
                    <NotesIcon />
                  </button>
                )}
              </div>
              <div className="app-compose-action">
                <ComposerOverlayMenu
                  open={composeKindMenuOpen}
                  anchorRef={composeKindButtonRef}
                  menuRef={composeKindMenuRef}
                  align="end"
                  className="app-compose-kind-menu"
                  aria-label="Compose type"
                >
                  {COMPOSE_KINDS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`app-attach-menu-item${composeKind === id ? " is-selected" : ""}`}
                      role="menuitem"
                      onClick={() => {
                        setComposeKind(id);
                        setComposeKindMenuOpen(false);
                      }}
                    >
                      <span className="app-compose-kind-plus" aria-hidden="true">
                        +
                      </span>
                      <Icon />
                      <span>{label}</span>
                    </button>
                  ))}
                </ComposerOverlayMenu>
                <button
                  ref={composeKindButtonRef}
                  type="button"
                  className="app-compose-kind-button"
                  aria-label="Choose compose type"
                  aria-expanded={composeKindMenuOpen}
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setComposeKindMenuOpen((open) => !open);
                  }}
                  tabIndex={collapsed ? -1 : 0}
                >
                  <SelectedComposeIcon />
                  <span>{selectedComposeKind.label}</span>
                </button>
                {hasText ? (
                  <button type="submit" className="app-composer-icon app-composer-mic" aria-label="Send" tabIndex={collapsed ? -1 : 0}>
                    <SendIcon />
                  </button>
                ) : (
                  <button type="button" className="app-composer-icon app-composer-mic" aria-label="Voice input" tabIndex={collapsed ? -1 : 0}>
                    <MicIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
