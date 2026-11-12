import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { keys } from '../lib/queries';
import { db, POST_IMAGE_BUCKET } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { Sheet } from '../components/Sheet';
import { Avatar, Button } from '../components/ui';

const FRAME = 280; // px: the square the photo is framed in on screen
const OUT = 320; // px: the saved picture is a small square, about 20-40 KB
const MAX_ZOOM = 4;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Choose a photo, drag and zoom it into the circle, and save it as the profile picture. */
export function AvatarEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ bitmap: ImageBitmap; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // the photo's top-left corner inside the frame
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  // Start fresh each time the sheet opens.
  useEffect(() => {
    if (open) return;
    setPhoto((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
    setBusy(false);
  }, [open]);

  if (!profile) return null;
  const base = photo ? Math.max(FRAME / photo.bitmap.width, FRAME / photo.bitmap.height) : 1;
  const size = (z: number) => (photo ? { w: photo.bitmap.width * base * z, h: photo.bitmap.height * base * z } : { w: 0, h: 0 });
  // Keep the photo covering the whole frame.
  const clamp = (p: { x: number; y: number }, z: number) => {
    const { w, h } = size(z);
    return { x: Math.min(0, Math.max(FRAME - w, p.x)), y: Math.min(0, Math.max(FRAME - h, p.y)) };
  };
  // Zoom around the frame's center.
  const zoomTo = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const c = FRAME / 2;
    const k = z / zoom;
    setPos((p) => clamp({ x: c - (c - p.x) * k, y: c - (c - p.y) * k }, z));
    setZoom(z);
  };

  async function pick(file: File) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      // A smaller copy for the on-screen preview; the saved picture is drawn from the original.
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      if (!blob) throw new Error();
      setPhoto((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { bitmap, url: URL.createObjectURL(blob) };
      });
      const b = Math.max(FRAME / bitmap.width, FRAME / bitmap.height);
      setZoom(1);
      setPos({ x: (FRAME - bitmap.width * b) / 2, y: (FRAME - bitmap.height * b) / 2 });
    } catch {
      toast('That photo could not be opened. Try a JPEG or PNG.', 'error');
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
    } else if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }, zoom));
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  async function finish(newPath: string | null) {
    const old = profile!.avatar_path;
    const { error } = await db().from('profiles').update({ avatar_path: newPath }).eq('id', profile!.id);
    if (error) throw error;
    if (old && old !== newPath) await db().storage.from(POST_IMAGE_BUCKET).remove([old]);
    await refreshProfile();
    void qc.invalidateQueries({ queryKey: keys.roster });
  }

  async function save() {
    if (!photo) return;
    setBusy(true);
    try {
      const scale = base * zoom;
      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      canvas.getContext('2d')!.drawImage(photo.bitmap, -pos.x / scale, -pos.y / scale, FRAME / scale, FRAME / scale, 0, 0, OUT, OUT);
      // Some browsers cannot make WebP and quietly return PNG; use JPEG there.
      let blob = await canvasToBlob(canvas, 'image/webp', 0.85);
      let ext = 'webp';
      if (!blob || blob.type !== 'image/webp') {
        blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
        ext = 'jpg';
      }
      if (!blob) throw new Error('The picture could not be made.');
      const path = `${profile!.id}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error } = await db().storage.from(POST_IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
      if (error) throw error;
      await finish(path);
      toast('Profile picture saved.');
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Remove your profile picture? Your initials show instead.')) return;
    setBusy(true);
    try {
      await finish(null);
      toast('Profile picture removed.');
      onClose();
    } catch (e) {
      toast(friendlyError(e), 'error');
      setBusy(false);
    }
  }

  const { w, h } = size(zoom);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Profile picture"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {photo && (
            <Button variant="primary" onClick={() => void save()} loading={busy}>
              Save
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 pt-1">
        {photo ? (
          <>
            <div
              className="relative cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-raised active:cursor-grabbing"
              style={{ width: FRAME, height: FRAME }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            >
              <img src={photo.url} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: pos.x, top: pos.y, width: w, height: h }} />
              {/* Everything outside the circle is dimmed: that part is cut off. */}
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0_/_0.5)] ring-2 ring-white/80" />
            </div>
            <div className="flex w-full max-w-[280px] items-center gap-3">
              <button type="button" onClick={() => zoomTo(zoom / 1.25)} aria-label="Zoom out" className="text-muted hover:text-ink">
                <ZoomOut className="size-5" />
              </button>
              <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[var(--accent)]" />
              <button type="button" onClick={() => zoomTo(zoom * 1.25)} aria-label="Zoom in" className="text-muted hover:text-ink">
                <ZoomIn className="size-5" />
              </button>
            </div>
            <p className="text-center text-sm text-muted">Drag the photo to move it. Pinch or use the slider to zoom.</p>
            <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()} disabled={busy}>
              <ImagePlus className="size-4" />
              Choose another photo
            </Button>
          </>
        ) : (
          <>
            <Avatar name={profile.full_name} path={profile.avatar_path} size={120} />
            <Button variant="primary" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" />
              {profile.avatar_path ? 'Choose a new photo' : 'Choose a photo'}
            </Button>
            {profile.avatar_path && (
              <Button size="sm" variant="ghost" onClick={() => void remove()} loading={busy}>
                <Trash2 className="size-4" />
                Remove picture
              </Button>
            )}
            <p className="text-center text-sm text-muted">Everyone in the class sees your picture. Moderators can remove a picture that is not appropriate.</p>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void pick(f);
          }}
        />
      </div>
    </Sheet>
  );
}
