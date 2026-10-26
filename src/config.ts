// App-wide settings. Only the owner edits this file.

export const APP_NAME = 'Engineering Portal';
export const APP_SHORT_NAME = 'Eng Portal';
// Taken from the first Shop Manual. Change it here if it is wrong.
export const SCHOOL_NAME = 'Kalani High School';
export const CLASS_NAME = 'Engineering';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
