import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import type { FlowProject } from '../types/flow';

const PADDING = 48;
const MAX_DIMENSION = 8192;

function fileStem(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe =
    title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .slice(0, 60) || 'flow';
  return `${safe}_${date}`;
}

function getViewportElement(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!el) throw new Error('Canvas not mounted');
  return el;
}

function computeFrame(nodes: Node[]) {
  const bounds = getNodesBounds(nodes);
  const width = Math.min(MAX_DIMENSION, Math.ceil(bounds.width + PADDING * 2));
  const height = Math.min(MAX_DIMENSION, Math.ceil(bounds.height + PADDING * 2));
  const viewport = getViewportForBounds(bounds, width, height, 0.1, 4, PADDING);
  return { width, height, viewport };
}

function isDarkMode() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export async function exportFlowAsPng(nodes: Node[], title: string) {
  if (nodes.length === 0) throw new Error('Nothing to export');
  const { width, height, viewport } = computeFrame(nodes);
  const dataUrl = await toPng(getViewportElement(), {
    backgroundColor: isDarkMode() ? '#0F172A' : '#F8FAFC',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
  saveAs(dataUrl, `${fileStem(title)}.png`);
}

export async function exportFlowAsSvg(nodes: Node[], title: string) {
  if (nodes.length === 0) throw new Error('Nothing to export');
  const { width, height, viewport } = computeFrame(nodes);
  const dataUrl = await toSvg(getViewportElement(), {
    backgroundColor: isDarkMode() ? '#0F172A' : '#F8FAFC',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
  const blob = await (await fetch(dataUrl)).blob();
  saveAs(blob, `${fileStem(title)}.svg`);
}

export function exportFlowAsJson(project: FlowProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  saveAs(blob, `${fileStem(project.title)}.json`);
}

export function readProjectFile(file: File): Promise<FlowProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<FlowProject>;
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error('Invalid flow file');
        }
        resolve(parsed as FlowProject);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
