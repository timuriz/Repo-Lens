import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AnalysisEdge, AnalysisModule } from "@/types/analysis";

interface Props {
  modules: AnalysisModule[];
  edges: AnalysisEdge[];
}

function layoutNodes(modules: AnalysisModule[]): Node[] {
  const cols = Math.min(3, Math.max(1, modules.length));
  return modules.map((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: m.name,
      position: { x: col * 220, y: row * 120 },
      data: { label: m.name },
      style: {
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        fontWeight: 600,
        background: "var(--card)",
        color: "var(--card-foreground)",
        width: 180,
      },
    };
  });
}

export function ArchitectureGraph({ modules, edges }: Props) {
  const moduleNames = useMemo(() => new Set(modules.map((m) => m.name)), [modules]);

  const nodes = useMemo(() => layoutNodes(modules), [modules]);

  const flowEdges: Edge[] = useMemo(() => {
    return edges
      .filter((e) => moduleNames.has(e.from) && moduleNames.has(e.to))
      .map((e, i) => ({
        id: `e-${i}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { stroke: "var(--muted-foreground)" },
        labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
      }));
  }, [edges, moduleNames]);

  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">No modules to graph yet.</p>;
  }

  if (flowEdges.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Modules are available, but Gemini returned no usable edges between them.
        </p>
        <div className="flex flex-wrap gap-2">
          {modules.map((m) => (
            <span
              key={m.name}
              className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs font-medium"
            >
              {m.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-md border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.4}
        maxZoom={1.5}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-card" />
      </ReactFlow>
    </div>
  );
}
