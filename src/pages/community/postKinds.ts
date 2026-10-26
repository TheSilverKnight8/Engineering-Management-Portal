import { FileText, Hammer, Trophy, type LucideIcon } from 'lucide-react';
import type { PostKind } from '../../lib/types';

export const POST_KIND_META: Record<PostKind, { label: string; plural: string; icon: LucideIcon; tone: string; hint: string }> = {
  paper: { label: 'Paper', plural: 'Papers', icon: FileText, tone: 'bg-navy/12 text-navy', hint: 'An Engineering paper or article worth reading' },
  competition: { label: 'Competition', plural: 'Competitions', icon: Trophy, tone: 'bg-warn/15 text-warn', hint: 'A contest, challenge, or opportunity to enter' },
  build: { label: 'Build', plural: 'Builds', icon: Hammer, tone: 'bg-ink text-bg', hint: 'Something cool that someone made' },
};
