export type RoleType = 'operations' | 'pm' | 'developer' | 'executive' | 'consultant';

export interface RoleDefinition {
  id: RoleType;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
  accent: string;
}
