"use client";

import { useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { getArrowPath, getMidpoint } from "@/lib/geometry";
import { Arrow } from "./Arrow";
import type { ConnectionStyle, Position } from "@/types";

const ARROW_COLOR_DARK = "#71717a";
const ARROW_COLOR_LIGHT = "#94a3b8";

export function ConnectionLayer() {
  const blocks = useCanvasStore((s) => s.blocks);
  const connections = useCanvasStore((s) => s.connections);
  const { isDarkMode } = useUIStore();

  const arrowColor = isDarkMode ? ARROW_COLOR_DARK : ARROW_COLOR_LIGHT;

  const arrowData = useMemo(() => {
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    return connections
      .map((conn) => {
        const from = blockMap.get(conn.fromId);
        const to = blockMap.get(conn.toId);
        if (!from || !to) return null;
        return {
          id: conn.id,
          path: getArrowPath(from, to),
          midpoint: getMidpoint(from, to),
          label: conn.label,
          connectionStyle: conn.style,
        };
      })
      .filter(Boolean) as { id: string; path: string; midpoint: Position; label: string; connectionStyle?: ConnectionStyle }[];
  }, [blocks, connections]);

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: "-10000px", top: "-10000px", width: "20000px", height: "20000px" }}
      viewBox="-10000 -10000 20000 20000"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={arrowColor}
          />
        </marker>
        <marker
          id="arrowhead-start"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto-start-reverse"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={arrowColor}
          />
        </marker>
        <marker
          id="blocker"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <line x1="1" y1="1" x2="9" y2="9" stroke="#ef4444" strokeWidth="2" />
          <line x1="9" y1="1" x2="1" y2="9" stroke="#ef4444" strokeWidth="2" />
        </marker>
      </defs>
      {arrowData.map((arrow) => (
        <Arrow
          key={arrow.id}
          id={arrow.id}
          pathData={arrow.path}
          midpoint={arrow.midpoint}
          label={arrow.label}
          stroke={arrowColor}
          isDarkMode={isDarkMode}
          connectionStyle={arrow.connectionStyle}
        />
      ))}
    </svg>
  );
}
