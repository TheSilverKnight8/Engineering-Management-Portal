# Database migrations

Supabase's GitHub integration runs the files in `migrations/` against the
production database on every push to `main`. It runs each file once, in
order, and records it, so:

- To change the database, add a new file. Name it with a higher number than
  the last one, for example `0003_short_description.sql`.
- Do not edit a file that has already run. The change would never be applied.
- Do not paste these files into the SQL Editor; the integration runs them.

Deploy status and logs are in the Supabase dashboard under the project's
branches (the production branch), and on each commit in GitHub as a check.
