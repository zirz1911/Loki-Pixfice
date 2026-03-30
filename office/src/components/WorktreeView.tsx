/**
 * WorktreeView — shows git worktrees for the current repo.
 * Data from GET /api/worktrees (server runs `git worktree list --porcelain`).
 *
 * Pixfice style: inline styles only (no Tailwind className).
 */

import { useEffect, useState } from "react";

interface Worktree {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
  prunable: boolean;
}

interface WorktreeViewProps {
  /** Optional accent color (e.g. agent dotColor) */
  accentColor?: string;
  /** Optional max height for the list */
  maxHeight?: number | string;
}

export function WorktreeView({ accentColor = "#89b4fa", maxHeight = 280 }: WorktreeViewProps) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/worktrees");
        const data = await res.json();
        if (!cancelled) {
          setWorktrees(data.worktrees || []);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Refresh every 10s
    const interval = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const borderColor = `${accentColor}40`;
  const dimColor = "#2a3a50";

  return (
    <div style={{
      background: "#07080f",
      border: `1px solid ${borderColor}`,
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 12,
      color: "#cdd6f4",
    }}>
      {/* Header */}
      <div style={{
        background: "#0a0b16",
        borderBottom: `1px solid ${borderColor}`,
        padding: "6px 12px",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 8,
      }}>
        <span style={{ color: accentColor }}>WORKTREES</span>
        {!loading && (
          <span style={{ color: dimColor, fontSize: 7 }}>
            {worktrees.length} total
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxHeight, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: "10px 12px", color: dimColor, fontSize: 11 }}>
            loading...
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: "10px 12px", color: "#f38ba8", fontSize: 11 }}>
            {error}
          </div>
        )}

        {!loading && !error && worktrees.length === 0 && (
          <div style={{ padding: "10px 12px", color: dimColor, fontSize: 11 }}>
            no worktrees found
          </div>
        )}

        {!loading && !error && worktrees.map((wt, i) => {
          const isMain = i === 0;
          const label = wt.path.split("/").pop() || wt.path;
          const branchShort = wt.branch.replace("refs/heads/", "").replace("agents/", "");
          const accentBright = isMain ? accentColor : `${accentColor}99`;

          return (
            <div
              key={wt.path}
              title={wt.path}
              style={{
                padding: "7px 12px",
                borderBottom: i < worktrees.length - 1 ? `1px solid ${borderColor}` : "none",
                display: "flex", alignItems: "flex-start", gap: 10,
                background: isMain ? "#0d0e1a" : "transparent",
              }}
            >
              {/* Status dot */}
              <span style={{
                width: 6, height: 6,
                background: wt.prunable ? "#f38ba8" : accentBright,
                flexShrink: 0,
                marginTop: 3,
                display: "block",
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Path label */}
                <div style={{
                  color: isMain ? "#e0e8ff" : "#a6adc8",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {label}
                  {isMain && (
                    <span style={{
                      marginLeft: 6, fontSize: 7, color: accentColor,
                      background: `${accentColor}18`, padding: "1px 4px",
                      border: `1px solid ${accentColor}40`,
                    }}>
                      MAIN
                    </span>
                  )}
                  {wt.prunable && (
                    <span style={{
                      marginLeft: 6, fontSize: 7, color: "#f38ba8",
                      background: "#f38ba818", padding: "1px 4px",
                      border: "1px solid #f38ba840",
                    }}>
                      PRUNABLE
                    </span>
                  )}
                </div>

                {/* Branch + commit */}
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  {wt.branch && (
                    <span style={{ fontSize: 10, color: accentBright, opacity: 0.85 }}>
                      {branchShort || wt.branch}
                    </span>
                  )}
                  {wt.bare && (
                    <span style={{ fontSize: 10, color: dimColor }}>bare</span>
                  )}
                  {wt.head && (
                    <span style={{ fontSize: 10, color: dimColor, fontFamily: "monospace" }}>
                      {wt.head}
                    </span>
                  )}
                </div>

                {/* Full path (smaller) */}
                <div style={{
                  fontSize: 9, color: dimColor,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginTop: 1,
                }}>
                  {wt.path}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
