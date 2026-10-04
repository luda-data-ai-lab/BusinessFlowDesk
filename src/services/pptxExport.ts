import type { Rect } from '@xyflow/react';
import { toPng } from 'html-to-image';
import type PptxGenJS from 'pptxgenjs';
import type { FlowEdge, FlowNode, FlowProject } from '../types/flow';
import type { Language } from '../i18n';
import { NODE_TYPE_MAP } from '../constants/nodeTypes';
import { ROLE_MAP } from '../constants/roles';
import { systemMatrix } from './textExport';

const PADDING = 48;
const MAX_DIMENSION = 4096;
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const STEPS_PER_SLIDE = 12;
const YES_WORDS = ['예', 'Yes'];
const DEFAULT_YES_NO = [...YES_WORDS, '아니오', 'No'];

const STR = {
  ko: {
    steps: '단계 목록',
    role: '직군',
    yes: '예',
    no: '아니오',
    dept: '담당',
    time: '소요',
    system: '시스템',
    systems: '시스템별 단계',
    noSystem: '수작업 / 시스템 없음',
    stepCount: '단계 수',
  },
  en: {
    steps: 'Steps',
    role: 'Role',
    yes: 'Yes',
    no: 'No',
    dept: 'Owner',
    time: 'Time',
    system: 'System',
    systems: 'Steps by system',
    noSystem: 'Manual / no system',
    stepCount: 'Steps',
  },
};

function isDarkMode() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function fileStem(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe =
    title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .slice(0, 60) || 'flow';
  return `${safe}_${date}`;
}

async function renderPng(
  bounds: Rect,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const el = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!el) throw new Error('Canvas not mounted');
  const rawWidth = bounds.width + PADDING * 2;
  const rawHeight = bounds.height + PADDING * 2;
  const zoom = Math.min(1, MAX_DIMENSION / rawWidth, MAX_DIMENSION / rawHeight);
  const width = Math.ceil(rawWidth * zoom);
  const height = Math.ceil(rawHeight * zoom);
  const dataUrl = await toPng(el, {
    backgroundColor: isDarkMode() ? '#0F172A' : '#F8FAFC',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${(PADDING - bounds.x) * zoom}px, ${(PADDING - bounds.y) * zoom}px) scale(${zoom})`,
    },
  });
  return { dataUrl, width, height };
}

/** Topological-ish order: BFS from start nodes, then any leftovers. */
function orderedNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1));
  const queue = nodes.filter((n) => n.data.nodeType === 'start' || incoming.get(n.id) === 0);
  const seen = new Set<string>();
  const out: FlowNode[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
    edges
      .filter((e) => e.source === n.id)
      .forEach((e) => {
        const t = byId.get(e.target);
        if (t && !seen.has(t.id)) queue.push(t);
      });
  }
  nodes.forEach((n) => {
    if (!seen.has(n.id)) out.push(n);
  });
  return out;
}

function branchText(
  node: FlowNode,
  edges: FlowEdge[],
  byId: Map<string, FlowNode>,
  lang: Language,
) {
  const s = STR[lang];
  return edges
    .filter((e) => e.source === node.id)
    .map((e) => {
      const target = byId.get(e.target)?.data.label ?? e.target;
      const raw = (typeof e.label === 'string' ? e.label : '') || e.data?.condition || '';
      const isDefault = DEFAULT_YES_NO.includes(raw);
      const cond =
        raw && !isDefault
          ? raw
          : e.sourceHandle === 'yes' || (isDefault && YES_WORDS.includes(raw))
            ? s.yes
            : e.sourceHandle === 'no' || isDefault
              ? s.no
              : '';
      return cond ? `${cond} → ${target}` : `→ ${target}`;
    })
    .join(', ');
}

export async function exportFlowAsPptx(project: FlowProject, bounds: Rect, lang: Language) {
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error('Nothing to export');
  const s = STR[lang];
  const title = project.title || 'flow';
  const roleLabel = ROLE_MAP[project.role]?.label[lang] ?? project.role;
  const { dataUrl, width, height } = await renderPng(bounds);

  const { default: PptxGen } = await import('pptxgenjs');
  const pptx = new PptxGen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title;

  // Slide 1: title + diagram
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.25,
    w: SLIDE_W - 1,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: '0F172A',
  });
  slide.addText(`${s.role}: ${roleLabel}`, {
    x: 0.5,
    y: 0.85,
    w: SLIDE_W - 1,
    h: 0.35,
    fontSize: 12,
    color: '64748B',
  });
  const areaX = 0.5;
  const areaY = 1.3;
  const areaW = SLIDE_W - 1;
  const areaH = SLIDE_H - areaY - 0.4;
  const scale = Math.min(areaW / width, areaH / height);
  const imgW = width * scale;
  const imgH = height * scale;
  slide.addImage({
    data: dataUrl,
    x: areaX + (areaW - imgW) / 2,
    y: areaY + (areaH - imgH) / 2,
    w: imgW,
    h: imgH,
  });

  // Slides 2+: step list
  const byId = new Map(project.nodes.map((n) => [n.id, n]));
  const steps = orderedNodes(project.nodes, project.edges).filter(
    (n) => n.data.nodeType !== 'annotation',
  );
  const pages = Math.max(1, Math.ceil(steps.length / STEPS_PER_SLIDE));
  for (let p = 0; p < pages; p++) {
    const chunk = steps.slice(p * STEPS_PER_SLIDE, (p + 1) * STEPS_PER_SLIDE);
    const sl = pptx.addSlide();
    sl.addText(pages > 1 ? `${s.steps} (${p + 1}/${pages})` : s.steps, {
      x: 0.5,
      y: 0.25,
      w: SLIDE_W - 1,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: '0F172A',
    });
    const rows: PptxGenJS.TableRow[] = [
      [
        '#',
        lang === 'ko' ? '단계' : 'Step',
        lang === 'ko' ? '유형' : 'Type',
        s.dept,
        s.system,
        s.time,
        lang === 'ko' ? '다음' : 'Next',
      ].map((text) => ({
        text,
        options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' }, fontSize: 11 },
      })),
    ];
    chunk.forEach((n, i) => {
      const idx = p * STEPS_PER_SLIDE + i + 1;
      const desc = n.data.description ? `\n${n.data.description}` : '';
      rows.push([
        { text: String(idx), options: { fontSize: 10, align: 'center' } },
        { text: `${n.data.label}${desc}`, options: { fontSize: 10 } },
        {
          text: NODE_TYPE_MAP[n.data.nodeType]?.label[lang] ?? n.data.nodeType,
          options: { fontSize: 10 },
        },
        { text: n.data.department ?? '', options: { fontSize: 10 } },
        { text: n.data.system ?? '', options: { fontSize: 10 } },
        { text: n.data.estimatedTime ?? '', options: { fontSize: 10 } },
        {
          text: branchText(n, project.edges, byId, lang),
          options: { fontSize: 9, color: '475569' },
        },
      ]);
    });
    sl.addTable(rows, {
      x: 0.5,
      y: 1.0,
      w: SLIDE_W - 1,
      colW: [0.5, 3.6, 1.2, 1.5, 1.5, 1.0, 3.033],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: lang === 'ko' ? 'Malgun Gothic' : 'Calibri',
      valign: 'middle',
      autoPage: false,
    });
  }

  // Optional last slide: system × steps matrix
  const matrix = systemMatrix(steps);
  if (matrix.length > 0) {
    const sl = pptx.addSlide();
    sl.addText(s.systems, {
      x: 0.5,
      y: 0.25,
      w: SLIDE_W - 1,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: '0F172A',
    });
    const stepNo = new Map(steps.map((n, i) => [n.id, i + 1]));
    const rows: PptxGenJS.TableRow[] = [
      [s.system, s.stepCount, s.steps].map((text) => ({
        text,
        options: { bold: true, color: 'FFFFFF', fill: { color: '7C3AED' }, fontSize: 11 },
      })),
    ];
    for (const row of matrix) {
      rows.push([
        { text: row.system || s.noSystem, options: { fontSize: 11, bold: true } },
        { text: String(row.nodes.length), options: { fontSize: 11, align: 'center' } },
        {
          text: row.nodes.map((n) => `${stepNo.get(n.id)}. ${n.data.label}`).join('\n'),
          options: { fontSize: 10 },
        },
      ]);
    }
    sl.addTable(rows, {
      x: 0.5,
      y: 1.0,
      w: SLIDE_W - 1,
      colW: [2.8, 1.2, 8.333],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: lang === 'ko' ? 'Malgun Gothic' : 'Calibri',
      valign: 'top',
      autoPage: true,
    });
  }

  await pptx.writeFile({ fileName: `${fileStem(title)}.pptx` });
}
