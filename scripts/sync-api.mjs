// Mirrors ../backend/api/*.yaml into mobile/api/. Master lives in backend/api/;
// never edit mobile/api/ by hand. Cross-platform (no shell cp).
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '..', 'backend', 'api');
const target = join(root, 'api');

if (!existsSync(source)) {
  console.error(`Missing ${source}`);
  process.exit(1);
}

const yaml = (dir) => readdirSync(dir).filter((name) => name.endsWith('.yaml'));

mkdirSync(target, { recursive: true });

const files = yaml(source);
for (const name of files) copyFileSync(join(source, name), join(target, name));

// Mirror deletions so the copy never keeps a file the master dropped.
for (const name of yaml(target)) {
  if (!files.includes(name)) rmSync(join(target, name));
}

console.log(`Synced ${files.length} files: ${files.join(', ')}`);
