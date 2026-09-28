import { MarkerType } from '@xyflow/react';
import type { FlowEdge, FlowNode, FlowProject } from '../types/flow';

const HASH_KEY = 'share';
const VERSION = '1';

/** Minimal, position-preserving payload embedded in share URLs. */
interface SharePayload {
  v: string;
  t: string;
  r: FlowProject['role'];
  d: FlowProject['layoutDirection'];
  s?: boolean;
  n: Array<Pick<FlowNode, 'id' | 'type' | 'position' | 'data'>>;
  e: Array<
    Pick<FlowEdge, 'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle' | 'label' | 'data'>
  >;
}

function toPayload(project: FlowProject): SharePayload {
  return {
    v: VERSION,
    t: project.title,
    r: project.role,
    d: project.layoutDirection,
    s: project.swimlanes || undefined,
    n: project.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data,
    })),
    e: project.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      label: e.label,
      data: e.data,
    })),
  };
}

function fromPayload(p: SharePayload): FlowProject {
  const now = new Date().toISOString();
  return {
    id: '',
    title: p.t ?? '',
    role: p.r,
    layoutDirection: p.d === 'LR' ? 'LR' : 'TB',
    swimlanes: Boolean(p.s),
    nodes: p.n.map((n) => ({ ...n })),
    edges: p.e.map((e) => ({
      ...e,
      type: 'conditional',
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    })),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const canCompress = typeof CompressionStream !== 'undefined';

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const blob = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(blob).arrayBuffer());
}

async function encode(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (!canCompress) return 'r.' + bytesToBase64Url(bytes);
  return 'z.' + bytesToBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
}

async function decode(token: string): Promise<string> {
  const [mode, body] = token.split('.', 2);
  if (!body) throw new Error('Malformed share link');
  const bytes = base64UrlToBytes(body);
  if (mode === 'r') return new TextDecoder().decode(bytes);
  if (mode === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser cannot decode link');
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  }
  throw new Error('Unknown share link format');
}

export async function buildShareUrl(project: FlowProject): Promise<string> {
  const token = await encode(JSON.stringify(toPayload(project)));
  const url = new URL(window.location.href);
  url.hash = `${HASH_KEY}=${token}`;
  return url.toString();
}

export function hasShareHash(hash = window.location.hash): boolean {
  return new RegExp(`^#${HASH_KEY}=`).test(hash);
}

export async function readShareHash(hash = window.location.hash): Promise<FlowProject | null> {
  if (!hasShareHash(hash)) return null;
  const token = hash.slice(HASH_KEY.length + 2);
  const parsed = JSON.parse(await decode(token)) as Partial<SharePayload>;
  if (parsed.v !== VERSION || !Array.isArray(parsed.n) || !Array.isArray(parsed.e)) {
    throw new Error('Invalid share link');
  }
  return fromPayload(parsed as SharePayload);
}

export function clearShareHash() {
  if (!hasShareHash()) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
