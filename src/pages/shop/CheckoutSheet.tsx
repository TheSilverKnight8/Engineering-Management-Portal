import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, TriangleAlert } from 'lucide-react';
import type { Checkout, InventoryItem } from '../../lib/types';
import { db } from '../../lib/supabase';
import { useMe } from '../../lib/auth';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { formatWindow, roundUpToQuarterHour, toLocalInput } from '../../lib/time';
import { Sheet } from '../../components/Sheet';
import { Button, Field, Input, Textarea, cx } from '../../components/ui';

const presets = [
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day', minutes: 60 * 24 },
  { label: '1 week', minutes: 60 * 24 * 7 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  item: InventoryItem;
  /** Current and upcoming checkouts of this item, to warn about clashes. */
  existing: Checkout[];
}

export function CheckoutSheet({ open, onClose, item, existing }: Props) {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const [borrower, setBorrower] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [preset, setPreset] = useState<number | null>(60);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const s = new Date();
    s.setSeconds(0, 0);
    setBorrower(me.full_name);
    setStart(toLocalInput(s));
    setEnd(toLocalInput(new Date(s.getTime() + 60 * 60_000)));
    setPreset(60);
    setNote('');
  }, [open, me.full_name]);

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const valid = !!startDate && !!endDate && endDate > startDate && borrower.trim().length > 0;

  const clash = useMemo(() => {
    if (!startDate || !endDate) return null;
    return existing.find((c) => !c.canceled_at && new Date(c.starts_at) < endDate && new Date(c.ends_at) > startDate) ?? null;
  }, [existing, startDate, endDate]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db()
        .from('checkouts')
        .insert({ item_id: item.id, borrower: borrower.trim(), note: note.trim() || null, starts_at: startDate!.toISOString(), ends_at: endDate!.toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['checkouts'] });
      void qc.invalidateQueries({ queryKey: ['log'] });
      toast(`${item.name} is checked out to ${borrower.trim()}.`);
      onClose();
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  function applyPreset(minutes: number) {
    const s = startDate ?? new Date();
    setPreset(minutes);
    setEnd(toLocalInput(new Date(s.getTime() + minutes * 60_000)));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid && !clash) save.mutate();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Check out ${item.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="checkout-form" loading={save.isPending} disabled={!valid || !!clash}>
            Check out
          </Button>
        </div>
      }
    >
      <form id="checkout-form" onSubmit={submit} className="space-y-4 pt-1">
        {item.status === 'needs_maintenance' && (
          <div className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3.5 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
            <div>
              <div className="font-medium">This tool is marked “needs maintenance”.</div>
              {item.status_note && <div className="text-muted">{item.status_note}</div>}
            </div>
          </div>
        )}

        <Field label="Who has it" htmlFor="borrower" hint="A person, a class period, or a team.">
          <Input id="borrower" required maxLength={80} value={borrower} onChange={(e) => setBorrower(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From" htmlFor="start">
            <Input
              id="start"
              type="datetime-local"
              required
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (preset && e.target.value) setEnd(toLocalInput(new Date(new Date(e.target.value).getTime() + preset * 60_000)));
              }}
            />
          </Field>
          <Field label="Until" htmlFor="end">
            <Input
              id="end"
              type="datetime-local"
              required
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setPreset(null);
              }}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.minutes}
              type="button"
              onClick={() => applyPreset(p.minutes)}
              className={cx('rounded-full border px-3 py-1.5 text-sm font-medium transition', preset === p.minutes ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink')}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const s = roundUpToQuarterHour(new Date(Date.now() + 15 * 60_000));
              setStart(toLocalInput(s));
              setEnd(toLocalInput(new Date(s.getTime() + (preset ?? 60) * 60_000)));
            }}
            className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Start later
          </button>
        </div>

        {startDate && endDate && endDate <= startDate && <p className="text-sm text-danger">The end must be after the start.</p>}

        {clash ? (
          <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger/8 p-3.5 text-sm">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <div className="font-medium text-danger">Already checked out for part of this time</div>
              <div className="text-muted">
                {clash.borrower}: {formatWindow(clash.starts_at, clash.ends_at)}
              </div>
            </div>
          </div>
        ) : (
          existing.length > 0 && (
            <div className="rounded-xl bg-raised p-3.5 text-sm">
              <div className="mb-1 font-medium">Already booked</div>
              <ul className="space-y-0.5 text-muted">
                {existing.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    {formatWindow(c.starts_at, c.ends_at)} · {c.borrower}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        <Field label="Note" htmlFor="note">
          <Textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className="min-h-16" />
        </Field>
      </form>
    </Sheet>
  );
}
