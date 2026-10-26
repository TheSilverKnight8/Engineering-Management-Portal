import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Tool } from '../../content/types';
import { ToolArt } from '../../graphics/ToolArt';
import { Button } from '../../components/ui';

// Full-screen view of the operation steps, one at a time, in large text, for
// reading on a phone at the machine.
export function StepMode({ open, onClose, tool }: { open: boolean; onClose: () => void; tool: Tool }) {
  const [i, setI] = useState(0);
  const steps = tool.operation;
  const last = i === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setI(0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose, steps.length]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={`${tool.name} steps`}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <ToolArt slug={tool.slug} className="size-9 text-ink" />
            <div className="flex-1 leading-tight">
              <div className="font-semibold">{tool.name}</div>
              <div className="text-xs text-muted">
                Step {i + 1} of {steps.length}
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-raised" aria-label="Close">
              <X className="size-6" />
            </button>
          </div>
          <div className="h-1 bg-line">
            <motion.div className="h-full bg-accent" animate={{ width: `${((i + 1) / steps.length) * 100}%` }} />
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
                className="max-w-2xl text-center"
                onClick={() => !last && setI(i + 1)}
              >
                <div className="mb-6 font-display text-7xl text-accent">{String(i + 1).padStart(2, '0')}</div>
                <p className="text-[1.75rem] font-semibold leading-snug sm:text-4xl">
                  {steps[i]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
            <Button size="lg" onClick={() => setI(i - 1)} disabled={i === 0}>
              <ChevronLeft className="size-5" />
              Back
            </Button>
            {last ? (
              <Button size="lg" variant="primary" onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button size="lg" variant="primary" onClick={() => setI(i + 1)}>
                Next
                <ChevronRight className="size-5" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
