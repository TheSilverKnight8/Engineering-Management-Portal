import { useState, type FormEvent } from 'react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errors';
import { Button, Field, PasswordInput } from '../../components/ui';
import { AuthLayout } from './AuthLayout';

// Shown after someone opens a password-reset link from their email.
export default function NewPassword() {
  const { finishRecovery } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await db().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    toast('Your password is changed.');
    finishRecovery();
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="animate-rise space-y-4">
        <h1 className="text-[2.5rem] leading-[0.95]">Set a new password</h1>
        <Field label="New password" htmlFor="pw" hint="At least 8 characters.">
          <PasswordInput id="pw" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Save password
        </Button>
      </form>
    </AuthLayout>
  );
}
