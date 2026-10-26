import { ButtonLink, EmptyState } from '../components/ui';
import { ToolArt } from '../graphics/ToolArt';

export default function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <EmptyState art={<ToolArt slug="" className="size-24 text-ink" />} title={`This ${what} does not exist`} className="py-24" action={<ButtonLink to="/">Go home</ButtonLink>}>
      The link may be old, or the {what} was removed.
    </EmptyState>
  );
}
