/* Walkthrough panel. Long-press the status bar on any screen to open it.
   Lets you set the outcome of each branch (so the unhappy paths are
   reachable) and jump straight to any screen. */
import React from "react";
import { BRANCHES, PRESETS, SCREEN_GROUPS, useFlow } from "./FlowConfig";

export default function DevPanel() {
  const { config, setConfig, setBranch, reset, open, setOpen, goTo } = useFlow();
  if (!open) return null;

  const activePreset = PRESETS.find((p) =>
    Object.entries(p.config).every(([k, v]) => config[k] === v)
  );

  return (
    <div className="dev-panel-backdrop" onClick={() => setOpen(false)}>
      <aside
        className="dev-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Flow options"
      >
        <header className="dev-panel-head">
          <h2>Flow options</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="dev-panel-body">
          <section>
            <p className="dev-panel-label">Scenarios</p>
            <div className="dev-chips">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  className={`dev-chip${activePreset === p ? " is-active" : ""}`}
                  onClick={() => setConfig({ ...config, ...p.config })}
                >
                  {p.label}
                </button>
              ))}
              <button type="button" className="dev-chip dev-chip--ghost" onClick={reset}>
                Reset
              </button>
            </div>
          </section>

          {BRANCHES.map((b) => (
            <section key={b.key}>
              <p className="dev-panel-label">{b.label}</p>
              <p className="dev-panel-help">{b.help}</p>
              <div className="dev-seg">
                {b.options.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    className={`dev-seg-item${config[b.key] === o.value ? " is-active" : ""}`}
                    onClick={() => setBranch(b.key, o.value)}
                  >
                    {o.label}
                    {o.hint && <em>{o.hint}</em>}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section>
            <p className="dev-panel-label">Jump to screen</p>
            {SCREEN_GROUPS.map((g) => (
              <div className="dev-group" key={g.title}>
                <p className="dev-group-title">{g.title}</p>
                <div className="dev-links">
                  {g.screens.map(([id, name]) => (
                    <button type="button" key={id} className="dev-link" onClick={() => goTo(id)}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </aside>
    </div>
  );
}
