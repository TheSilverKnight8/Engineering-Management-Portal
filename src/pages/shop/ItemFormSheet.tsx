import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tools } from '../../content/tools';
import type { InventoryItem, ToolStatus } from '../../lib/types';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { keys, useInventory } from '../../lib/queries';
import { Sheet } from '../../components/Sheet';
import { Button, Field, Input, Segmented, Select, Textarea } from '../../components/ui';

const MAX_AT_ONCE = 50;

// "Cordless Drill #2" → "Cordless Drill"
const baseName = (n: string) => n.trim().replace(/\s*#\d+$/, '');

/**
 * Names for several of the same tool: the base name plus a number, starting
 * after the highest number already in the inventory ("#3" if #1 and #2 exist).
 */
function numberedNames(base: string, count: number, existing: string[]) {
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} #(\\d+)$`, 'i');
  const highest = existing.reduce((m, n) => Math.max(m, Number(pattern.exec(n.trim())?.[1] ?? 0)), 0);
  return Array.from({ length: count }, (_, i) => `${base} #${highest + i + 1}`);
}

interface Props {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem;
  /** Pre-select a tool type when adding from a tool entry. */
  presetSlug?: string;
  onSaved?: (item: InventoryItem) => void;
}

export function ItemFormSheet({ open, onClose, item, presetSlug, onSaved }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ToolStatus>('operational');
  const [statusNote, setStatusNote] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('1');
  const inventory = useInventory();
  const count = item ? 1 : Math.min(MAX_AT_ONCE, Math.max(1, Math.floor(Number(quantity)) || 1));
  const names = useMemo(
    () => (count > 1 ? numberedNames(baseName(name), count, (inventory.data ?? []).map((i) => i.name)) : [name.trim()]),
    [count, name, inventory.data],
  );

  useEffect(() => {
    if (!open) return;
    const preset = tools.find((t) => t.slug === presetSlug);
    setName(item?.name ?? preset?.name ?? '');
    setSlug(item?.tool_slug ?? preset?.slug ?? '');
    setLocation(item?.location ?? '');
    setStatus(item?.status ?? 'operational');
    setStatusNote(item?.status_note ?? '');
    setNotes(item?.notes ?? '');
    setQuantity('1');
  }, [open, item, presetSlug]);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        tool_slug: slug || null,
        location: location.trim() || null,
        status,
        status_note: status === 'needs_maintenance' ? statusNote.trim() || null : null,
        notes: notes.trim() || null,
      };
      if (item) {
        const { data, error } = await db().from('inventory_items').update({ ...row, name: name.trim() }).eq('id', item.id).select().single();
        if (error) throw error;
        return [data as InventoryItem];
      }
      // Several of the same tool go in one request; each still gets its own changelog entry.
      const { data, error } = await db()
        .from('inventory_items')
        .insert(names.map((n) => ({ ...row, name: n })))
        .select();
      if (error) throw error;
      return data as InventoryItem[];
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: keys.inventory });
      void qc.invalidateQueries({ queryKey: ['log'] });
      if (item) toast('Saved. The change is in the changelog.');
      else if (saved.length === 1) toast(`${saved[0].name} is in the inventory.`);
      else toast(`Added ${saved.length} tools: ${saved[0].name} to ${saved[saved.length - 1].name}.`);
      if (saved.length === 1) onSaved?.(saved[0]);
      onClose();
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.name}` : count > 1 ? `Add ${count} tools to the inventory` : 'Add a tool to the inventory'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="item-form" loading={save.isPending} disabled={!name.trim()}>
            {item ? 'Save' : count > 1 ? `Add ${count} tools` : 'Add tool'}
          </Button>
        </div>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-4 pt-1">
        <Field label="Tool type" htmlFor="slug" hint="Links this tool to its entry in the tool library.">
          <Select
            id="slug"
            value={slug}
            onChange={(e) => {
              const next = e.target.value;
              const t = tools.find((x) => x.slug === next);
              const prev = tools.find((x) => x.slug === slug);
              if (t && (!name.trim() || name === prev?.name)) setName(t.name);
              setSlug(next);
            }}
          >
            <option value="">Other (not in the library)</option>
            {tools.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        {!item && (
          <Field label="How many" htmlFor="qty" hint={`Add up to ${MAX_AT_ONCE} of the same tool at once. They share the details below and get numbered names.`}>
            <Input id="qty" type="number" inputMode="numeric" min={1} max={MAX_AT_ONCE} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-28" />
          </Field>
        )}
        <Field
          label="Name"
          htmlFor="name"
          hint={
            count > 1
              ? `They will be named ${names.length > 3 ? `${names[0]}, ${names[1]}, … ${names[names.length - 1]}` : names.join(', ')}.`
              : 'If the shop has more than one, add a number: “Cordless Drill #2”.'
          }
        >
          <Input id="name" required maxLength={count > 1 ? 76 : 80} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Location" htmlFor="loc">
          <Input id="loc" maxLength={80} placeholder="Where it is kept" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Status">
          <Segmented
            className="w-full"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'operational', label: 'Operational' },
              { value: 'needs_maintenance', label: 'Needs maintenance' },
            ]}
          />
        </Field>
        {status === 'needs_maintenance' && (
          <Field label="What is wrong?" htmlFor="sn">
            <Textarea id="sn" maxLength={500} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="For example: the belt slips" />
          </Field>
        )}
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Sheet>
  );
}
