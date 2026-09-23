import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '../../hooks/useFlowStore';
import { isNodeType } from '../../constants/nodeTypes';
import { useT } from '../../i18n';
import { nodeTypes } from './CustomNodes';
import { ConditionalEdge } from './CustomEdges/ConditionalEdge';
import { Toolbar } from './Toolbar';
import { MiniMap } from './MiniMap';
import { SwimlaneLayer } from './SwimlaneLayer';
import { useFitFlow } from '../../hooks/useFitFlow';

const edgeTypes: EdgeTypes = { conditional: ConditionalEdge };

export const DND_MIME = 'application/bfd-node-type';

interface FlowCanvasProps {
  readOnly?: boolean;
}

function CanvasInner({ readOnly = false }: FlowCanvasProps) {
  const t = useT();
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const selectNode = useFlowStore((s) => s.selectNode);
  const selectEdge = useFlowStore((s) => s.selectEdge);
  const openTemplates = useFlowStore((s) => s.setTemplateGalleryOpen);
  const isGenerating = useFlowStore((s) => s.isGenerating);
  const fitViewToken = useFlowStore((s) => s.fitViewToken);
  const { screenToFlowPosition } = useReactFlow();
  const fitFlow = useFitFlow();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => fitFlow(fitViewToken === 0 ? 0 : 400), 50);
    return () => window.clearTimeout(id);
  }, [fitViewToken, fitFlow]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (readOnly) return;
      const type = e.dataTransfer.getData(DND_MIME);
      if (!type || !isNodeType(type)) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position);
    },
    [addNode, readOnly, screenToFlowPosition],
  );

  const onSelectionChange = useCallback(
    ({ nodes: sel, edges: selEdges }: OnSelectionChangeParams) => {
      if (sel.length > 0) selectNode(sel[0].id);
      else if (selEdges.length > 0) selectEdge(selEdges[0].id);
      else {
        selectNode(null);
        selectEdge(null);
      }
    },
    [selectNode, selectEdge],
  );

  return (
    <div ref={wrapper} className="relative h-full w-full bg-surface dark:bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        selectionMode={SelectionMode.Partial}
        panOnScroll={false}
        zoomOnScroll
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        defaultEdgeOptions={{ type: 'conditional' }}
        proOptions={{ hideAttribution: true }}
        className="bfd-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          className="!bg-surface dark:!bg-slate-900"
          color="#CBD5E1"
        />
        <SwimlaneLayer />
        <Panel position="top-center" className="!m-3">
          <Toolbar readOnly={readOnly} />
        </Panel>
        <MiniMap />
        {nodes.length === 0 && !isGenerating && (
          <Panel position="top-center" className="!mt-24 max-w-md text-center">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
              <div className="mb-2 text-3xl">🗺️</div>
              {t('emptyCanvas')}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => openTemplates(true)}
                  className="mt-3 block w-full rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  🧩 {t('emptyOrTemplate')}
                </button>
              )}
            </div>
          </Panel>
        )}
        {isGenerating && (
          <Panel position="top-center" className="pointer-events-none !mt-24">
            <GeneratingSkeleton />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function GeneratingSkeleton() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-200 bg-white/90 px-8 py-6 shadow-lg dark:border-violet-900 dark:bg-slate-800/90">
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="h-10 w-20 animate-pulse rounded-lg bg-violet-200 dark:bg-violet-900"
              style={{ animationDelay: `${i * 120}ms` }}
            />
            {i < 3 && <div className="h-0.5 w-6 bg-violet-300 dark:bg-violet-800" />}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-secondary dark:text-violet-300">{t('generating')}</p>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
