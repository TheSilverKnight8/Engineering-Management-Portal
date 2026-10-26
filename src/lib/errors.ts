// Turns Supabase and Postgres errors into sentences people can act on.

interface PgLikeError {
  code?: string;
  message?: string;
}

export function friendlyError(err: unknown): string {
  const e = (err ?? {}) as PgLikeError;
  switch (e.code) {
    case '23P01':
      return 'This tool is already checked out for part of that time. Pick a different window.';
    case '23514':
      if (e.message?.includes('checkouts_window_valid')) return 'The end time must be after the start time.';
      if (e.message?.includes('link_url')) return 'Links must start with http:// or https://.';
      return 'One of the fields is not valid. Check the lengths and try again.';
    case '42501':
      return e.message && !e.message.startsWith('permission denied') ? e.message : 'You do not have permission to do that.';
    case 'P0001':
    case 'P0002':
    case '28000':
      return e.message ?? 'That did not work.';
    case 'PGRST301':
      return 'Your session expired. Sign in again.';
  }
  if (e.message?.includes('Failed to fetch')) return 'No connection. Check your internet and try again.';
  return e.message || 'Something went wrong. Try again.';
}
