import type { NodeTypes } from '@xyflow/react';
import { TaskNode } from './TaskNode';
import { DecisionNode } from './DecisionNode';
import { StartEndNode } from './StartEndNode';
import { SubprocessNode } from './SubprocessNode';
import { SystemNode } from './SystemNode';
import { AnnotationNode } from './AnnotationNode';
import { DataNode, ParallelNode, TimerNode } from './ShapeNodes';

export const nodeTypes: NodeTypes = {
  start: StartEndNode,
  end: StartEndNode,
  task: TaskNode,
  decision: DecisionNode,
  subprocess: SubprocessNode,
  system: SystemNode,
  data: DataNode,
  timer: TimerNode,
  parallel: ParallelNode,
  annotation: AnnotationNode,
};
