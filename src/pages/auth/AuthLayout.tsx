import type { ReactNode } from 'react';
import { AppMark } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { APP_NAME, CLASS_NAME, SCHOOL_NAME } from '../../config';

const showcase = ['drill-press', 'bandsaw', 'miter-saw', 'mill', 'table-saw', 'grinder'];

// Shared frame for the sign-in, join, and password screens. On a computer the
// left half is laid out like the Shop Manual title slide.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-bg py-2 lg:flex">
        <div className="stripes stripes-tl stripes-lg" aria-hidden />
        <div className="px-12 py-10 text-center">
          <h1 className="text-[5.25rem] leading-[0.88] xl:text-[6.5rem]">{APP_NAME}</h1>
          <div className="mt-4 font-display text-[1.875rem] uppercase leading-none tracking-[0.02em] xl:text-[2.25rem]">
            {SCHOOL_NAME} {CLASS_NAME}
          </div>
          <div className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-3 text-ink">
            {showcase.map((slug, i) => (
              <div key={slug} className="art-tile animate-rise rounded-xl border border-line p-2.5" style={{ animationDelay: `${i * 60}ms` }}>
                <ToolArt slug={slug} className="w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="stripes stripes-br stripes-lg" aria-hidden />
      </div>

      <div className="flex flex-col bg-surface lg:bg-surface">
        <div className="stripes stripes-tl mt-3 lg:hidden" aria-hidden />
        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <AppMark size={44} />
              <div>
                <div className="font-display text-2xl uppercase leading-none tracking-wide">{APP_NAME}</div>
                <div className="mt-1 text-xs text-muted">
                  {SCHOOL_NAME} · {CLASS_NAME}
                </div>
              </div>
            </div>
            {children}
          </div>
        </div>
        <div className="stripes stripes-br mb-3 lg:hidden" aria-hidden />
      </div>
    </div>
  );
}
