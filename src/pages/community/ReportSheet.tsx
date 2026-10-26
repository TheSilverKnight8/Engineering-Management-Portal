import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { Sheet } from '../../components/Sheet';
import { Button, Textarea } from '../../components/ui';

export function ReportSheet({ target, onClose }: { target: { type: 'post' | 'message'; id: string } | null; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc('report_content', { target_type: target!.type, target_id: target!.id, reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast('Reported. A teacher or mod will look at it.');
      setReason('');
      onClose();
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={`Report this ${target?.type ?? 'post'}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => send.mutate()} loading={send.isPending}>
            Send report
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">Teachers and mod students see reports. The person you report does not see who reported them.</p>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="What is wrong? (optional)" />
    </Sheet>
  );
}
