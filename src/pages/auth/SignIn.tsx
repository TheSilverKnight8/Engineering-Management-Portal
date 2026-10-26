import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { db } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';
import { Button, Field, Input, Segmented } from '../../components/ui';
import { AuthLayout } from './AuthLayout';

type Mode = 'sign-in' | 'sign-up' | 'reset';

const redirectTo = () => window.location.origin + import.meta.env.BASE_URL;

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | 'confirm' | 'reset'>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await db().auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'sign-up') {
        const { data, error } = await db().auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
        if (error) throw error;
        // With "Confirm email" on, there is no session until the link is opened.
        if (!data.session) setSent('confirm');
      } else {
        const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
        if (error) throw error;
        setSent('reset');
      }
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg === 'Invalid login credentials' ? 'That email and password do not match an account.' : msg);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="animate-rise text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-navy/10 text-navy">
            <MailCheck className="size-7" />
          </div>
          <h1 className="text-[2.5rem] leading-[0.95]">Check your email</h1>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {sent === 'confirm' ? 'Open the link we sent to confirm your account, then come back here.' : 'Open the link we sent to set a new password.'}
            <br />
            <span className="font-medium text-ink">{email}</span>
          </p>
          <Button className="mt-6" onClick={() => { setSent(null); setMode('sign-in'); }}>
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="animate-rise">
        <h1 className="text-[2.5rem] leading-[0.95]">{mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create your account' : 'Reset your password'}</h1>
        <p className="mt-1.5 text-[0.9375rem] text-muted">
          {mode === 'reset' ? 'We will email you a link to set a new password.' : 'Use a personal email address, not your school account.'}
        </p>

        {mode !== 'reset' && (
          <Segmented
            className="mt-6 w-full"
            value={mode}
            onChange={(m) => { setMode(m); setError(null); }}
            options={[
              { value: 'sign-in', label: 'Sign in' },
              { value: 'sign-up', label: 'Create account' },
            ]}
          />
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password" htmlFor="password" hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'sign-up' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm">
          {mode === 'sign-in' && (
            <button className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent" onClick={() => { setMode('reset'); setError(null); }}>
              Forgot your password?
            </button>
          )}
          {mode === 'reset' && (
            <button className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent" onClick={() => { setMode('sign-in'); setError(null); }}>
              Back to sign in
            </button>
          )}
        </div>
        {mode === 'sign-up' && <p className="mt-2 text-center text-xs text-muted">After you create an account, you enter the class join code from your teacher.</p>}
      </div>
    </AuthLayout>
  );
}
