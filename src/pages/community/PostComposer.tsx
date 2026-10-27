import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import type { PostKind } from '../../lib/types';
import { db, POST_IMAGE_BUCKET } from '../../lib/supabase';
import { useMe } from '../../lib/auth';
import { compressImage } from '../../lib/image';
import { friendlyError } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { keys } from '../../lib/queries';
import { Sheet } from '../../components/Sheet';
import { Button, Field, Input, Textarea, cx } from '../../components/ui';
import { POST_KIND_META } from './postKinds';

const MAX_IMAGES = 4;

// Writes posts, and in "announcement" mode (teachers and the developer) announcements.
// Announcements have no kind and no deadline.
export function PostComposer({ open, onClose, mode = 'post' }: { open: boolean; onClose: () => void; mode?: 'post' | 'announcement' }) {
  const announcing = mode === 'announcement';
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PostKind>('build');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [body, setBody] = useState('');
  const [deadline, setDeadline] = useState('');
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);

  // Clear the form when the sheet closes.
  useEffect(() => {
    if (open) return;
    setTitle('');
    setLink('');
    setBody('');
    setDeadline('');
    setImages((s) => {
      s.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
  }, [open]);

  const post = useMutation({
    mutationFn: async () => {
      // Upload compressed images first, into the author's own folder.
      const paths: string[] = [];
      for (const img of images) {
        const { blob, ext } = await compressImage(img.file);
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await db().storage.from(POST_IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
        if (error) throw error;
        paths.push(path);
      }
      const fields = { title: title.trim(), body: body.trim() || null, link_url: link.trim() || null, image_paths: paths };
      const { error } = announcing
        ? await db().from('announcements').insert(fields)
        : await db()
            .from('posts')
            .insert({ ...fields, kind, deadline: kind === 'competition' && deadline ? deadline : null });
      if (error) {
        if (paths.length) await db().storage.from(POST_IMAGE_BUCKET).remove(paths);
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: announcing ? keys.announcements : keys.posts });
      toast(announcing ? 'Announcement posted.' : 'Posted.');
      onClose();
    },
    onError: (e) => toast(friendlyError(e), 'error'),
  });

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const picked = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
    setImages((s) => [...s, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  const linkOk = !link.trim() || /^https?:\/\/\S+\.\S+/i.test(link.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && linkOk) post.mutate();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={announcing ? 'New announcement' : 'New post'}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="post-form" loading={post.isPending} disabled={!title.trim() || !linkOk}>
            Post
          </Button>
        </div>
      }
    >
      <form id="post-form" onSubmit={submit} className="space-y-4 pt-1">
        {!announcing && (
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(POST_KIND_META) as PostKind[]).map((k) => {
              const m = POST_KIND_META[k];
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cx('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition', on ? 'border-accent bg-accent/8 ring-1 ring-accent' : 'border-line hover:border-navy/40')}
                >
                  <span className={cx('flex size-9 items-center justify-center rounded-lg', m.tone)}>
                    <m.icon className="size-[1.1rem]" />
                  </span>
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="hidden text-[0.6875rem] leading-tight text-muted sm:block">{m.hint}</span>
                </button>
              );
            })}
          </div>
        )}

        <Field label="Title" htmlFor="title">
          <Input id="title" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Link" htmlFor="link" error={linkOk ? null : 'Start the link with https://'} hint={!announcing && kind === 'paper' ? 'Link to the paper (for example on Google Drive or a journal site).' : 'Optional'}>
          <Input id="link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        {!announcing && kind === 'competition' && (
          <Field label="Deadline" htmlFor="deadline" hint="Optional">
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
        <Field label="Details" htmlFor="body">
          <Textarea id="body" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional" />
        </Field>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">Photos</span>
            <span className="text-xs text-muted">
              Up to {MAX_IMAGES}. They are made smaller before upload.
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                <img src={img.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(img.url);
                    setImages((s) => s.filter((_, j) => j !== i));
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-muted hover:border-navy/40 hover:text-ink">
                <ImagePlus className="size-5" />
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      </form>
    </Sheet>
  );
}
