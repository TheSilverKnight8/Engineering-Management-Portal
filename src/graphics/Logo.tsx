import logoUrl from '../assets/logo/croswell-industries.svg';
import { cx } from '../components/ui';

// The owner's Croswell Industries logo. It is used as a mask, so it is drawn in
// the current text color: navy on cream, cream on navy in dark mode.
export function CroswellLogo({ className }: { className?: string }) {
  const mask = `url("${logoUrl}") center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label="Croswell Industries: Making your life easier"
      className={cx('block aspect-[675/154] bg-current', className)}
      style={{ WebkitMask: mask, mask }}
    />
  );
}
