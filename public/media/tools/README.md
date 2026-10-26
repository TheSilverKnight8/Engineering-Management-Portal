Put tool graphics here, one folder per tool slug, for example:

    public/media/tools/drill-press/chuck-key.webp

Then list them in that tool's `graphics` in src/content/tools.ts:

    graphics: [{ src: 'media/tools/drill-press/chuck-key.webp', caption: 'Remove the chuck key' }],

Use WebP or JPEG, about 1600 px wide at most. These files are served with the
app, so they do not use any Supabase storage.
