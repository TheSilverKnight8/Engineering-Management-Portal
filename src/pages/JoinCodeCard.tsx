import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { useJoinCode, keys } from '../lib/queries';
import { db } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { Button, Card } from '../components/ui';

// Teachers and the developer see the class join code and can change it.
// Changing it stops the old code from working; people already in stay in.
export function JoinCodeCard() {
  const code = useJoinCode(true);
  const qc = useQueryClient();
  const toast = useToast();

  const rotate = useMutation({
    mutationFn: async () => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const next = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const { error } = await db().from('class_settings').update({ join_code: next, updated_at: new Date().toISOString() }).eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.joinCode });
      toast('New join code made. The old one no longer works.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="size-5 text-accent" />
        <h2 className="font-semibold">Class join code</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="bp-grid rounded-xl border border-line bg-raised px-5 py-3 font-mono text-3xl font-bold tracking-[0.25em]">{code.data ?? '······'}</div>
        <Button
          size="sm"
          onClick={() => {
            if (code.data) void navigator.clipboard.writeText(code.data).then(() => toast('Copied.'));
          }}
        >
          <Copy className="size-4" />
          Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={() => confirm('Make a new join code? The current code will stop working.') && rotate.mutate()} loading={rotate.isPending}>
          <RefreshCw className="size-4" />
          New code
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted">Give this code to students so they can join. Make a new one if it gets out of the class.</p>
    </Card>
  );
}
