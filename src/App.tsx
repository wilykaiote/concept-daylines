import { useEffect, useRef, useState } from "react";
import "./App.css";
import { createTaskDraft, type TaskDraft } from "./task";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
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

const TABS = ["Tab 1", "Tab 2", "Tab 3"] as const;

function formatDuration(estDuration: number | null): string {
  return estDuration == null ? "—" : `${estDuration}m`;
}

function App() {
  const [content, setContent] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const hasText = content.length > 0;

  const closeComposer = () => {
    setCollapsed(true);
    setAttachMenuOpen(false);
  };

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
            {TABS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`app-tray-tab${activeTab === index ? " is-active" : ""}`}
                onClick={() => setActiveTab(index)}
                tabIndex={collapsed ? 0 : -1}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="app-composer-dock">
          <button
            type="button"
            className={`app-composer-fab app-composer-fab--toggle${collapsed ? "" : " is-menu"}`}
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
              } else {
                closeComposer();
              }
            }}
            aria-label={collapsed ? "Add" : "Collapse input"}
          >
            {collapsed ? <PlusIcon /> : <MenuIcon />}
          </button>

          {!collapsed && attachMenuOpen && (
            <div ref={attachMenuRef} className="app-attach-menu" role="menu" aria-label="Add options">
              <button type="button" className="app-attach-menu-item" role="menuitem">
                <CameraIcon />
                <span>Take a picture</span>
              </button>
              <button type="button" className="app-attach-menu-item" role="menuitem">
                <PhotoIcon />
                <span>Add a photo</span>
              </button>
              <button
                type="button"
                className="app-attach-menu-item"
                role="menuitem"
                aria-pressed={aiEnabled}
                onClick={() => setAiEnabled((on) => !on)}
              >
                <span className={`app-attach-ai-dot${aiEnabled ? " is-on" : ""}`} aria-hidden="true" />
                <span>{aiEnabled ? "AI on" : "AI off"}</span>
              </button>
            </div>
          )}

          <div className="app-composer-field" aria-hidden={collapsed}>
            <div className="app-composer-field-row">
              <button
                ref={attachButtonRef}
                type="button"
                className="app-composer-icon"
                onClick={() => setAttachMenuOpen((open) => !open)}
                aria-label={attachMenuOpen ? "Close add menu" : "Open add menu"}
                aria-expanded={attachMenuOpen}
                tabIndex={collapsed ? -1 : 0}
              >
                <PlusIcon />
              </button>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your task(s)..."
                enterKeyHint="send"
                autoComplete="off"
                tabIndex={collapsed ? -1 : 0}
              />
            </div>
            <div className="app-composer-tools">
              <button type="button" className="app-composer-tool" aria-label="Time" tabIndex={collapsed ? -1 : 0}>
                <ClockIcon />
              </button>
              <button type="button" className="app-composer-tool" aria-label="Calendar" tabIndex={collapsed ? -1 : 0}>
                <CalendarIcon />
              </button>
              <button type="button" className="app-composer-tool" aria-label="Notes" tabIndex={collapsed ? -1 : 0}>
                <NotesIcon />
              </button>
              <div className="app-composer-tools-spacer" />
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
      </form>
    </div>
  );
}

export default App;
