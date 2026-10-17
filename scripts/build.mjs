import { build } from 'vite';
import { writeFile, readFile } from 'node:fs/promises';

await build({
  build: {
    outDir: 'dist', emptyOutDir: true, modulePreload: false,
    rollupOptions: {
      input: {
        popup: 'popup.html',
      },
      output: { entryFileNames: '[name].js', chunkFileNames: 'assets/[name]-[hash].js' },
    },
  },
});
await build({
  publicDir: false,
  build: {
    outDir: 'dist', emptyOutDir: false,
    lib: { entry: 'src/content/index.ts', name: 'PixivImageFitterContent', formats: ['iife'], fileName: () => 'content.js' },
  },
});
// 配布物にもライセンス文書を同梱する（public/ の manifest.json・アイコン・licenses/ は Vite がコピーする）。
for (const [source, target] of [
  ['LICENSE', 'LICENSE.txt'], ['PRIVACY.md', 'PRIVACY.txt'], ['THIRD-PARTY-NOTICES.md', 'THIRD-PARTY-NOTICES.txt'],
]) {
  await writeFile(`dist/${target}`, await readFile(source));
}
