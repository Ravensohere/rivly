import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { NixiAvatar, NixiAvatarState } from "./components/riva/NixiAvatar";

const STATES: NixiAvatarState[] = ["idle", "listening", "thinking", "speaking", "success", "error"];

function Preview() {
  const [selected, setSelected] = useState<NixiAvatarState>("idle");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ display: "flex", gap: 24 }}>
        {STATES.map((s) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <NixiAvatar state={s} size={100} />
            <span style={{ color: "#8b93a7", fontSize: 12 }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {STATES.map((s) => (
          <button key={s} onClick={() => setSelected(s)} style={{ padding: "6px 12px" }}>
            {s}
          </button>
        ))}
      </div>
      <NixiAvatar state={selected} size={180} />
      <p style={{ color: "#8b93a7", fontSize: 13 }}>Move your mouse around to see the eyes track it.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
