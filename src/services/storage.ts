import type { FlowProject } from '../types/flow';
import type { RoleType } from '../types/role';

export const PROJECTS_KEY = 'bfd_projects';
export const LAST_PROJECT_KEY = 'bfd_last_project';
export const ROLE_KEY = 'bfd_role';
export const ONBOARDED_KEY = 'bfd_onboarded';
export const PROJECT_WARN_THRESHOLD = 10;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProjects(): FlowProject[] {
  const list = safeParse<FlowProject[]>(localStorage.getItem(PROJECTS_KEY), []);
  return Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string') : [];
}

export function saveProjects(projects: FlowProject[]): boolean {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch (err) {
    console.warn('[bfd] localStorage write failed (quota?)', err);
    return false;
  }
}

export function upsertProject(project: FlowProject): FlowProject[] {
  const projects = loadProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx === -1) projects.unshift(project);
  else projects[idx] = project;
  saveProjects(projects);
  localStorage.setItem(LAST_PROJECT_KEY, project.id);
  return projects;
}

export function removeProject(id: string): FlowProject[] {
  const projects = loadProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  if (localStorage.getItem(LAST_PROJECT_KEY) === id) localStorage.removeItem(LAST_PROJECT_KEY);
  return projects;
}

export function loadLastProject(): FlowProject | null {
  const projects = loadProjects();
  const lastId = localStorage.getItem(LAST_PROJECT_KEY);
  return projects.find((p) => p.id === lastId) ?? projects[0] ?? null;
}

export function loadRole(): RoleType | null {
  const role = localStorage.getItem(ROLE_KEY);
  return role ? (role as RoleType) : null;
}

export function saveRole(role: RoleType) {
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(ONBOARDED_KEY, '1');
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === '1';
}

export function estimateStorageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('bfd_')) continue;
    total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return total * 2; // UTF-16
}
