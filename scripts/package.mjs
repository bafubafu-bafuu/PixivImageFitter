import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root = resolve('dist');
const allowed = /^(?:manifest\.json|popup\.html|mdi_resize\.png|(?:content|popup)\.js|assets\/[\w.-]+\.(?:js|css)|licenses\/[\w.-]+\.txt|(?:LICENSE|PRIVACY|THIRD-PARTY-NOTICES)\.txt)$/;
async function list(path) {
  const files = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    const full = join(path, item.name);
    if (item.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${relative(root, full)}`);
    if (item.isDirectory()) files.push(...await list(full));
    else files.push(relative(root, full).split('\\').join('/'));
  }
  return files;
}
const files = (await list(root)).sort();
for (const file of files) if (!allowed.test(file)) throw new Error(`Unexpected distribution file: ${file}`);
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (manifest.version !== pkg.version || manifest.manifest_version !== 3) throw new Error('Manifest version mismatch');
const required = [
  'manifest.json', 'content.js', 'popup.html', 'mdi_resize.png',
  'LICENSE.txt', 'PRIVACY.txt', 'THIRD-PARTY-NOTICES.txt',
  'licenses/MaterialDesignIcons.txt', 'licenses/Apache-2.0.txt',
  ...Object.values(manifest.icons),
];
for (const file of required) if (!files.includes(file)) throw new Error(`Missing distribution file: ${file}`);
const permissions = ['storage'];
if (manifest.permissions.length !== permissions.length || manifest.permissions.some((item) => !permissions.includes(item))) {
  throw new Error('Unexpected extension permissions');
}
const contentScripts = manifest.content_scripts;
if (contentScripts.length !== 1 ||
    JSON.stringify(contentScripts[0].matches) !== '["https://www.pixiv.net/*"]' ||
    JSON.stringify(contentScripts[0].js) !== '["content.js"]') {
  throw new Error('Unexpected content scripts');
}
for (const file of files.filter((name) => /\.(js|css|html)$/.test(name))) {
  const text = await readFile(join(root, file), 'utf8');
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(text)) throw new Error(`Dynamic code execution in ${file}`);
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/.test(text)) throw new Error(`Network API in ${file}`);
  if (file.endsWith('.html')) {
    for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const asset = match[1].replace(/^\//, '');
      if (!files.includes(asset)) throw new Error(`Non-local or missing HTML resource: ${asset}`);
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(text) || /\bon\w+=/i.test(text)) throw new Error(`Inline executable HTML in ${file}`);
  }
  if (file.endsWith('.css') && /@import|url\(["']?https?:/i.test(text)) throw new Error(`Remote CSS resource in ${file}`);
}
console.log(`Distribution validated: ${files.length} allowlisted files, local assets and licenses present.`);
if (!process.argv.includes('--check')) {
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  // Minimal deterministic ZIP writer so that packaging works on any platform without extra tools.
  function createZip(entries) {
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const { name, data } of entries) {
      const nameBytes = Buffer.from(name, 'utf8');
      const deflated = deflateRawSync(data);
      const useDeflate = deflated.length < data.length;
      const payload = useDeflate ? deflated : data;
      const method = useDeflate ? 8 : 0;
      const crc = crc32(data);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(0, 10);
      local.writeUInt16LE(0x21, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(payload.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBytes.length, 26);
      local.writeUInt16LE(0, 28);
      chunks.push(local, nameBytes, payload);
      const entry = Buffer.alloc(46);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(20, 4);
      entry.writeUInt16LE(20, 6);
      entry.writeUInt16LE(0x0800, 8);
      entry.writeUInt16LE(method, 10);
      entry.writeUInt16LE(0, 12);
      entry.writeUInt16LE(0x21, 14);
      entry.writeUInt32LE(crc, 16);
      entry.writeUInt32LE(payload.length, 20);
      entry.writeUInt32LE(data.length, 24);
      entry.writeUInt16LE(nameBytes.length, 28);
      entry.writeUInt16LE(0, 30);
      entry.writeUInt16LE(0, 32);
      entry.writeUInt16LE(0, 34);
      entry.writeUInt16LE(0, 36);
      entry.writeUInt32LE(0, 38);
      entry.writeUInt32LE(offset, 42);
      central.push(entry, nameBytes);
      offset += local.length + nameBytes.length + payload.length;
    }
    const centralBuffer = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralBuffer.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...chunks, centralBuffer, end]);
  }
  const entries = [];
  for (const name of files) entries.push({ name, data: await readFile(join(root, name)) });
  await mkdir('artifacts', { recursive: true });
  const target = resolve(`artifacts/pixiv-image-fitter-${manifest.version}.zip`);
  await rm(target, { force: true });
  await writeFile(target, createZip(entries));
  console.log(`Created ${target}`);
}
