import type { ReactNode } from 'react';
import { AppMark } from '../../graphics/Icons';
import { ToolArt } from '../../graphics/ToolArt';
import { APP_NAME, CLASS_NAME, SCHOOL_NAME } from '../../config';

const showcase = ['drill-press', 'bandsaw', 'miter-saw', 'mill', 'table-saw', 'grinder'];

// Shared frame for the sign-in, join, and password screens.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="bp-grid relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <AppMark size={44} />
          <div>
            <div className="text-lg font-semibold" style={{ fontStretch: '115%' }}>
              {APP_NAME}
            </div>
            <div className="text-sm text-muted">
              {SCHOOL_NAME} · {CLASS_NAME}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-ink">
          {showcase.map((slug, i) => (
            <div key={slug} className="animate-rise rounded-2xl border border-line bg-surface/70 p-3 backdrop-blur" style={{ animationDelay: `${i * 60}ms` }}>
              <ToolArt slug={slug} className="w-full" />
            </div>
          ))}
        </div>
        <p className="max-w-md text-[0.9375rem] text-muted">Find the right tool, learn to run it safely, see what is in the shop and who has it, and build with your class.</p>
      </div>

      <div className="flex flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <AppMark size={40} />
            <div>
              <div className="font-semibold" style={{ fontStretch: '115%' }}>
                {APP_NAME}
              </div>
              <div className="text-xs text-muted">
                {SCHOOL_NAME} · {CLASS_NAME}
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
