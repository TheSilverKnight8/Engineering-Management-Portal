# Notes for Claude Code

The product spec is the owner's; follow it and ask before widening scope.

- This app is for one school's Engineering class only. Keep it specific to this shop.
- Must run on free tiers (Supabase Free, GitHub Pages). If a change would need paid usage, say so instead of doing it.
- Curated content (tools, safety, STE, projects, materials) lives in `src/content/` and only the owner changes it. Tool text is ASD-STE100 Simplified Technical English; keep new or edited text in STE and do not rewrite existing entries.
- Heavy media never goes in Supabase. Videos are YouTube IDs; graphics go in `public/media/`. Post photos are compressed in the browser (`src/lib/image.ts`) before going to the `post-images` bucket.
- Database changes go in a new file in `supabase/migrations/` (do not edit applied migrations). Every table needs RLS and explicit grants to `authenticated` (new Supabase projects do not expose tables by default). Permission rules are enforced in SQL, not only in the UI.
- Students and teachers have the same permissions except moderation. Moderators = teachers, mod students, developer. Only the developer (`is_dev`) sets roles and mods.
- `npm run typecheck` and `npm run build` must pass.
