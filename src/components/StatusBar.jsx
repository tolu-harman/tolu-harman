/* Shared iOS status bar. Lives here rather than in main.jsx so the hearing-test
   screens can use the same one — they previously had no status bar at all,
   which left their content sitting where the system bar should be. */
import React, { useEffect, useRef, useState } from "react";
import { useFlow } from "./FlowConfig";

const ASSET = "./assets/";

export function formatStatusTime() {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export default function StatusBar({ light = false }) {
  const [time, setTime] = useState(formatStatusTime);
  const { setOpen } = useFlow();
  const press = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatStatusTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  /* Hidden entry point to the walkthrough panel: long-press the status bar.
     Deliberately not a visible control so it stays out of the way in demos. */
  const start = () => {
    press.current = window.setTimeout(() => setOpen(true), 600);
  };
  const cancel = () => {
    if (press.current) window.clearTimeout(press.current);
    press.current = null;
  };

  return (
    <div
      className={`status-bar${light ? " status-bar-light" : ""}`}
      aria-hidden="true"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
    >
      <span>{time}</span>
      <div className="status-icons">
        <img src={`${ASSET}status-cellular.svg`} alt="" />
        <img src={`${ASSET}status-wifi.svg`} alt="" />
        <img src={`${ASSET}status-battery.svg`} alt="" />
      </div>
    </div>
  );
}
