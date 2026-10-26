import { useState } from 'react';
import { Maximize2, Minimize2, Play, Video } from 'lucide-react';
import type { VideoSlot as Slot } from '../content/types';
import { cx } from './ui';

// A YouTube embed. With no video ID it shows a "coming soon" placeholder, so
// each entry has a spot ready for the owner's demo videos. The player loads
// only after a tap, which saves bandwidth and keeps YouTube from loading on
// every page view.
export function VideoSlot({ slot }: { slot: Slot }) {
  const [playing, setPlaying] = useState(false);
  const [wide, setWide] = useState(false);

  if (!slot.youtubeId) {
    return (
      <div className="bp-grid relative flex aspect-[2/1] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-line bg-raised text-center sm:aspect-[3/1]">
        <div className="flex size-14 items-center justify-center rounded-full border border-line bg-surface text-muted">
          <Video className="size-6" />
        </div>
        <div>
          <div className="font-medium">{slot.title}</div>
          <div className="text-sm text-muted">Video coming soon</div>
        </div>
      </div>
    );
  }

  const thumb = `https://i.ytimg.com/vi/${slot.youtubeId}/hqdefault.jpg`;

  return (
    <div className={cx('transition-all', wide && 'lg:-mx-10')}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${slot.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={slot.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="group absolute inset-0 size-full" aria-label={`Play ${slot.title}`}>
            <img src={thumb} alt="" className="size-full object-cover opacity-85 transition group-hover:opacity-100" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-pop transition group-hover:scale-105">
                <Play className="ml-1 size-7" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{slot.title}</span>
        <button onClick={() => setWide((w) => !w)} className="hidden items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-raised hover:text-ink lg:inline-flex">
          {wide ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          {wide ? 'Smaller' : 'Larger'}
        </button>
      </div>
    </div>
  );
}
