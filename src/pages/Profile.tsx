import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, LogOut, Monitor, Moon, Share, Sun } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { isIos, isStandalone, useInstallPrompt } from '../lib/install';
import { canSeeJoinCode } from '../lib/types';
import { db } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { keys } from '../lib/queries';
import { PageHeader } from '../components/PageHeader';
import { Avatar, Button, Card, Field, Input, RoleBadges, SectionTitle, Segmented } from '../components/ui';
import { JoinCodeCard } from './JoinCodeCard';
import { GroupTags, useGroupsByMember } from './community/GroupTags';

export default function Profile() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const [theme, setTheme] = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(profile?.full_name ?? '');
  const myGroups = useGroupsByMember().get(profile?.id ?? '') ?? [];

  const saveName = useMutation({
    mutationFn: async () => {
      const { error } = await db().from('profiles').update({ full_name: name.trim() }).eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: keys.roster });
      toast('Name saved.');
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title={profile ? 'Your profile' : 'Settings'} />

      {profile && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} size={64} />
            <div className="min-w-0">
              <div className="text-xl font-semibold">{profile.full_name}</div>
              <div className="truncate text-sm text-muted">{session?.user.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RoleBadges role={profile.role} isMod={profile.is_mod} isDev={profile.is_dev} />
                {profile.role === 'student' && !profile.is_mod && !profile.is_dev && <span className="text-xs capitalize text-muted">{profile.role}</span>}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 text-sm font-medium">Project groups</div>
            {myGroups.length > 0 ? (
              <GroupTags groups={myGroups} />
            ) : (
              <p className="text-sm text-muted">
                You are not in a group yet.{' '}
                <Link to="/groups" className="text-navy underline decoration-accent/70 decoration-2 underline-offset-4 hover:decoration-accent">
                  See project groups
                </Link>
              </p>
            )}
          </div>
          <form
            className="mt-6 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().split(/\s+/).length >= 2) saveName.mutate();
              else toast('Enter your first and last name.', 'error');
            }}
          >
            <div className="flex-1">
              <Field label="Full name" htmlFor="fullname" hint="Your real name, so classmates know who has a tool.">
                <Input id="fullname" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" className="mb-6" disabled={name.trim() === profile.full_name} loading={saveName.isPending}>
              Save
            </Button>
          </form>
        </Card>
      )}

      {canSeeJoinCode(profile) && <JoinCodeCard />}

      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="text-sm font-medium">Theme</span>
          <Segmented<ThemeChoice>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="size-4" />Auto</span> },
              { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="size-4" />Light</span> },
              { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="size-4" />Dark</span> },
            ]}
          />
        </Card>
      </section>

      <InstallCard />

      {profile && (
        <Button variant="danger" onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      )}
    </div>
  );
}

function InstallCard() {
  const install = useInstallPrompt();
  if (isStandalone()) return null;
  return (
    <section>
      <SectionTitle>Install the app</SectionTitle>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Download className="size-5" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium">Put the portal on your home screen</div>
          <div className="text-muted">
            {isIos() ? (
              <>
                In Safari, tap <Share className="inline size-4 align-text-bottom" /> Share, then “Add to Home Screen”.
              </>
            ) : install.canPrompt ? (
              'It opens full screen, like any other app.'
            ) : (
              'In your browser menu, choose “Install app” or “Add to Home screen”.'
            )}
          </div>
        </div>
        {install.canPrompt && (
          <Button variant="primary" onClick={() => void install.prompt()}>
            Install
          </Button>
        )}
      </Card>
    </section>
  );
}
