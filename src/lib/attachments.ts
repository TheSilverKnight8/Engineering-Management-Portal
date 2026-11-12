// Pictures and files in group chats (supabase/migrations/0010_chat_attachments.sql).
// Files live in the private "group-files" bucket, in <group id>/<sender id>/,
// and are opened through short-lived signed links.

import { useQuery } from '@tanstack/react-query';
import { db } from './supabase';
import { compressImage } from './image';
import type { Attachment } from './types';

export const GROUP_FILES_BUCKET = 'group-files';
export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Programs and scripts. The database refuses the same list.
const BLOCKED = /\.(exe|msi|msp|bat|cmd|com|scr|pif|cpl|ps1|psm1|vbs|vbe|js|jse|wsf|wsh|hta|jar|apk|app|dmg|pkg|deb|rpm|sh|reg|lnk|dll)$/i;
export const isBlockedFile = (name: string) => BLOCKED.test(name.trim());

// Pictures are shrunk before upload. SVG and GIF stay files: SVGs are often
// laser-cutter drawings, and shrinking a GIF would stop its animation.
export const isPicture = (file: File) => file.type.startsWith('image/') && !/svg|gif/.test(file.type);

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Uploads one picked file into the sender's folder in the group. */
export async function uploadAttachment(file: File, groupId: string, userId: string): Promise<Attachment> {
  let blob: Blob = file;
  let name = file.name.trim() || 'file';
  let kind: Attachment['kind'] = 'file';
  if (isPicture(file)) {
    try {
      const small = await compressImage(file);
      blob = small.blob;
      kind = 'image';
      name = name.replace(/\.[^.]+$/, '') + '.' + small.ext;
    } catch {
      // A picture the browser cannot open (for example HEIC on some computers) is sent as a file.
    }
  }
  if (kind === 'file' && blob.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const path = `${groupId}/${userId}/${crypto.randomUUID()}${ext}`;
  const { error } = await db()
    .storage.from(GROUP_FILES_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'application/octet-stream', cacheControl: '31536000' });
  if (error) throw error;
  return { path, name: name.slice(0, 200), size: blob.size, type: blob.type || 'application/octet-stream', kind };
}

/** A signed link to a chat file, valid for an hour. With `download`, the browser saves it under that name. */
export function useSignedUrl(path: string, download?: string) {
  return useQuery({
    queryKey: ['signed-url', path, download ?? ''],
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await db()
        .storage.from(GROUP_FILES_BUCKET)
        .createSignedUrl(path, 3600, download ? { download } : undefined);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
