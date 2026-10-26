import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ChevronDown, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

/** Joins class names. When two classes set the same thing (h-11 and h-9), the later one wins. */
export function cx(...parts: (string | false | null | undefined)[]) {
  return twMerge(parts.filter(Boolean).join(' '));
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-105 active:brightness-95',
  secondary: 'bg-surface text-ink border border-line hover:bg-raised active:bg-raised',
  ghost: 'text-ink hover:bg-raised active:bg-raised',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[0.9375rem] gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-base gap-2 rounded-xl',
  lg: 'h-13 px-5 text-lg gap-2 rounded-xl',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cx(
    // Norwester capitals, like the Shop Manual's buttons.
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-display uppercase tracking-[0.06em] leading-none transition select-none disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-2xl border border-line bg-surface shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = 'neutral', className, icon }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'navy'; className?: string; icon?: ReactNode }) {
  const tones = {
    neutral: 'border-line bg-raised text-ink',
    ok: 'border-ok/30 bg-ok/10 text-ok',
    warn: 'border-warn/35 bg-warn/12 text-warn',
    danger: 'border-danger/30 bg-danger/10 text-danger',
    accent: 'border-accent/35 bg-accent/12 text-warn',
    navy: 'border-navy/30 bg-navy/10 text-navy',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-5 animate-spin text-muted', className)} />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({ art, title, children, action, className }: { art?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
      {art && <div className="mb-4 text-muted">{art}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-xl border border-line bg-raised px-3.5 text-[0.9375rem] text-ink placeholder:text-muted/70 outline-none transition focus:border-navy focus:bg-surface focus:ring-3 focus:ring-navy/15';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...rest} />;
});

export function Select({ className, wrapperClassName, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={cx('relative', wrapperClassName)}>
      <select className={cx(inputBase, 'h-11 appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="tablist" className={cx('inline-flex rounded-xl border border-line bg-raised p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg font-medium transition whitespace-nowrap',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const avatarColors = ['#002657', '#fc3f3f', '#2d4f7f', '#b9302f'];

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-display text-[#faeeda] ring-1 ring-line', className)}
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColors[h % avatarColors.length] }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function RoleBadges({ role, isMod, isDev }: { role: 'student' | 'teacher'; isMod: boolean; isDev: boolean }) {
  return (
    <>
      {role === 'teacher' && <Chip tone="navy">Teacher</Chip>}
      {isMod && <Chip tone="accent">Mod</Chip>}
      {isDev && <Chip tone="neutral">Dev</Chip>}
    </>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted">{children}</kbd>;
}
