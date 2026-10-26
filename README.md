# Engineering-Management-Portal
A portal for engineering students to coordinate and access information about the workshop.

An installable web app (PWA) for one school's Engineering class: find the right tool, learn to operate it, practice, prepare for the safety checkpoint, track the shop's tools and who has them, organize project groups, and share Engineering work.

It runs on free tiers: Supabase (database, sign-in, image storage) and GitHub Pages (hosting). Videos are embedded from YouTube.

## What is in it

| Area | What it does | Where the data lives |
| --- | --- | --- |
| Tool picker | Optional questions (material, job, precision, size). Results update as you answer, say why each tool fits or does not, and show how many units are free in the shop. Answers are in the URL, so results can be shared. | Repo (`src/content`) |
| Tool library and entries | Every tool with illustration, PPE, at-a-glance specs, designed / not designed for, safety rules, operation steps, a one-step-at-a-time view for phones, video slots, and graphics. Text is the ASD-STE100 content from the first Shop Manual, unchanged. | Repo |
| Learn | Safety (checkpoint link, PPE table by tool, study guide sections, rules by tool), safety practice questions, practice projects, materials, Simplified Technical English. | Repo |
| Shop inventory | Every tool unit, status (operational / needs maintenance), checkouts for a time window. Overlapping checkouts are refused by the database. Anyone can edit; every change goes in a changelog nobody can edit. | Supabase |
| Project groups | Groups with a text channel each. New messages arrive live. | Supabase |
| Posts | Papers, competition opportunities, and builds, with up to 4 photos. | Supabase |
| Moderation | Anyone can report a post or message. Teachers and mod students review reports and remove or restore content. | Supabase |
| Developer page | Owner only: set teacher role and mod students, remove members, change the join code. | Supabase |

Without Supabase settings the app runs in **content preview**: the picker, library, and Learn pages work, and the Supabase parts explain that they need setup.

## Run it on your computer

Needs Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) on the **Free** plan.
2. Open **SQL Editor**, paste all of [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql), and run it. Then do the same with [`0002_storage.sql`](supabase/migrations/0002_storage.sql).
   The schema grants table access explicitly, so it works whether or not "Automatically expose new tables" is turned on.
3. In the **Authentication** settings, open the **Email** provider and keep it on.
   - **Confirm email**: Supabase's built-in email sender only sends a few emails per hour (the dashboard's auth rate-limit settings show your project's number). With confirmation on, a whole class signing up at once would hit that limit. Two choices:
     - Turn **Confirm email** off. The class join code still keeps outsiders out.
     - Or keep it on and set up a free custom SMTP sender in the dashboard's **SMTP Settings** (Brevo and Resend have free tiers).
   - Password-reset emails use the same sender and limit.
   - Supabase moves these menus around now and then; search the dashboard for "Confirm email" or "SMTP" if they are not where this says.
4. **Authentication > URL Configuration**: set **Site URL** to the app's public address (for GitHub Pages: `https://<your-username>.github.io/<repo-name>/`). Under **Redirect URLs**, add `https://<your-username>.github.io/<repo-name>/**` and `http://localhost:5173/**`. Email links (confirm, reset) only go to these addresses.
5. **Project Settings > API Keys**: copy the **Project URL** and the **Publishable key** (`sb_publishable_…`). Copy `.env.example` to `.env.local` and paste them in. The publishable key is meant to be public; Row Level Security in the schema is what protects the data. Never put the secret key in the app.
6. Restart `npm run dev`.

## First accounts

The plan is that only the owner and the teacher make accounts first.

1. Find the join code. In the SQL Editor: `select join_code from public.class_settings;`
2. Create your account in the app, then enter the join code and your full name.
3. Make yourself the developer (SQL Editor, use your email):
   ```sql
   update public.profiles set is_dev = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
4. Have the teacher create an account and join with the code. On the **Developer** page, set their role to **Teacher**.
5. When the class joins later, the teacher hands out the code (it shows on their Profile page). Either of you can make a new code if it gets out.

Mod students are set on the Developer page with the **Mod** checkbox.

## Put it online (GitHub Pages)

1. Push this project to your GitHub repository. GitHub Pages is free for **public** repositories; a private repository needs a paid GitHub plan for Pages (or use one of the other hosts below).
2. **Settings > Pages > Build and deployment > Source**: choose **GitHub Actions**.
3. **Settings > Secrets and variables > Actions > Variables**: add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with the same values as `.env.local`.
4. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the app to `https://<your-username>.github.io/<repo-name>/`.

Other free hosts work too (Cloudflare Pages, Netlify): build command `npm run build`, output folder `dist`, add the two variables with a `VITE_` prefix (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), and turn on single-page-app fallback to `index.html`.

### Install it like an app

- **iPhone / iPad (Safari)**: Share > Add to Home Screen.
- **Android (Chrome)** and **computers (Chrome / Edge)**: the browser offers Install, or use the Install button on the Profile page.

## Keeping Supabase awake over breaks

The Free plan pauses a project after 7 days without database activity. [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) calls a small database function once a day so the project stays awake, using the same two repository variables.

Two things to know:

- GitHub turns off scheduled workflows in public repositories after 60 days with no commits. Summer break is close to that, so the workflow also commits a one-line date file (`.github/keepalive.txt`) if the last commit is more than 45 days old. During the school year it never commits.
- If the project does pause anyway, Supabase keeps it for 90 days; restore it from the Supabase dashboard. Check the **Actions** tab after a long break to make sure the workflow is still on.

## Editing the content

Only the owner edits these files (they are in the repo, so changes need a commit).

| To change | Edit |
| --- | --- |
| Tool entries | `src/content/tools.ts`. Keep the text in ASD-STE100. |
| Demo videos | In `tools.ts`, put the YouTube video ID in `youtubeId`. Add more `{ title, youtubeId }` items for more videos. |
| Graphics | Put images in `public/media/tools/<slug>/` and list them in the tool's `graphics`. See `public/media/tools/README.md`. |
| Tool illustrations | `src/graphics/ToolArt.tsx` (SVG line drawings; the cutting or spinning part is drawn in orange). |
| Safety study guide | `src/content/safety.ts`. Each section has an empty `items` list ready for the study guide content. |
| Practice projects | `src/content/projects.ts`. Set `status: 'ready'` when a project is written. |
| Materials notes, picker hints | `src/content/catalog.ts` |
| STE page | `src/content/ste.ts` |
| App name, school name | `src/config.ts` |

## Staying inside the Free plan

Published Free plan limits (check [supabase.com/pricing](https://supabase.com/pricing) for current numbers): 500 MB database, 1 GB file storage, 5 GB bandwidth per month, 50,000 monthly active users, about 200 simultaneous Realtime connections, 2 active projects, pause after 7 days of inactivity.

How the app stays well under them:

- Curated content (tools, safety, projects, illustrations, graphics) is in the repo and served by the host, not Supabase.
- Videos are YouTube embeds that load only when someone taps play.
- Post photos are shrunk in the browser to at most 1600 px (WebP, usually 150–300 KB). The storage bucket refuses files over 1 MB, and a post has at most 4 photos.
- Database rows are small text. A class of this size will use a tiny part of 500 MB.

Nothing in the app needs a paid plan.

## Who can do what

| | Student | Mod student | Teacher | Owner (developer) |
| --- | :-: | :-: | :-: | :-: |
| Use the picker, library, Learn | ✓ | ✓ | ✓ | ✓ |
| Edit the inventory, check out tools | ✓ | ✓ | ✓ | ✓ |
| Post, make and join groups, message | ✓ | ✓ | ✓ | ✓ |
| Review reports, remove and restore posts and messages | | ✓ | ✓ | ✓ |
| See and change the join code | | | ✓ | ✓ |
| Set roles and mods, remove members | | | | ✓ |
| Change the app and its content | | | | ✓ (through the repo) |

These rules are enforced in the database (Row Level Security and checked functions), not only in the app.

## Not built yet

- Taking the safety test in the app and recording results. The safety section links to the current checkpoint and has practice questions; the test itself stays on the Google site for now.
- Study guide content: waiting for the "Shop Floor Safety Study Guide" PDF to be added to the repo.

## Project layout

```
src/
  content/      curated content (tools, catalog, safety, STE, projects)
  graphics/     SVG tool illustrations and icons
  lib/          Supabase client, sign-in, data loading, picker rules, helpers
  components/   app shell, buttons, sheets, shared pieces
  pages/        one file per screen
supabase/migrations/   database schema, security rules, storage bucket
.github/workflows/     deploy to GitHub Pages, daily keep-alive
```

Built with React, TypeScript, Vite, Tailwind CSS, TanStack Query, and vite-plugin-pwa.
