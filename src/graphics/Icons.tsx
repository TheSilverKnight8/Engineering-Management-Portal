// Small icons for PPE, materials, and picker objectives. Same line style as the
// tool illustrations; "hot" parts use the accent color.

import type { ReactNode } from 'react';
import type { MaterialId, ObjectiveId, PpeId } from '../content/types';

function Svg({ size = 24, view = 24, className = '', children }: { size?: number; view?: number; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${view} ${view}`} width={size} height={size} className={`art ${className}`} style={{ strokeWidth: view === 24 ? 1.7 : 2.2 }} aria-hidden>
      {children}
    </svg>
  );
}

const glove = 'M8.5 21v-4.5L5.2 13a1.5 1.5 0 0 1 2.1-2.1L9 12.5V5.2a1.25 1.25 0 0 1 2.5 0V10V4.2a1.25 1.25 0 0 1 2.5 0V10V5.2a1.25 1.25 0 0 1 2.5 0V10V7.2a1.25 1.25 0 0 1 2.5 0v6.3c0 3.2-1.4 5.6-3.5 7.5z';

const ppeIcons: Record<PpeId, ReactNode> = {
  'safety-glasses': (
    <>
      <path className="b" d="M3 9h7.5v3.5a3.75 3.75 0 0 1-7.5 0z" />
      <path className="b" d="M13.5 9H21v3.5a3.75 3.75 0 0 1-7.5 0z" />
      <path d="M10.5 10.5h3M3 9L1.5 7.5M21 9l1.5-1.5" />
    </>
  ),
  'hearing-protection': (
    <>
      <path d="M5.5 13v-2a6.5 6.5 0 0 1 13 0v2" />
      <rect className="b" x="3" y="12" width="5" height="8" rx="2.2" />
      <rect className="b" x="16" y="12" width="5" height="8" rx="2.2" />
    </>
  ),
  'dust-mask': (
    <>
      <path d="M5 10.5L2 8.5M19 10.5l3-2M5 14.5l-3 1M19 14.5l3 1" />
      <path className="b" d="M5 9.5c3.5-2.5 10.5-2.5 14 0v3.5c0 4.2-3.1 7.5-7 7.5s-7-3.3-7-7.5z" />
      <circle cx="12" cy="15" r="1.6" />
    </>
  ),
  'face-shield': (
    <>
      <path className="b" d="M4.5 7.5v7c0 3.6 3.4 6.5 7.5 6.5s7.5-2.9 7.5-6.5v-7" />
      <path d="M4 4.5h16v3H4z" />
      <path className="thin" d="M8 11l2-2" />
    </>
  ),
  gloves: <path className="b" d={glove} />,
  'heat-resistant-gloves': (
    <>
      <path className="b" d={glove} transform="translate(-2 1) scale(.92)" />
      <path className="hot" d="M19.5 2.5c1.2 1.5 2.3 2.7 2.3 4.2a2.3 2.3 0 0 1-4.6 0c0-1 .6-1.6 1.1-2.2" />
    </>
  ),
  'long-sleeves': <path className="b" d="M8.5 3L3 6l1.8 13H8V10v11h8V10v9h3.2L21 6l-5.5-3a3.5 3.5 0 0 1-7 0z" />,
  'laser-goggles': (
    <>
      <path d="M3 11.5H1.5M21 11.5h1.5" />
      <path className="b" d="M3 9.8C3 8.8 3.8 8 4.8 8h14.4c1 0 1.8.8 1.8 1.8v2.7c0 2-1.5 3.5-3.5 3.5h-2.2L13.8 14h-3.6l-1.5 2H6.5C4.5 16 3 14.5 3 12.5z" />
      <path className="hot" d="M18.5 1.5v3.2M16.9 3.1h3.2" />
    </>
  ),
};

export function PpeIcon({ id, size = 24, className = '' }: { id: PpeId; size?: number; className?: string }) {
  return (
    <Svg size={size} className={className}>
      {ppeIcons[id]}
    </Svg>
  );
}

export function NoGlovesIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <Svg size={size} className={className}>
      <path className="b" d={glove} />
      <circle cx="12" cy="12" r="10.2" style={{ stroke: 'var(--danger)' }} />
      <path d="M4.8 4.8l14.4 14.4" style={{ stroke: 'var(--danger)' }} />
    </Svg>
  );
}

const materialIcons: Record<MaterialId, ReactNode> = {
  wood: (
    <>
      <circle className="b" cx="24" cy="24" r="17" />
      <circle className="thin" cx="24.5" cy="24.5" r="12" />
      <circle className="thin" cx="25" cy="25" r="7" />
      <circle cx="25" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <path d="M24 7l1 8" />
    </>
  ),
  acrylic: (
    <>
      <path className="b" d="M6 33l12-14h24L30 33z" />
      <path className="b" d="M6 27l12-14h24L30 27z" />
      <path className="thin" d="M17 24l7-8M22 24l4-5" />
    </>
  ),
  polycarbonate: (
    <>
      <path className="b" d="M6 36c12 0 14-24 36-24v7c-17 0-19 24-36 24z" />
      <path className="thin" d="M14 34c6-3 8-12 14-16" />
    </>
  ),
  metal: (
    <>
      <path className="b" d="M9 9h30v7H28v16h11v7H9v-7h11V16H9z" />
      <path className="thin" d="M12 12h8M31 36h5" />
    </>
  ),
};

export function MaterialIcon({ id, size = 48, className = '' }: { id: MaterialId; size?: number; className?: string }) {
  return (
    <Svg size={size} view={48} className={className}>
      {materialIcons[id]}
    </Svg>
  );
}

const objectiveIcons: Record<ObjectiveId, ReactNode> = {
  'straight-cuts': (
    <>
      <rect className="b" x="3" y="6" width="18" height="12" rx="1.5" />
      <path className="hot dash" d="M12 2.5v19" />
    </>
  ),
  'long-cuts': (
    <>
      <rect className="b" x="1.5" y="8.5" width="21" height="7" rx="1.5" />
      <path className="hot dash" d="M1.5 12h21" />
    </>
  ),
  'curved-cuts': (
    <>
      <rect className="b" x="3" y="3" width="18" height="18" rx="2" />
      <path className="hot dash" d="M6 21c0-9 12-9 12-18" />
    </>
  ),
  'precise-cuts': (
    <>
      <circle className="b" cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <circle className="hotf" cx="12" cy="12" r="1.8" />
    </>
  ),
  cutouts: (
    <>
      <rect className="b" x="3" y="3" width="18" height="18" rx="2" />
      <rect className="hot dash s" x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
  'straight-bore': (
    <>
      <path className="b" d="M3 13h18v8H3z" />
      <path className="s" d="M10.5 13h3v5h-3z" />
      <path className="hot" d="M12 2v8M9 7.5l3 3 3-3" />
    </>
  ),
  'detailed-bore': (
    <>
      <rect className="b" x="3" y="4" width="18" height="16" rx="1.5" />
      <circle className="hot" cx="8" cy="9" r="1.7" />
      <circle className="hot" cx="16" cy="9" r="1.7" />
      <circle className="hot" cx="12" cy="15" r="1.7" />
    </>
  ),
  'driving-screws': (
    <>
      <path className="b" d="M6.5 3.5h11l-1.5 3.5H8z" />
      <path className="b" d="M9.5 7h5v10l-2.5 4.5L9.5 17z" />
      <path className="hot" d="M9.5 10l5 1.2M9.5 13.2l5 1.2" />
    </>
  ),
  'surface-finishing': (
    <>
      <rect className="b" x="5" y="5" width="14" height="7" rx="2" />
      <path d="M3 16h18" />
      <path className="hot thin" d="M3 19.5l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5" />
    </>
  ),
  sharpening: (
    <>
      <path className="b" d="M3 21v-4L15 5l4 4L7 21z" />
      <path className="hot" d="M3 17l4 4" />
      <path className="hot thin" d="M18 15l3 1M16.5 18l2 2.5" />
    </>
  ),
  demolition: (
    <>
      <path className="b" d="M3 8h8l2 3-2 3 2 7H3z" />
      <path className="b" d="M14.5 8H21v13h-5.5l-2-7 2-3z" />
      <path className="hot thin" d="M12 2l1 3M16 3l-1 3M8 3l2 3" />
    </>
  ),
};

export function ObjectiveIcon({ id, size = 24, className = '' }: { id: ObjectiveId; size?: number; className?: string }) {
  return (
    <Svg size={size} className={className}>
      {objectiveIcons[id]}
    </Svg>
  );
}

/** The app mark: a red hex nut on a navy tile, in the Shop Manual colors. */
export function AppMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <rect width="64" height="64" rx="12" fill="#002657" />
      <path d="M52 32L42 49.3H22L12 32l10-17.3h20z" fill="none" stroke="#fc3f3f" strokeWidth="5.5" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="8.5" fill="none" stroke="#faeeda" strokeWidth="4.5" />
    </svg>
  );
}
