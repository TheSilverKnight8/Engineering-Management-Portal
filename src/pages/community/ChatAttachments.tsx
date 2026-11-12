import { Download, FileText, X } from 'lucide-react';
import { formatSize, useSignedUrl } from '../../lib/attachments';
import type { Attachment } from '../../lib/types';
import { cx } from '../../components/ui';

/** The pictures and files on a sent message. Pictures open full size; files download. */
export function MessageAttachments({ items, onView, onLoad }: { items: Attachment[]; onView: (url: string) => void; onLoad?: () => void }) {
  const pictures = items.filter((a) => a.kind === 'image');
  const files = items.filter((a) => a.kind === 'file');
  return (
    <div className="mt-1.5 space-y-1.5">
      {pictures.length > 0 && (
        <div className={cx('grid max-w-sm gap-1.5', pictures.length > 1 && 'grid-cols-2')}>
          {pictures.map((a) => (
            <Picture key={a.path} a={a} single={pictures.length === 1} onView={onView} onLoad={onLoad} />
          ))}
        </div>
      )}
      {files.map((a) => (
        <FileChip key={a.path} a={a} />
      ))}
    </div>
  );
}

function Picture({ a, single, onView, onLoad }: { a: Attachment; single: boolean; onView: (url: string) => void; onLoad?: () => void }) {
  const url = useSignedUrl(a.path);
  return (
    <button
      type="button"
      onClick={() => url.data && onView(url.data)}
      className={cx('overflow-hidden rounded-xl border border-line bg-raised', single ? 'max-h-72' : 'aspect-square')}
      aria-label={`Open ${a.name}`}
    >
      {url.data ? <img src={url.data} alt={a.name} loading="lazy" onLoad={onLoad} className={cx('size-full', single ? 'object-contain' : 'object-cover')} /> : <div className="aspect-square w-full animate-pulse" />}
    </button>
  );
}

function FileChip({ a }: { a: Attachment }) {
  const url = useSignedUrl(a.path, a.name);
  return (
    <a
      href={url.data}
      download={a.name}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!url.data}
      className={cx('flex max-w-sm items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition hover:border-navy/40', !url.data && 'pointer-events-none opacity-60')}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
        <FileText className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{a.name}</span>
        <span className="block text-xs text-muted">{formatSize(a.size)}</span>
      </span>
      <Download className="size-4 shrink-0 text-muted" />
    </a>
  );
}

export interface Pending {
  id: string;
  file: File;
  preview: string | null;
}

/** Files picked in the composer, before they are sent. */
export function PendingAttachments({ items, onRemove, disabled }: { items: Pending[]; onRemove: (id: string) => void; disabled: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1.5 pb-1.5 pt-1">
      {items.map((p) => (
        <div key={p.id} className="relative flex max-w-[12rem] items-center gap-2 rounded-xl border border-line bg-raised py-1.5 pl-1.5 pr-8">
          {p.preview ? (
            <img src={p.preview} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
              <FileText className="size-4" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">{p.file.name}</span>
            <span className="block text-[0.6875rem] text-muted">{formatSize(p.file.size)}</span>
          </span>
          <button type="button" disabled={disabled} onClick={() => onRemove(p.id)} className="absolute right-1 top-1 rounded-full p-1 text-muted hover:bg-surface hover:text-ink" aria-label={`Remove ${p.file.name}`}>
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
