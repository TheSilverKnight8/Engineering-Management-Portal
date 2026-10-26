import { tools } from '../../content/tools';
import type { LogEntry } from '../../lib/types';
import { dayLabel, formatTime } from '../../lib/time';

const verbs: Record<LogEntry['action'], string> = {
  'item.created': 'added',
  'item.updated': 'updated',
  'item.archived': 'archived',
  'item.restored': 'restored',
  'checkout.created': 'checked out',
  'checkout.updated': 'changed a checkout of',
  'checkout.returned': 'returned',
  'checkout.canceled': 'canceled a checkout of',
};

const fieldLabels: Record<string, string> = {
  name: 'Name',
  tool_slug: 'Tool type',
  location: 'Location',
  status: 'Status',
  status_note: 'Status note',
  notes: 'Notes',
  borrower: 'For',
  note: 'Note',
  starts_at: 'Starts',
  ends_at: 'Ends',
};

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'status') return value === 'operational' ? 'Operational' : 'Needs maintenance';
  if (field === 'tool_slug') return tools.find((t) => t.slug === value)?.name ?? String(value);
  if (field === 'starts_at' || field === 'ends_at') {
    const d = new Date(String(value));
    return `${dayLabel(d)} ${formatTime(d)}`;
  }
  return String(value);
}

export interface LogDetail {
  label: string;
  from: string | null;
  to: string;
}

export function describeLog(e: LogEntry): { verb: string; details: LogDetail[] } {
  const created = e.action === 'item.created' || e.action === 'checkout.created';
  const details = Object.entries(e.changes ?? {})
    .filter(([f]) => !(created && f === 'name'))
    .map(([f, c]) => ({ label: fieldLabels[f] ?? f, from: created ? null : show(f, c.from), to: show(f, c.to) }));
  return { verb: verbs[e.action] ?? e.action, details };
}
