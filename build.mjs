import { build, context } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });
copyFileSync('src/ui.html', 'dist/ui.html');

const opts = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es2017',
  format: 'iife',
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log('Watching src/code.ts …');
} else {
  await build(opts);
  console.log('Built dist/code.js + dist/ui.html');
}
