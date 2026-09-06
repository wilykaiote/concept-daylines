import { useState } from "react";
import "./App.css";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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

const TABS = ["Tab 1", "Tab 2", "Tab 3"] as const;

function App() {
  const [content, setContent] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const hasText = content.length > 0;

  return (
    <div className="app">
      <main className="app-main" />

      <form
        className={`app-composer${collapsed ? " is-collapsed" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
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
            onClick={() => setCollapsed((open) => !open)}
            aria-label={collapsed ? "Add" : "Collapse input"}
          >
            {collapsed ? <PlusIcon /> : <MenuIcon />}
          </button>

          <div className="app-composer-field" aria-hidden={collapsed}>
            <button
              type="button"
              className="app-composer-icon"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse input"
              tabIndex={collapsed ? -1 : 0}
            >
              <CollapseIcon />
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
      </form>
    </div>
  );
}

export default App;
