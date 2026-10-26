import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tools } from '../../content/tools';
import type { InventoryItem, ToolStatus } from '../../lib/types';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { keys } from '../../lib/queries';
import { Sheet } from '../../components/Sheet';
import { Button, Field, Input, Segmented, Select, Textarea } from '../../components/ui';

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

  useEffect(() => {
    if (!open) return;
    const preset = tools.find((t) => t.slug === presetSlug);
    setName(item?.name ?? preset?.name ?? '');
    setSlug(item?.tool_slug ?? preset?.slug ?? '');
    setLocation(item?.location ?? '');
    setStatus(item?.status ?? 'operational');
    setStatusNote(item?.status_note ?? '');
    setNotes(item?.notes ?? '');
  }, [open, item, presetSlug]);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        name: name.trim(),
        tool_slug: slug || null,
        location: location.trim() || null,
        status,
        status_note: status === 'needs_maintenance' ? statusNote.trim() || null : null,
        notes: notes.trim() || null,
      };
      const q = item ? db().from('inventory_items').update(row).eq('id', item.id) : db().from('inventory_items').insert(row);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as InventoryItem;
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: keys.inventory });
      void qc.invalidateQueries({ queryKey: ['log'] });
      toast(item ? 'Saved. The change is in the changelog.' : `${saved.name} is in the inventory.`);
      onSaved?.(saved);
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
      title={item ? `Edit ${item.name}` : 'Add a tool to the inventory'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="item-form" loading={save.isPending} disabled={!name.trim()}>
            {item ? 'Save' : 'Add tool'}
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
        <Field label="Name" htmlFor="name" hint="If the shop has more than one, add a number: “Cordless Drill #2”.">
          <Input id="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
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
