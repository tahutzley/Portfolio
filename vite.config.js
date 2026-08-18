import { defineConfig } from 'vite';

export default defineConfig({
  /* Relative base — required for self-hosting from a subdirectory.
     With the default '/' every asset URL would be absolute and break
     the moment the site isn't served from a domain root. */
  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    /* Inline anything under 4 KB (the seal glyphs, small icons) rather
       than emitting a separate request for it. */
    assetsInlineLimit: 4096,
    sourcemap: false
  },

  server: {
    open: true,
    port: 5173
  }
});
