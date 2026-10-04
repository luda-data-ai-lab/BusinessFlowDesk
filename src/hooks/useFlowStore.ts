import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import type {
  AIFlowResponse,
  FlowEdge,
  FlowEdgeData,
  FlowNode,
  FlowNodeData,
  FlowProject,
  LaneBy,
  LayoutDirection,
  NodeType,
} from '../types/flow';
import type { RoleType } from '../types/role';
import type { Language } from '../i18n';
import { DEFAULT_ROLE } from '../constants/roles';
import { NODE_TYPE_MAP } from '../constants/nodeTypes';
import { layoutFlow } from '../utils/layoutEngine';
import { computeLanes, laneAtPosition, sizeOf } from '../utils/swimlanes';
import { newId, parseAIFlow, toAIFlow } from '../utils/flowParser';
import { generateFlow } from '../services/ai/generateFlow';
import type { BusinessSystem } from '../types/system';
import {
  canonicalSystemName,
  loadSystems,
  newSystemId,
  nextSystemColor,
  saveSystems,
} from '../services/systemCatalog';
import { modifyFlow } from '../services/ai/modifyFlow';
import {
  isOnboarded,
  loadLastProject,
  loadProjects,
  loadRole,
  removeProject,
  saveRole,
  upsertProject,
} from '../services/storage';

function canonicalizeSystems<T extends { nodes: FlowNode[] }>(
  parsed: T,
  systems: BusinessSystem[],
): T {
  if (systems.length === 0) return parsed;
  return {
    ...parsed,
    nodes: parsed.nodes.map((n) =>
      n.data.system
        ? { ...n, data: { ...n.data, system: canonicalSystemName(systems, n.data.system) } }
        : n,
    ),
  };
}

const HISTORY_LIMIT = 100;

interface Snapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
  swimlanes: boolean;
  laneBy: LaneBy;
}

export interface FlowState {
  projectId: string;
  projectTitle: string;
  createdAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  currentRole: RoleType;
  layoutDirection: LayoutDirection;
  swimlanes: boolean;
  laneBy: LaneBy;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isGenerating: boolean;
  error: string | null;
  notice: string | null;
  lastGenerationWasMock: boolean;
  needsOnboarding: boolean;
  projects: FlowProject[];
  history: Snapshot[];
  historyIndex: number;
  /** Increments whenever a fresh generation/import/load happens so the canvas re-fits. */
  fitViewToken: number;

  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setRole: (role: RoleType) => void;
  completeOnboarding: (role: RoleType) => void;
  setProjectTitle: (title: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  addNode: (type: NodeType, position: XYPosition) => string;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeData: (id: string, data: Partial<FlowNodeData>) => void;
  changeNodeType: (id: string, type: NodeType) => void;
  updateEdge: (id: string, patch: { label?: string; style?: FlowEdgeData['style'] }) => void;
  generateFromPrompt: (prompt: string, language: Language) => Promise<void>;
  modifyWithPrompt: (prompt: string, language: Language) => Promise<void>;
  cancelGeneration: () => void;
  autoLayout: (direction?: LayoutDirection) => void;
  toggleDirection: () => void;
  toggleSwimlanes: () => void;
  /** Enable lanes grouped by `by`; null turns swimlanes off. */
  setSwimlanes: (by: LaneBy | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  newProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importProject: (project: FlowProject) => void;
  /** Starts a new project from a template flow (already localized). */
  applyTemplate: (flow: AIFlowResponse) => void;
  templateGalleryOpen: boolean;
  setTemplateGalleryOpen: (open: boolean) => void;
  /** System catalog shared by every flow in this browser. */
  systems: BusinessSystem[];
  systemCatalogOpen: boolean;
  setSystemCatalogOpen: (open: boolean) => void;
  addSystem: (
    input: Omit<BusinessSystem, 'id' | 'color'> & { color?: string },
  ) => BusinessSystem | null;
  updateSystem: (id: string, patch: Partial<Omit<BusinessSystem, 'id'>>) => void;
  removeSystem: (id: string) => void;
  /** Registers every system name used in the current flow that isn't in the catalog yet. */
  registerSystemsFromFlow: () => number;
  testScenarioOpen: boolean;
  setTestScenarioOpen: (open: boolean) => void;
  toProject: () => FlowProject;
  refreshProjects: () => void;
  clearError: () => void;
  clearNotice: () => void;
}

let abortController: AbortController | null = null;
let dragSnapshotTaken = false;

function nowIso() {
  return new Date().toISOString();
}

function blankProject(
  role: RoleType,
): Pick<
  FlowState,
  | 'projectId'
  | 'projectTitle'
  | 'createdAt'
  | 'nodes'
  | 'edges'
  | 'layoutDirection'
  | 'swimlanes'
  | 'laneBy'
  | 'currentRole'
> {
  return {
    projectId: newId('flow'),
    projectTitle: '',
    createdAt: nowIso(),
    nodes: [],
    edges: [],
    layoutDirection: 'TB',
    swimlanes: false,
    laneBy: 'department',
    currentRole: role,
  };
}

function initialState() {
  const savedRole = loadRole();
  const last = loadLastProject();
  const role = last?.role ?? savedRole ?? DEFAULT_ROLE;
  const base = last
    ? {
        projectId: last.id,
        projectTitle: last.title,
        createdAt: last.createdAt,
        nodes: last.nodes ?? [],
        edges: last.edges ?? [],
        layoutDirection: last.layoutDirection ?? 'TB',
        swimlanes: last.swimlanes ?? false,
        laneBy: last.laneBy ?? 'department',
        currentRole: role,
      }
    : blankProject(role);
  return { ...base, projects: loadProjects(), needsOnboarding: !isOnboarded() && !savedRole };
}

export const useFlowStore = create<FlowState>((set, get) => {
  const pushHistory = () => {
    const { nodes, edges, swimlanes, laneBy, history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push({ nodes, edges, swimlanes, laneBy });
    const overflow = Math.max(0, trimmed.length - HISTORY_LIMIT);
    set({ history: trimmed.slice(overflow), historyIndex: trimmed.length - 1 - overflow });
  };

  const applySnapshot = (snap: Snapshot, index: number) => {
    set({
      nodes: snap.nodes,
      edges: snap.edges,
      swimlanes: snap.swimlanes,
      laneBy: snap.laneBy,
      historyIndex: index,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  };

  const applyGenerated = (
    flow: ReturnType<typeof parseAIFlow>,
    mock: boolean,
    keepExisting: boolean,
  ) => {
    const { layoutDirection, swimlanes, laneBy, projectTitle } = get();
    const laidOut = layoutFlow(flow.nodes, flow.edges, {
      direction: layoutDirection,
      respectPinned: keepExisting && !swimlanes,
      swimlanes,
      laneBy,
    });
    pushHistory();
    set({
      nodes: laidOut,
      edges: flow.edges,
      projectTitle: projectTitle || flow.title || '',
      isGenerating: false,
      lastGenerationWasMock: mock,
      notice: mock ? 'mock' : null,
      selectedNodeId: null,
      selectedEdgeId: null,
      fitViewToken: get().fitViewToken + 1,
    });
  };

  return {
    ...initialState(),
    selectedNodeId: null,
    selectedEdgeId: null,
    isGenerating: false,
    error: null,
    notice: null,
    lastGenerationWasMock: false,
    history: [],
    historyIndex: -1,
    fitViewToken: 0,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
      const removing = changes.some((c) => c.type === 'remove');
      const dragStart = changes.some((c) => c.type === 'position' && c.dragging === true);
      const dragEnd = changes.some((c) => c.type === 'position' && c.dragging === false);

      if (removing) pushHistory();
      if (dragStart && !dragSnapshotTaken) {
        pushHistory();
        dragSnapshotTaken = true;
      }
      if (dragEnd) dragSnapshotTaken = false;

      let nodes = applyNodeChanges(changes, get().nodes);
      if (dragEnd) {
        const moved = new Set<string>();
        for (const c of changes) if (c.type === 'position' && c.dragging === false) moved.add(c.id);
        const { swimlanes, laneBy, layoutDirection } = get();
        const lanes = swimlanes
          ? computeLanes(
              nodes.filter((n) => !moved.has(n.id)),
              layoutDirection,
              laneBy,
            )
          : [];
        nodes = nodes.map((n) => {
          if (!moved.has(n.id)) return n;
          let data = n.data.pinned ? n.data : { ...n.data, pinned: true };
          if (lanes.length > 0) {
            const { width, height } = sizeOf(n);
            const lane = laneAtPosition(
              lanes,
              { x: n.position.x + width / 2, y: n.position.y + height / 2 },
              layoutDirection,
            );
            if (lane && lane.key !== (data[laneBy]?.trim() ?? '')) {
              data = { ...data, [laneBy]: lane.key || undefined };
            }
          }
          return data === n.data ? n : { ...n, data };
        });
      }
      let selectedNodeId: string | null | undefined;
      for (const c of changes) {
        if (c.type === 'select' && c.selected) selectedNodeId = c.id;
        if (c.type === 'remove' && c.id === get().selectedNodeId) selectedNodeId = null;
      }
      set({
        nodes,
        ...(selectedNodeId !== undefined ? { selectedNodeId } : {}),
        ...(selectedNodeId ? { selectedEdgeId: null } : {}),
      });
    },

    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === 'remove')) pushHistory();
      let selectedEdgeId: string | undefined;
      for (const c of changes) if (c.type === 'select' && c.selected) selectedEdgeId = c.id;
      set({
        edges: applyEdgeChanges(changes, get().edges),
        ...(selectedEdgeId ? { selectedEdgeId, selectedNodeId: null } : {}),
      });
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target)
        return;
      pushHistory();
      const edge: FlowEdge = {
        id: newId('e'),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'conditional',
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        data: { style: 'solid' },
      };
      set({ edges: addEdge(edge, get().edges) });
    },

    setRole: (role) => {
      saveRole(role);
      set({ currentRole: role });
    },

    completeOnboarding: (role) => {
      saveRole(role);
      set({ currentRole: role, needsOnboarding: false });
    },

    setProjectTitle: (projectTitle) => set({ projectTitle }),
    selectNode: (id) =>
      set({ selectedNodeId: id, selectedEdgeId: id ? null : get().selectedEdgeId }),
    selectEdge: (id) =>
      set({ selectedEdgeId: id, selectedNodeId: id ? null : get().selectedNodeId }),

    addNode: (type, position) => {
      pushHistory();
      const id = newId();
      const def = NODE_TYPE_MAP[type];
      const node: FlowNode = {
        id,
        type,
        position,
        data: { label: def.label.ko, nodeType: type, pinned: true },
        selected: true,
      };
      set({
        nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), node],
        selectedNodeId: id,
        selectedEdgeId: null,
      });
      return id;
    },

    deleteNode: (id) => {
      pushHistory();
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      });
    },

    deleteEdge: (id) => {
      pushHistory();
      set({
        edges: get().edges.filter((e) => e.id !== id),
        selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
      });
    },

    updateNodeData: (id, data) => {
      const { nodes, edges, swimlanes, laneBy, layoutDirection } = get();
      pushHistory();
      const updated = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
      const prev = nodes.find((n) => n.id === id);
      const laneChanged =
        swimlanes &&
        laneBy in data &&
        (data[laneBy]?.trim() ?? '') !== (prev?.data[laneBy]?.trim() ?? '');
      set({
        nodes: laneChanged
          ? layoutFlow(updated, edges, {
              direction: layoutDirection,
              respectPinned: false,
              swimlanes: true,
              laneBy,
            })
          : updated,
      });
    },

    changeNodeType: (id, type) => {
      pushHistory();
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, type, data: { ...n.data, nodeType: type, color: undefined } } : n,
        ),
      });
    },

    updateEdge: (id, patch) => {
      pushHistory();
      set({
        edges: get().edges.map((e) =>
          e.id === id
            ? {
                ...e,
                label: patch.label !== undefined ? patch.label || undefined : e.label,
                data: {
                  ...e.data,
                  condition:
                    patch.label !== undefined ? patch.label || undefined : e.data?.condition,
                  style: patch.style ?? e.data?.style ?? 'solid',
                },
              }
            : e,
        ),
      });
    },

    generateFromPrompt: async (prompt, language) => {
      abortController?.abort();
      abortController = new AbortController();
      set({ isGenerating: true, error: null, notice: null });
      try {
        const result = await generateFlow(
          prompt,
          get().currentRole,
          language,
          abortController.signal,
          get().systems.map((s) => s.name),
        );
        const parsed = canonicalizeSystems(parseAIFlow(result.flow), get().systems);
        applyGenerated(
          { ...parsed, title: parsed.title ?? prompt.slice(0, 40) },
          result.mock,
          false,
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        set({ isGenerating: false, error: err instanceof Error ? err.message : String(err) });
      }
    },

    modifyWithPrompt: async (prompt, language) => {
      const { nodes, edges, projectTitle, currentRole } = get();
      if (nodes.length === 0) return get().generateFromPrompt(prompt, language);
      abortController?.abort();
      abortController = new AbortController();
      set({ isGenerating: true, error: null, notice: null });
      try {
        const result = await modifyFlow(
          prompt,
          currentRole,
          toAIFlow(nodes, edges, projectTitle),
          language,
          abortController.signal,
          get().systems.map((s) => s.name),
        );
        const parsed = canonicalizeSystems(parseAIFlow(result.flow, nodes), get().systems);
        applyGenerated(parsed, result.mock, true);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        set({ isGenerating: false, error: err instanceof Error ? err.message : String(err) });
      }
    },

    cancelGeneration: () => {
      abortController?.abort();
      abortController = null;
      set({ isGenerating: false });
    },

    autoLayout: (direction) => {
      const { nodes, edges, layoutDirection, swimlanes, laneBy } = get();
      if (nodes.length === 0) return;
      pushHistory();
      const dir = direction ?? layoutDirection;
      const directionChanged = dir !== layoutDirection;
      const respectPinned = !directionChanged && !swimlanes;
      const input = respectPinned
        ? nodes
        : nodes.map((n) => ({ ...n, data: { ...n.data, pinned: false } }));
      set({
        nodes: layoutFlow(input, edges, { direction: dir, respectPinned, swimlanes, laneBy }),
        layoutDirection: dir,
        fitViewToken: get().fitViewToken + 1,
      });
    },

    toggleSwimlanes: () => {
      const { swimlanes, laneBy } = get();
      get().setSwimlanes(swimlanes ? null : laneBy);
    },

    setSwimlanes: (by) => {
      const { nodes, edges, layoutDirection, swimlanes, laneBy } = get();
      const next = by !== null;
      const nextBy = by ?? laneBy;
      if (next === swimlanes && nextBy === laneBy) return;
      if (nodes.length === 0) {
        set({ swimlanes: next, laneBy: nextBy });
        return;
      }
      pushHistory();
      const unpinned = nodes.map((n) => ({ ...n, data: { ...n.data, pinned: false } }));
      set({
        swimlanes: next,
        laneBy: nextBy,
        nodes: layoutFlow(unpinned, edges, {
          direction: layoutDirection,
          respectPinned: false,
          swimlanes: next,
          laneBy: nextBy,
        }),
        fitViewToken: get().fitViewToken + 1,
      });
    },

    toggleDirection: () => {
      const next: LayoutDirection = get().layoutDirection === 'TB' ? 'LR' : 'TB';
      get().autoLayout(next);
    },

    undo: () => {
      const { history, historyIndex, nodes, edges, swimlanes, laneBy } = get();
      if (historyIndex < 0) return;
      // When at the tip, stash the current state so redo can return to it.
      if (historyIndex === history.length - 1) {
        const withCurrent = [...history, { nodes, edges, swimlanes, laneBy }];
        set({ history: withCurrent });
      }
      applySnapshot(history[historyIndex], historyIndex - 1);
    },

    redo: () => {
      const { history, historyIndex } = get();
      const nextIndex = historyIndex + 2;
      if (nextIndex >= history.length) return;
      applySnapshot(history[nextIndex], nextIndex - 1);
    },

    canUndo: () => get().historyIndex >= 0,
    canRedo: () => get().historyIndex + 2 < get().history.length,

    newProject: () => {
      set({
        ...blankProject(get().currentRole),
        selectedNodeId: null,
        selectedEdgeId: null,
        history: [],
        historyIndex: -1,
        error: null,
        notice: null,
        fitViewToken: get().fitViewToken + 1,
      });
    },

    loadProject: (id) => {
      const project = get().projects.find((p) => p.id === id);
      if (!project) return;
      set({
        projectId: project.id,
        projectTitle: project.title,
        createdAt: project.createdAt,
        nodes: project.nodes,
        edges: project.edges,
        layoutDirection: project.layoutDirection ?? 'TB',
        swimlanes: project.swimlanes ?? false,
        laneBy: project.laneBy ?? 'department',
        currentRole: project.role,
        selectedNodeId: null,
        selectedEdgeId: null,
        history: [],
        historyIndex: -1,
        error: null,
        notice: null,
        fitViewToken: get().fitViewToken + 1,
      });
      localStorage.setItem('bfd_last_project', project.id);
    },

    deleteProject: (id) => {
      const projects = removeProject(id);
      set({ projects });
      if (get().projectId === id) get().newProject();
    },

    importProject: (project) => {
      const imported: FlowProject = {
        ...project,
        id: newId('flow'),
        title: project.title || '',
        role: project.role ?? get().currentRole,
        layoutDirection: project.layoutDirection ?? 'TB',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: 1,
      };
      const projects = upsertProject(imported);
      set({ projects });
      get().loadProject(imported.id);
    },

    templateGalleryOpen: false,
    setTemplateGalleryOpen: (open) => set({ templateGalleryOpen: open }),

    systems: loadSystems(),
    systemCatalogOpen: false,
    setSystemCatalogOpen: (open) => set({ systemCatalogOpen: open }),
    addSystem: (input) => {
      const name = input.name.trim();
      const { systems } = get();
      if (!name || systems.some((s) => s.name.toLowerCase() === name.toLowerCase())) return null;
      const system: BusinessSystem = {
        id: newSystemId(),
        name,
        category: input.category,
        description: input.description?.trim() || undefined,
        owner: input.owner?.trim() || undefined,
        color: input.color ?? nextSystemColor(systems),
      };
      const next = [...systems, system];
      saveSystems(next);
      set({ systems: next });
      return system;
    },
    updateSystem: (id, patch) => {
      const { systems, nodes } = get();
      const prev = systems.find((s) => s.id === id);
      if (!prev) return;
      const name = patch.name?.trim() || prev.name;
      const next = systems.map((s) => (s.id === id ? { ...s, ...patch, name } : s));
      saveSystems(next);
      const renamed = name !== prev.name;
      set({
        systems: next,
        nodes: renamed
          ? nodes.map((n) =>
              n.data.system?.trim().toLowerCase() === prev.name.toLowerCase()
                ? { ...n, data: { ...n.data, system: name } }
                : n,
            )
          : nodes,
      });
    },
    removeSystem: (id) => {
      const next = get().systems.filter((s) => s.id !== id);
      saveSystems(next);
      set({ systems: next });
    },
    registerSystemsFromFlow: () => {
      const { nodes, systems, addSystem } = get();
      const names = [
        ...new Set(nodes.map((n) => n.data.system?.trim()).filter(Boolean)),
      ] as string[];
      let added = 0;
      for (const name of names) {
        if (systems.some((s) => s.name.toLowerCase() === name.toLowerCase())) continue;
        if (addSystem({ name, category: 'other' })) added++;
      }
      return added;
    },
    testScenarioOpen: false,
    setTestScenarioOpen: (open) => set({ testScenarioOpen: open }),

    applyTemplate: (flow) => {
      get().newProject();
      const parsed = parseAIFlow(flow);
      const { layoutDirection } = get();
      set({
        nodes: layoutFlow(parsed.nodes, parsed.edges, { direction: layoutDirection }),
        edges: parsed.edges,
        projectTitle: flow.title ?? '',
        templateGalleryOpen: false,
        fitViewToken: get().fitViewToken + 1,
      });
    },

    toProject: () => {
      const {
        projectId,
        projectTitle,
        currentRole,
        nodes,
        edges,
        layoutDirection,
        swimlanes,
        laneBy,
        createdAt,
      } = get();
      return {
        id: projectId,
        title: projectTitle,
        role: currentRole,
        nodes,
        edges,
        layoutDirection,
        swimlanes,
        laneBy,
        createdAt,
        updatedAt: nowIso(),
        version: 1,
      };
    },

    refreshProjects: () => set({ projects: loadProjects() }),
    clearError: () => set({ error: null }),
    clearNotice: () => set({ notice: null }),
  };
});

// Autosave: debounce 1s after node/edge/title/role changes.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useFlowStore.subscribe((state, prev) => {
  if (
    state.nodes === prev.nodes &&
    state.edges === prev.edges &&
    state.projectTitle === prev.projectTitle &&
    state.currentRole === prev.currentRole &&
    state.layoutDirection === prev.layoutDirection &&
    state.swimlanes === prev.swimlanes &&
    state.laneBy === prev.laneBy
  ) {
    return;
  }
  if (state.nodes.length === 0 && state.edges.length === 0 && !state.projectTitle) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const projects = upsertProject(useFlowStore.getState().toProject());
    useFlowStore.setState({ projects });
  }, 1000);
});
