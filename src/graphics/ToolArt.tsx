// Line illustrations of each tool, drawn on a 120 x 120 grid.
//
// Conventions (classes are styled in index.css under .art):
//   b     = body, light blueprint fill
//   s     = solid surface fill (hides lines behind it)
//   hot   = the part that cuts, spins, or burns, in safety orange
//   hotb  = same, with a light orange fill
//   dash  = hidden part (blueprint convention), for example a wheel inside a housing
//
// To add a tool, add a drawing to `drawings` under the tool's slug. Tools with
// no drawing show a generic placeholder.

import type { ReactNode } from 'react';

const dot = (cx: number, cy: number, r = 2.4) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

const drawings: Record<string, ReactNode> = {
  'drill-press': (
    <>
      <rect className="b" x="22" y="7" width="22" height="10" rx="3" />
      <rect className="b" x="33" y="22" width="8" height="80" />
      <path className="b" d="M26 16h50a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H26z" />
      <path className="thin" d="M30 24h18" />
      <rect className="b" x="60" y="48" width="12" height="10" />
      <path className="b" d="M60.5 58h11l-2 8h-7z" />
      <path className="hot" d="M66 66v12" />
      <path className="hot thin" d="M64.5 69l3 1.5M64.5 73l3 1.5" />
      <path d="M84 33l13-9M84 33l15 3M84 33l5 14" />
      {dot(97, 24, 2.8)}
      {dot(99, 36, 2.8)}
      {dot(89, 47, 2.8)}
      <rect className="b" x="30" y="81" width="14" height="10" rx="2" />
      <rect className="b" x="44" y="84" width="46" height="5" rx="1.5" />
      <rect className="thin" x="52" y="79" width="28" height="5" />
      <rect className="b" x="20" y="102" width="66" height="8" rx="2" />
    </>
  ),

  bandsaw: (
    <>
      <path className="b" d="M28 10h36a18 18 0 0 1 18 18v14H28z" />
      <circle className="thin dash" cx="55" cy="27" r="11" />
      <rect className="b" x="28" y="42" width="14" height="30" />
      <path className="b" d="M28 72h54v26a6 6 0 0 1-6 6H28z" />
      <circle className="thin dash" cx="55" cy="89" r="11" />
      <path d="M71 42v12" />
      <rect className="b" x="66" y="54" width="10" height="5" rx="1" />
      <path className="hot" d="M71 59v8" />
      <rect className="s" x="50" y="66" width="48" height="5" rx="1.5" />
      <path d="M71 71v1" />
      <path d="M34 104l-6 10M76 104l6 10" />
    </>
  ),

  drill: (
    <>
      <path className="b" d="M24 30h46a10 10 0 0 1 10 10v4a10 10 0 0 1-10 10H54l-5 24H35l4-24H24a8 8 0 0 1-8-8v-8a8 8 0 0 1 8-8z" />
      <path className="thin" d="M28 37v10M33 37v10M38 37v10" />
      <path d="M53 57c3 1 4.5 4 3.5 7.5" />
      <rect className="b" x="26" y="78" width="34" height="14" rx="3" />
      <path className="thin" d="M30 84h8" />
      <rect className="b" x="80" y="33" width="6" height="18" rx="1.5" />
      <path className="b" d="M86 35h8l4 4v6l-4 4h-8z" />
      <path className="hot" d="M98 42h15" />
      <path className="hot thin" d="M101 40l2 4M105 40l2 4M109 40l2 4" />
    </>
  ),

  'impact-driver': (
    <>
      <path className="b" d="M26 32h38a9 9 0 0 1 9 9v2a9 9 0 0 1-9 9H52l-5 26H33l4-26H26a8 8 0 0 1-8-8v-4a8 8 0 0 1 8-8z" />
      <path className="thin" d="M30 38v8M35 38v8" />
      <path d="M51 55c3 1 4.5 4 3.5 7.5" />
      <rect className="b" x="24" y="78" width="34" height="14" rx="3" />
      <path className="thin" d="M28 84h8" />
      <path className="b" d="M73 35h11l3.5 7-3.5 7H73z" />
      <path className="hot" d="M87.5 42h12" />
      <path className="hot" d="M99.5 39.5l3 2.5-3 2.5" />
    </>
  ),

  jigsaw: (
    <>
      <path className="b" fillRule="evenodd" d="M38 44V32a12 12 0 0 1 12-12h20a12 12 0 0 1 12 12v12zM48 44v-9a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v9z" />
      <path className="b" d="M26 76V60a18 18 0 0 1 18-18h32a14 14 0 0 1 14 14v20z" />
      <path className="thin" d="M34 62h10M34 67h10" />
      <path className="thin" d="M26 68c-8 0-12 6-12 13v27" />
      <rect className="b" x="16" y="76" width="80" height="6" rx="1.5" />
      <path className="hot" d="M84 82v24" />
      <path className="hot thin" d="M84 86l3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2" />
    </>
  ),

  'miter-saw': (
    <>
      <rect className="b" x="12" y="98" width="96" height="8" rx="2" />
      <path className="b" d="M30 98v-4h62v4" />
      <rect className="b" x="14" y="60" width="10" height="38" rx="2" />
      <rect className="b" x="24" y="80" width="5" height="14" />
      <path className="b" d="M17 61l35-19 4 8-35 19z" />
      <circle className="hotb" cx="66" cy="68" r="24" />
      {dot(66, 68, 3)}
      <path className="b" d="M38 68a28 28 0 0 1 56 0h-8a20 20 0 0 0-40 0z" />
      <rect className="b" x="54" y="28" width="26" height="14" rx="4" />
      <path d="M80 36l13-11" strokeWidth="5" />
    </>
  ),

  'belt-sander': (
    <>
      <rect className="b" x="12" y="88" width="94" height="16" rx="3" />
      <rect className="hotb" x="20" y="24" width="24" height="64" rx="12" />
      <rect className="b" x="26" y="33" width="12" height="46" rx="6" />
      <circle className="thin dash" cx="32" cy="36" r="6" />
      <circle className="thin dash" cx="32" cy="76" r="6" />
      <path d="M44 70h12v3" />
      <circle className="hotb" cx="80" cy="62" r="20" />
      {dot(80, 62)}
      <rect className="b" x="58" y="84" width="44" height="4" rx="1" />
      <path className="thin" d="M20 96h10" />
    </>
  ),

  'palm-sander': (
    <>
      <path className="b" d="M22 74h-8v10h8" />
      <rect className="b" x="78" y="64" width="26" height="16" rx="3" />
      <path className="thin" d="M84 70h10" />
      <path className="b" d="M22 86c0-22 13-38 30-38s30 16 30 38z" />
      <path className="b" d="M36 56c0-10 7-16 16-16s16 6 16 16" />
      <path className="thin" d="M34 74h36" />
      <path className="hotb" d="M16 86h72a4 4 0 0 1 0 8H16a4 4 0 0 1 0-8z" />
      <path className="hot thin dash" d="M38 101a14 4 0 0 0 28 0" />
    </>
  ),

  'reciprocating-saw': (
    <>
      <path className="b" d="M28 42h48a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H46l-6 18H26l5-18h-3a10 10 0 0 1-10-10v-6a10 10 0 0 1 10-10z" />
      <path className="thin" d="M50 50h22M50 56h22" />
      <path d="M44 70c3 1 4 4 3 7" />
      <rect className="b" x="22" y="86" width="24" height="12" rx="3" />
      <rect className="b" x="82" y="45" width="5" height="22" rx="1" />
      <path className="hotb" d="M87 52h26l-3 6H87z" />
      <path className="hot thin" d="M90 58l2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3" />
    </>
  ),

  mill: (
    <>
      <rect className="b" x="60" y="4" width="14" height="10" rx="2" />
      <rect className="b" x="24" y="14" width="52" height="9" rx="2" />
      <rect className="b" x="20" y="23" width="18" height="81" />
      <rect className="b" x="56" y="23" width="22" height="26" rx="3" />
      <path d="M78 34l12-6M78 34l12 4" />
      {dot(90, 28)}
      {dot(90, 38)}
      <rect className="b" x="62" y="49" width="10" height="9" />
      <path className="hot" d="M67 58v11" />
      <path className="hot thin" d="M65 61l4 2M65 65l4 2" />
      <rect className="b" x="54" y="70" width="26" height="6" rx="1" />
      <rect className="b" x="38" y="76" width="64" height="6" rx="1.5" />
      <circle cx="108" cy="79" r="4.5" />
      <rect className="b" x="38" y="82" width="30" height="8" />
      <rect className="b" x="38" y="90" width="22" height="14" />
      <rect className="b" x="14" y="104" width="64" height="8" rx="2" />
    </>
  ),

  'table-saw': (
    <>
      <path className="hotb" d="M40 58a20 20 0 0 1 40 0z" />
      <path className="thin dash" d="M34 46V36a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v10" />
      <path d="M86 39h4v19" />
      <rect className="b" x="8" y="58" width="104" height="7" rx="1.5" />
      <path className="b" d="M26 65h68l-4 28H30z" />
      <rect className="thin dash" x="62" y="67" width="12" height="10" rx="1" />
      <path d="M30 93l-8 18M90 93l8 18M25 104h70" />
    </>
  ),

  'track-saw': (
    <>
      <path className="b" d="M44 50V38a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v6" />
      <rect className="b" x="84" y="54" width="22" height="13" rx="3" />
      <path className="b" d="M30 82V64a14 14 0 0 1 14-14h28a14 14 0 0 1 14 14v18z" />
      <path className="thin" d="M40 66h20" />
      <rect className="thin" x="4" y="88" width="112" height="12" />
      <path className="hot" d="M44 88a16 14 0 0 0 32 0" />
      <path className="b" d="M4 82h112v6H4z" />
      <path className="thin" d="M4 85h112" />
    </>
  ),

  grinder: (
    <>
      <path className="b" d="M50 76l-6 26h32l-6-26z" />
      <rect className="b" x="36" y="102" width="48" height="6" rx="2" />
      <circle className="hotb" cx="24" cy="62" r="15" />
      <circle className="hotb" cx="96" cy="62" r="15" />
      <path className="b" d="M4 66a20 20 0 0 1 40 0h-4a16 16 0 0 0-32 0z" />
      <path className="b" d="M76 66a20 20 0 0 1 40 0h-4a16 16 0 0 0-32 0z" />
      <rect className="b" x="42" y="47" width="36" height="30" rx="8" />
      <path className="thin" d="M52 54v16M60 54v16M68 54v16" />
      <path d="M8 81h14M98 81h14" />
    </>
  ),

  'angle-grinder': (
    <>
      <rect className="b" x="4" y="48" width="14" height="16" rx="3" />
      <rect className="b" x="16" y="46" width="62" height="20" rx="10" />
      <path className="thin" d="M24 52v8M29 52v8M34 52v8" />
      <rect className="thin" x="44" y="42" width="18" height="4" rx="2" />
      <rect className="b" x="80" y="22" width="8" height="22" rx="4" />
      <path className="b" d="M74 44h16a4 4 0 0 1 4 4v16H74z" />
      <path d="M86 64v5" />
      <rect className="hotb" x="64" y="69" width="44" height="5" rx="2.5" />
      <path className="b" d="M60 68c2-5 12-8 26-8v8z" />
      <path className="hot thin" d="M108 76l8 4M106 80l6 8M101 80l2 10" />
    </>
  ),

  'laser-cutter': (
    <>
      <rect className="b" x="12" y="40" width="8" height="38" />
      <rect className="b" x="100" y="40" width="8" height="38" />
      <rect className="b" x="10" y="32" width="100" height="10" rx="2" />
      <path className="b" d="M52 42h16v14l-4 6h-8l-4-6z" />
      <path className="hot" d="M60 62v13" />
      <rect className="b" x="8" y="78" width="104" height="12" rx="2" />
      <rect className="thin" x="28" y="74" width="64" height="4" />
      <circle className="hotf" cx="60" cy="76" r="3" />
      <path className="hot thin" d="M64 72l6-4M56 72l-6-4M66 75h6" />
      <path d="M16 90v18M104 90v18M16 104h88" />
    </>
  ),
};

const placeholder = (
  <>
    <rect className="b" x="30" y="30" width="60" height="60" rx="8" />
    <path className="thin dash" d="M30 30l60 60M90 30l-60 60" />
  </>
);

export function ToolArt({ slug, className = '', title }: { slug: string; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`art ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {drawings[slug] ?? placeholder}
    </svg>
  );
}
