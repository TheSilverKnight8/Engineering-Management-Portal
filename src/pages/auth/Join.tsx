import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { db } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { friendlyError } from '../../lib/errors';
import { Button, Field, Input } from '../../components/ui';
import { AuthLayout } from './AuthLayout';

export default function Join() {
  const { session, refreshProfile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().split(/\s+/).length < 2) {
      setError('Enter your first and last name.');
      return;
    }
    setBusy(true);
    const { error } = await db().rpc('join_class', { code, name: name.trim() });
    if (error) {
      setError(friendlyError(error));
      setBusy(false);
      return;
    }
    await refreshProfile();
  }

  return (
    <AuthLayout>
      <div className="animate-rise">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-[2.5rem] leading-[0.95]">Join the class</h1>
        <p className="mt-1.5 text-[0.9375rem] text-muted">Enter the join code from your teacher.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Join code" htmlFor="code">
            <Input
              id="code"
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="font-mono text-lg tracking-[0.3em] lg:text-lg"
              maxLength={12}
            />
          </Field>
          <Field label="Your full name" htmlFor="name" hint="Use your real name. Classmates see it on checkouts, posts, and messages, so they know who has a tool.">
            <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          {error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Join
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Signed in as {session?.user.email}.{' '}
          <button className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent" onClick={() => void signOut()}>
            Sign out
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
